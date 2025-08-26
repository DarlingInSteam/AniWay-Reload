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
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
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

    // Метод для переноса изображения из MelonService в MinIO
    public ChapterImageResponseDTO uploadImageFromUrl(Long chapterId, Integer pageNumber, String imageUrl) {
        try {
            // Проверяем, существует ли уже изображение для этой главы и страницы
            Optional<ChapterImage> existingImage = imageRepository.findByChapterIdAndPageNumber(chapterId, pageNumber);
            if (existingImage.isPresent()) {
                // Если изображение уже существует, возвращаем его
                return new ChapterImageResponseDTO(existingImage.get());
            }

            // Создаем bucket если он не существует
            createBucketIfNotExists();

            // Скачиваем изображение по URL из MelonService
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(10000); // 10 секунд
            connection.setReadTimeout(30000); // 30 секунд

            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                throw new RuntimeException("Failed to download image from MelonService: " + imageUrl +
                        ", response code: " + connection.getResponseCode());
            }

            // Читаем содержимое изображения
            InputStream inputStream = connection.getInputStream();
            byte[] imageBytes = inputStream.readAllBytes();
            inputStream.close();

            // Определяем тип изображения
            String contentType = connection.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                contentType = "image/jpeg"; // По умолчанию
            }

            // Получаем размеры изображения
            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            int width = bufferedImage != null ? bufferedImage.getWidth() : 0;
            int height = bufferedImage != null ? bufferedImage.getHeight() : 0;

            // Генерируем уникальное имя файла для MinIO
            String imageKey = generateObjectKey(chapterId, pageNumber, "page_" + pageNumber + ".jpg");

            // Загружаем изображение в MinIO
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(imageKey)
                            .stream(new ByteArrayInputStream(imageBytes), imageBytes.length, -1)
                            .contentType(contentType)
                            .build()
            );

            // Формируем URL для доступа к изображению в MinIO
            String minioImageUrl = generateImageUrl(imageKey);

            // Сохраняем информацию о изображении в базе данных
            ChapterImage chapterImage = new ChapterImage();
            chapterImage.setChapterId(chapterId);
            chapterImage.setPageNumber(pageNumber);
            chapterImage.setImageUrl(minioImageUrl);
            chapterImage.setImageKey(imageKey);
            chapterImage.setFileSize((long) imageBytes.length);
            chapterImage.setMimeType(contentType);
            chapterImage.setWidth(width);
            chapterImage.setHeight(height);
            chapterImage.setCreatedAt(LocalDateTime.now());

            ChapterImage savedImage = imageRepository.save(chapterImage);

            return new ChapterImageResponseDTO(savedImage);

        } catch (IOException e) {
            throw new RuntimeException("Failed to download or process image from MelonService: " + imageUrl, e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to transfer image from MelonService to MinIO: " + imageUrl, e);
        }
    }

    private String generateImageKey(Long chapterId, Integer pageNumber) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        return String.format("chapters/%d/pages/%d_%s_%s.jpg",
                chapterId, pageNumber, timestamp, UUID.randomUUID().toString().substring(0, 8));
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

        // Логируем исходный порядок файлов
        System.out.println("=== DEBUG: Original file order ===");
        for (int i = 0; i < files.size(); i++) {
            System.out.println("File " + i + ": " + files.get(i).getOriginalFilename());
        }

        // Сортируем файлы по имени для обеспечения предсказуемого порядка
        List<MultipartFile> sortedFiles = new ArrayList<>(files);
        sortedFiles.sort((f1, f2) -> {
            String name1 = f1.getOriginalFilename();
            String name2 = f2.getOriginalFilename();
            if (name1 == null) name1 = "";
            if (name2 == null) name2 = "";
            return name1.compareToIgnoreCase(name2);
        });

        // Логируем отсортированный порядок файлов
        System.out.println("=== DEBUG: Sorted file order ===");
        for (int i = 0; i < sortedFiles.size(); i++) {
            System.out.println("Sorted File " + i + ": " + sortedFiles.get(i).getOriginalFilename() + " → will be page " + (startPage + i));
        }

        List<ChapterImageResponseDTO> uploadedImages = new java.util.ArrayList<>();

        for (int i = 0; i < sortedFiles.size(); i++) {
            MultipartFile file = sortedFiles.get(i);
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

            System.out.println("Uploaded: " + file.getOriginalFilename() + " → page " + pageNumber);
        }

        return uploadedImages;
    }

    public void deleteImage(Long imageId) throws ServerException, InsufficientDataException, ErrorResponseException,
            IOException, NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException,
            XmlParserException, InternalException {

        Optional<ChapterImage> imageOpt = imageRepository.findById(imageId);
        if (imageOpt.isPresent()) {
            ChapterImage image = imageOpt.get();

            // Уд��ляем из MinIO
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

    public ChapterImageResponseDTO importFromLocalFile(Long chapterId, Integer pageNumber, String localImagePath)
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

        // Проверяем существование локального файла
        java.io.File localFile = new java.io.File(localImagePath);
        if (!localFile.exists()) {
            throw new RuntimeException("Local image file not found: " + localImagePath);
        }

        // Генерируем уникальный ключ для объекта в MinIO
        String objectKey = generateObjectKey(chapterId, pageNumber, localFile.getName());

        // Загружаем файл из локального пути в MinIO
        try (java.io.FileInputStream fileInputStream = new java.io.FileInputStream(localFile)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectKey)
                            .stream(fileInputStream, localFile.length(), -1)
                            .contentType("image/jpeg") // Предполагаем, что все изображения JPG
                            .build()
            );
        }

        // Получаем размеры изображения
        BufferedImage bufferedImage = ImageIO.read(localFile);
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
        chapterImage.setFileSize(localFile.length());
        chapterImage.setMimeType("image/jpeg");
        chapterImage.setWidth(width);
        chapterImage.setHeight(height);

        ChapterImage savedImage = imageRepository.save(chapterImage);
        return new ChapterImageResponseDTO(savedImage);
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
