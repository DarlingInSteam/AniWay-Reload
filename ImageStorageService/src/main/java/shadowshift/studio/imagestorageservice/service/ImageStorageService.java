package shadowshift.studio.imagestorageservice.service;

import io.minio.*;
import io.minio.errors.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import shadowshift.studio.imagestorageservice.dto.ChapterImageResponseDTO;
import shadowshift.studio.imagestorageservice.entity.ChapterImage;
import shadowshift.studio.imagestorageservice.repository.ChapterImageRepository;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ImageStorageService {

    @Autowired
    private ChapterImageRepository imageRepository;

    @Autowired
    private MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    public List<ChapterImageResponseDTO> getImagesByChapterId(Long chapterId) {
        return imageRepository.findByChapterIdOrderByPageNumberAsc(chapterId)
                .stream()
                .map(ChapterImageResponseDTO::new)
                .collect(Collectors.toList());
    }

    public Optional<ChapterImageResponseDTO> getImageByChapterAndPage(Long chapterId, Integer pageNumber) {
        return imageRepository.findByChapterIdAndPageNumber(chapterId, pageNumber)
                .map(ChapterImageResponseDTO::new);
    }

    public Integer getPageCountByChapterId(Long chapterId) {
        return imageRepository.countByChapterId(chapterId);
    }

    public ChapterImageResponseDTO uploadImage(Long chapterId, Integer pageNumber, MultipartFile file)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        // Создаем bucket если он не существует
        createBucketIfNotExists();

        // Проверяем, что изображение с таким номером страницы еще не существует
        Optional<ChapterImage> existingImage = imageRepository
                .findByChapterIdAndPageNumber(chapterId, pageNumber);

        if (existingImage.isPresent()) {
            throw new RuntimeException("Image for page " + pageNumber +
                    " already exists for chapter " + chapterId);
        }

        // Генерируем уникальный ключ для объекта в MinIO
        String objectKey = generateObjectKey(chapterId, pageNumber, file.getOriginalFilename());

        // Загружаем файл в MinIO
        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectKey)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );

        // Получаем размеры изображения
        BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
        Integer width = null;
        Integer height = null;
        if (bufferedImage != null) {
            width = bufferedImage.getWidth();
            height = bufferedImage.getHeight();
        }

        // Создаем запись в базе данных
        ChapterImage chapterImage = new ChapterImage();
        chapterImage.setChapterId(chapterId);
        chapterImage.setPageNumber(pageNumber);
        chapterImage.setImageKey(objectKey);
        chapterImage.setImageUrl(generateImageUrl(objectKey));
        chapterImage.setFileSize(file.getSize());
        chapterImage.setMimeType(file.getContentType());
        chapterImage.setWidth(width);
        chapterImage.setHeight(height);

        ChapterImage savedImage = imageRepository.save(chapterImage);
        return new ChapterImageResponseDTO(savedImage);
    }

    public List<ChapterImageResponseDTO> uploadMultipleImages(Long chapterId, List<MultipartFile> files)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        createBucketIfNotExists();

        // Получаем следующий доступный номер страницы
        Integer nextPageNumber = getNextAvailablePageNumber(chapterId);

        List<ChapterImageResponseDTO> uploadedImages = new java.util.ArrayList<>();

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            Integer pageNumber = nextPageNumber + i;

            // Генерируем уникальный ключ для объекта в MinIO
            String objectKey = generateObjectKey(chapterId, pageNumber, file.getOriginalFilename());

            // Загружаем файл в MinIO
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            // Получаем размеры изображения
            BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
            Integer width = null;
            Integer height = null;
            if (bufferedImage != null) {
                width = bufferedImage.getWidth();
                height = bufferedImage.getHeight();
            }

            // Создаем запись в базе данных
            ChapterImage chapterImage = new ChapterImage();
            chapterImage.setChapterId(chapterId);
            chapterImage.setPageNumber(pageNumber);
            chapterImage.setImageKey(objectKey);
            chapterImage.setImageUrl(generateImageUrl(objectKey));
            chapterImage.setFileSize(file.getSize());
            chapterImage.setMimeType(file.getContentType());
            chapterImage.setWidth(width);
            chapterImage.setHeight(height);

            ChapterImage savedImage = imageRepository.save(chapterImage);
            uploadedImages.add(new ChapterImageResponseDTO(savedImage));
        }

        return uploadedImages;
    }

    public List<ChapterImageResponseDTO> uploadMultipleImagesWithOrder(Long chapterId, List<MultipartFile> files, Integer startPage)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        createBucketIfNotExists();

        List<ChapterImageResponseDTO> uploadedImages = new java.util.ArrayList<>();

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            Integer pageNumber = startPage + i;

            // Проверяем, что страница с таким номером не существует
            Optional<ChapterImage> existingImage = imageRepository
                    .findByChapterIdAndPageNumber(chapterId, pageNumber);

            if (existingImage.isPresent()) {
                throw new RuntimeException("Page " + pageNumber + " already exists for chapter " + chapterId);
            }

            // Генерируем уникальный ключ для объекта в MinIO
            String objectKey = generateObjectKey(chapterId, pageNumber, file.getOriginalFilename());

            // Загружаем файл в MinIO
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            // Получаем размеры изображения
            BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
            Integer width = null;
            Integer height = null;
            if (bufferedImage != null) {
                width = bufferedImage.getWidth();
                height = bufferedImage.getHeight();
            }

            // Создаем запись в базе данных
            ChapterImage chapterImage = new ChapterImage();
            chapterImage.setChapterId(chapterId);
            chapterImage.setPageNumber(pageNumber);
            chapterImage.setImageKey(objectKey);
            chapterImage.setImageUrl(generateImageUrl(objectKey));
            chapterImage.setFileSize(file.getSize());
            chapterImage.setMimeType(file.getContentType());
            chapterImage.setWidth(width);
            chapterImage.setHeight(height);

            ChapterImage savedImage = imageRepository.save(chapterImage);
            uploadedImages.add(new ChapterImageResponseDTO(savedImage));
        }

        return uploadedImages;
    }

    public void deleteImage(Long imageId) throws ServerException, InsufficientDataException, ErrorResponseException,
            IOException, NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException,
            XmlParserException, InternalException {

        Optional<ChapterImage> imageOpt = imageRepository.findById(imageId);
        if (imageOpt.isPresent()) {
            ChapterImage image = imageOpt.get();

            // Удаляем из MinIO
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(image.getImageKey())
                            .build()
            );

            // Удаляем из базы данных
            imageRepository.delete(image);
        }
    }

    public void deleteAllChapterImages(Long chapterId) throws ServerException, InsufficientDataException,
            ErrorResponseException, IOException, NoSuchAlgorithmException, InvalidKeyException,
            InvalidResponseException, XmlParserException, InternalException {

        List<ChapterImage> images = imageRepository.findByChapterIdOrderByPageNumberAsc(chapterId);

        // Удаляем все изображения из MinIO
        for (ChapterImage image : images) {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(image.getImageKey())
                            .build()
            );
        }

        // Удаляем все записи из базы данных
        imageRepository.deleteByChapterId(chapterId);
    }

    public byte[] getImageBytes(String imageKey) throws ServerException, InsufficientDataException,
            ErrorResponseException, IOException, NoSuchAlgorithmException, InvalidKeyException,
            InvalidResponseException, XmlParserException, InternalException {

        try {
            GetObjectResponse response = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(imageKey)
                            .build()
            );
            return response.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }

    public List<ChapterImageResponseDTO> reorderPages(Long chapterId, List<Long> imageIds) {
        List<ChapterImage> images = new ArrayList<>();

        // Получаем изображения в порядке переданных ID
        for (Long imageId : imageIds) {
            Optional<ChapterImage> imageOpt = imageRepository.findById(imageId);
            if (imageOpt.isPresent() && imageOpt.get().getChapterId().equals(chapterId)) {
                images.add(imageOpt.get());
            }
        }

        // Переназначаем номера страниц
        for (int i = 0; i < images.size(); i++) {
            ChapterImage image = images.get(i);
            image.setPageNumber(i + 1);
            imageRepository.save(image);
        }

        // Возвращаем обновленный список
        return images.stream()
                .map(ChapterImageResponseDTO::new)
                .collect(Collectors.toList());
    }

    private void createBucketIfNotExists() throws ServerException, InsufficientDataException,
            ErrorResponseException, IOException, NoSuchAlgorithmException, InvalidKeyException,
            InvalidResponseException, XmlParserException, InternalException {

        boolean exists = minioClient.bucketExists(
                BucketExistsArgs.builder().bucket(bucketName).build()
        );

        if (!exists) {
            minioClient.makeBucket(
                    MakeBucketArgs.builder().bucket(bucketName).build()
            );
        }
    }

    private String generateObjectKey(Long chapterId, Integer pageNumber, String originalFilename) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = getFileExtension(originalFilename);
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);

        return String.format("chapters/%d/pages/%03d_%s_%s%s",
                chapterId, pageNumber, timestamp, uniqueId, extension);
    }

    private String generateImageUrl(String objectKey) {
        return String.format("%s/%s/%s", minioEndpoint, bucketName, objectKey);
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    private Integer getNextAvailablePageNumber(Long chapterId) {
        return imageRepository.findMaxPageNumberByChapterId(chapterId)
                .map(maxPage -> maxPage + 1)
                .orElse(1);
    }
}
