package shadowshift.studio.imagestorageservice.service;

import io.minio.*;
import io.minio.errors.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import shadowshift.studio.imagestorageservice.config.YandexStorageProperties;
import shadowshift.studio.imagestorageservice.dto.ChapterImageResponseDTO;
import shadowshift.studio.imagestorageservice.dto.UserAvatarResponseDTO;
import shadowshift.studio.imagestorageservice.entity.ChapterImage;
import shadowshift.studio.imagestorageservice.entity.UserAvatar;
import shadowshift.studio.imagestorageservice.exception.AvatarUploadRateLimitException;
import shadowshift.studio.imagestorageservice.repository.ChapterImageRepository;
import shadowshift.studio.imagestorageservice.repository.UserAvatarRepository;

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

/**
 * Сервис для управления хранением и обработкой изображений глав манги.
 * Предоставляет функциональность для загрузки, получения, удаления изображений,
 * работы с MinIO хранилищем Yandex Object Storage и управления метаданными изображений.
 *
 * @author ShadowShiftStudio
 */
@Service
public class ImageStorageService {

    @Autowired
    private ChapterImageRepository imageRepository;

    @Autowired
    private MinioClient minioClient;

    @Autowired
    private YandexStorageProperties yandexProperties;

    @Autowired
    private UserAvatarRepository userAvatarRepository;

    /**
     * Получает список всех изображений для указанной главы, отсортированных по номеру страницы.
     *
     * @param chapterId идентификатор главы
     * @return список изображений главы
     */
    public List<ChapterImageResponseDTO> getImagesByChapterId(Long chapterId) {
        return imageRepository.findByChapterIdOrderByPageNumberAsc(chapterId)
                .stream()
                .map(ChapterImageResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Получает изображение по идентификатору главы и номеру страницы.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @return Optional с изображением или пустой Optional если изображение не найдено
     */
    public Optional<ChapterImageResponseDTO> getImageByChapterAndPage(Long chapterId, Integer pageNumber) {
        return imageRepository.findByChapterIdAndPageNumber(chapterId, pageNumber)
                .map(ChapterImageResponseDTO::new);
    }

    /**
     * Получает обложку для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @return Optional с обложкой или пустой Optional если обложка не найдена
     */
    public Optional<ChapterImageResponseDTO> getCoverByMangaId(Long mangaId) {
        return imageRepository.findByMangaIdAndChapterId(mangaId, -1L)
                .map(ChapterImageResponseDTO::new);
    }

    /**
     * Получает количество страниц в указанной главе.
     *
     * @param chapterId идентификатор главы
     * @return количество страниц
     */
    public Integer getPageCountByChapterId(Long chapterId) {
        return imageRepository.countByChapterId(chapterId);
    }

    /**
     * Загружает изображение по URL в хранилище MinIO для указанной страницы главы.
     * Используется для переноса изображений из внешних источников (например, MelonService).
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @param imageUrl URL изображения для загрузки
     * @return загруженное изображение
     * @throws RuntimeException если загрузка или обработка изображения не удалась
     */
    public ChapterImageResponseDTO uploadImageFromUrl(Long chapterId, Integer pageNumber, String imageUrl) {
        try {
            Optional<ChapterImage> existingImage = imageRepository.findByChapterIdAndPageNumber(chapterId, pageNumber);
            if (existingImage.isPresent()) {
                return new ChapterImageResponseDTO(existingImage.get());
            }

            createBucketIfNotExists();

            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);

            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) {
                throw new RuntimeException("Failed to download image from MelonService: " + imageUrl +
                        ", response code: " + connection.getResponseCode());
            }

            InputStream inputStream = connection.getInputStream();
            byte[] imageBytes = inputStream.readAllBytes();
            inputStream.close();

            String contentType = connection.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                contentType = "image/jpeg";
            }

            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            int width = bufferedImage != null ? bufferedImage.getWidth() : 0;
            int height = bufferedImage != null ? bufferedImage.getHeight() : 0;

            String imageKey = generateObjectKey(chapterId, pageNumber, "page_" + pageNumber + ".jpg");

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(imageKey)
                            .stream(new ByteArrayInputStream(imageBytes), imageBytes.length, -1)
                            .contentType(contentType)
                            .build()
            );

            String minioImageUrl = generateImageUrl(imageKey);

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

    /**
     * Генерирует ключ для изображения в MinIO хранилище.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @return сгенерированный ключ объекта
     */
    private String generateImageKey(Long chapterId, Integer pageNumber) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        return String.format("chapters/%d/pages/%d_%s_%s.jpg",
                chapterId, pageNumber, timestamp, UUID.randomUUID().toString().substring(0, 8));
    }

    /**
     * Загружает одиночное изображение для указанной страницы главы.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @param file файл изображения для загрузки
     * @return загруженное изображение
     * @throws IOException при ошибках ввода-вывода
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public ChapterImageResponseDTO uploadImage(Long chapterId, Integer pageNumber, MultipartFile file)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        createBucketIfNotExists();

        Optional<ChapterImage> existingImage = imageRepository
                .findByChapterIdAndPageNumber(chapterId, pageNumber);

        if (existingImage.isPresent()) {
            throw new RuntimeException("Image for page " + pageNumber +
                    " already exists for chapter " + chapterId);
        }

        String objectKey = generateObjectKey(chapterId, pageNumber, file.getOriginalFilename());

        BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
        Integer width = null;
        Integer height = null;
        if (bufferedImage != null) {
            width = bufferedImage.getWidth();
            height = bufferedImage.getHeight();
        }

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(objectKey)
                            .stream(inputStream, file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
        }

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

    /**
     * Загружает несколько изображений для главы с автоматической нумерацией страниц.
     *
     * @param chapterId идентификатор главы
     * @param files список файлов изображений
     * @return список загруженных изображений
     * @throws IOException при ошибках ввода-вывода
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public List<ChapterImageResponseDTO> uploadMultipleImages(Long chapterId, List<MultipartFile> files)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        createBucketIfNotExists();

        Integer nextPageNumber = getNextAvailablePageNumber(chapterId);

        List<ChapterImageResponseDTO> uploadedImages = new java.util.ArrayList<>();

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            Integer pageNumber = nextPageNumber + i;

            String objectKey = generateObjectKey(chapterId, pageNumber, file.getOriginalFilename());

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
            Integer width = null;
            Integer height = null;
            if (bufferedImage != null) {
                width = bufferedImage.getWidth();
                height = bufferedImage.getHeight();
            }

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

    /**
     * Загружает несколько изображений для главы с указанием начального номера страницы.
     * Файлы сортируются по имени для обеспечения предсказуемого порядка.
     *
     * @param chapterId идентификатор главы
     * @param files список файлов изображений
     * @param startPage начальный номер страницы
     * @return список загруженных изображений
     * @throws IOException при ошибках ввода-вывода
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public List<ChapterImageResponseDTO> uploadMultipleImagesWithOrder(Long chapterId, List<MultipartFile> files, Integer startPage)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        createBucketIfNotExists();

        List<MultipartFile> sortedFiles = new ArrayList<>(files);
        sortedFiles.sort((f1, f2) -> {
            String name1 = f1.getOriginalFilename();
            String name2 = f2.getOriginalFilename();
            if (name1 == null) name1 = "";
            if (name2 == null) name2 = "";
            return name1.compareToIgnoreCase(name2);
        });

        List<ChapterImageResponseDTO> uploadedImages = new java.util.ArrayList<>();

        for (int i = 0; i < sortedFiles.size(); i++) {
            MultipartFile file = sortedFiles.get(i);
            Integer pageNumber = startPage + i;

            Optional<ChapterImage> existingImage = imageRepository
                    .findByChapterIdAndPageNumber(chapterId, pageNumber);

            if (existingImage.isPresent()) {
                throw new RuntimeException("Page " + pageNumber + " already exists for chapter " + chapterId);
            }

            String objectKey = generateObjectKey(chapterId, pageNumber, file.getOriginalFilename());

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
            Integer width = null;
            Integer height = null;
            if (bufferedImage != null) {
                width = bufferedImage.getWidth();
                height = bufferedImage.getHeight();
            }

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

    /**
     * Удаляет изображение по его идентификатору из MinIO хранилища и базы данных.
     *
     * @param imageId идентификатор изображения для удаления
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws IOException при ошибках ввода-вывода
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public void deleteImage(Long imageId) throws ServerException, InsufficientDataException, ErrorResponseException,
            IOException, NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException,
            XmlParserException, InternalException {

        Optional<ChapterImage> imageOpt = imageRepository.findById(imageId);
        if (imageOpt.isPresent()) {
            ChapterImage image = imageOpt.get();

            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(image.getImageKey())
                            .build()
            );

            imageRepository.delete(image);
        }
    }

    /**
     * Удаляет все изображения для указанной главы из MinIO хранилища и базы данных.
     *
     * @param chapterId идентификатор главы
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws IOException при ошибках ввода-вывода
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public void deleteAllChapterImages(Long chapterId) throws ServerException, InsufficientDataException,
            ErrorResponseException, IOException, NoSuchAlgorithmException, InvalidKeyException,
            InvalidResponseException, XmlParserException, InternalException {

        List<ChapterImage> images = imageRepository.findByChapterIdOrderByPageNumberAsc(chapterId);

        for (ChapterImage image : images) {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(image.getImageKey())
                            .build()
            );
        }

        imageRepository.deleteByChapterId(chapterId);
    }

    /**
     * Получает байты изображения по его ключу из MinIO хранилища.
     *
     * @param imageKey ключ изображения в хранилище
     * @return массив байтов изображения
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws IOException при ошибках ввода-вывода
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public byte[] getImageBytes(String imageKey) throws ServerException, InsufficientDataException,
            ErrorResponseException, IOException, NoSuchAlgorithmException, InvalidKeyException,
            InvalidResponseException, XmlParserException, InternalException {

        try {
            GetObjectResponse response = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(imageKey)
                            .build()
            );
            return response.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Изменяет порядок страниц в главе на основе предоставленного списка идентификаторов изображений.
     *
     * @param chapterId идентификатор главы
     * @param imageIds список идентификаторов изображений в новом порядке
     * @return список изображений с обновленным порядком
     */
    public List<ChapterImageResponseDTO> reorderPages(Long chapterId, List<Long> imageIds) {
        List<ChapterImage> images = new ArrayList<>();

        for (Long imageId : imageIds) {
            Optional<ChapterImage> imageOpt = imageRepository.findById(imageId);
            if (imageOpt.isPresent() && imageOpt.get().getChapterId().equals(chapterId)) {
                images.add(imageOpt.get());
            }
        }

        for (int i = 0; i < images.size(); i++) {
            ChapterImage image = images.get(i);
            image.setPageNumber(i + 1);
            imageRepository.save(image);
        }

        return images.stream()
                .map(ChapterImageResponseDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * Импортирует изображение из локального файла в MinIO хранилище.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @param localImagePath путь к локальному файлу изображения
     * @return импортированное изображение
     * @throws IOException при ошибках ввода-вывода
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public ChapterImageResponseDTO importFromLocalFile(Long chapterId, Integer pageNumber, String localImagePath)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        createBucketIfNotExists();

        Optional<ChapterImage> existingImage = imageRepository
                .findByChapterIdAndPageNumber(chapterId, pageNumber);

        if (existingImage.isPresent()) {
            throw new RuntimeException("Image for page " + pageNumber +
                    " already exists for chapter " + chapterId);
        }

        java.io.File localFile = new java.io.File(localImagePath);
        if (!localFile.exists()) {
            throw new RuntimeException("Local image file not found: " + localImagePath);
        }

        String objectKey = generateObjectKey(chapterId, pageNumber, localFile.getName());

        try (java.io.FileInputStream fileInputStream = new java.io.FileInputStream(localFile)) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(objectKey)
                            .stream(fileInputStream, localFile.length(), -1)
                            .contentType("image/jpeg")
                            .build()
            );
        }

        BufferedImage bufferedImage = ImageIO.read(localFile);
        Integer width = null;
        Integer height = null;
        if (bufferedImage != null) {
            width = bufferedImage.getWidth();
            height = bufferedImage.getHeight();
        }

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

    /**
     * Создает bucket в MinIO если он не существует.
     *
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws IOException при ошибках ввода-вывода
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    private void createBucketIfNotExists() throws ServerException, InsufficientDataException,
            ErrorResponseException, IOException, NoSuchAlgorithmException, InvalidKeyException,
            InvalidResponseException, XmlParserException, InternalException {

        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(yandexProperties.getBucketName()).build()
            );

            if (!exists) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(yandexProperties.getBucketName()).build()
                );
            }
        } catch (ErrorResponseException e) {
            if (e.response() != null && e.response().code() == 400) {
            } else {
                throw e;
            }
        }
    }

    /**
     * Генерирует уникальный ключ для объекта в MinIO хранилище.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @param originalFilename оригинальное имя файла
     * @return сгенерированный ключ объекта
     */
    private String generateObjectKey(Long chapterId, Integer pageNumber, String originalFilename) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = getFileExtension(originalFilename);
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);

        return String.format("chapters/%d/pages/%03d_%s_%s%s",
                chapterId, pageNumber, timestamp, uniqueId, extension);
    }

    /**
     * Генерирует публичный URL для доступа к изображению в MinIO.
     *
     * @param objectKey ключ объекта в хранилище
     * @return публичный URL изображения
     */
    private String generateImageUrl(String objectKey) {
        return String.format("%s/%s/%s", yandexProperties.getPublicEndpoint(), yandexProperties.getBucketName(), objectKey);
    }

    /**
     * Получает расширение файла из имени файла.
     *
     * @param filename имя файла
     * @return расширение файла или пустая строка если расширение не найдено
     */
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }

    /**
     * Получает следующий доступный номер страницы для главы.
     *
     * @param chapterId идентификатор главы
     * @return следующий доступный номер страницы
     */
    private Integer getNextAvailablePageNumber(Long chapterId) {
        return imageRepository.findMaxPageNumberByChapterId(chapterId)
                .map(maxPage -> maxPage + 1)
                .orElse(1);
    }

    /**
     * Загружает обложку для указанной манги.
     * Если обложка уже существует, она заменяется новой.
     *
     * @param mangaId идентификатор манги
     * @param file файл обложки для загрузки
     * @return загруженная обложка
     * @throws IOException при ошибках ввода-вывода
     * @throws ServerException при ошибках сервера MinIO
     * @throws InsufficientDataException при недостатке данных
     * @throws ErrorResponseException при ошибках ответа MinIO
     * @throws NoSuchAlgorithmException при отсутствии алгоритма
     * @throws InvalidKeyException при недействительном ключе
     * @throws InvalidResponseException при недействительном ответе
     * @throws XmlParserException при ошибках парсинга XML
     * @throws InternalException при внутренних ошибках
     */
    public ChapterImageResponseDTO uploadCoverForManga(Long mangaId, MultipartFile file)
            throws IOException, ServerException, InsufficientDataException, ErrorResponseException,
            NoSuchAlgorithmException, InvalidKeyException, InvalidResponseException, XmlParserException,
            InternalException {

        createBucketIfNotExists();

        Optional<ChapterImage> existingCover = imageRepository.findByMangaIdAndChapterId(mangaId, -1L);
        if (existingCover.isPresent()) {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(existingCover.get().getImageKey())
                            .build()
            );
            imageRepository.delete(existingCover.get());
        }

        String objectKey = generateObjectKey(-1L, mangaId.intValue(), file.getOriginalFilename());

        minioClient.putObject(
                PutObjectArgs.builder()
                        .bucket(yandexProperties.getBucketName())
                        .object(objectKey)
                        .stream(file.getInputStream(), file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build()
        );

        BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
        Integer width = null;
        Integer height = null;
        if (bufferedImage != null) {
            width = bufferedImage.getWidth();
            height = bufferedImage.getHeight();
        }

        ChapterImage chapterImage = new ChapterImage();
        chapterImage.setMangaId(mangaId);
        chapterImage.setChapterId(-1L);
        chapterImage.setPageNumber(mangaId.intValue());
        chapterImage.setImageKey(objectKey);
        chapterImage.setImageUrl(generateImageUrl(objectKey));
        chapterImage.setFileSize(file.getSize());
        chapterImage.setMimeType(file.getContentType());
        chapterImage.setWidth(width);
        chapterImage.setHeight(height);
        chapterImage.setCreatedAt(LocalDateTime.now());

        ChapterImage savedImage = imageRepository.save(chapterImage);
        return new ChapterImageResponseDTO(savedImage);
    }

    // Helper to generate avatar object key
    private String generateAvatarObjectKey(Long userId, String originalFilename) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String extension = getFileExtension(originalFilename);
        if (extension.isEmpty()) {
            extension = ".jpg"; // default
        }
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);
        return String.format("avatars/%d/%s_%s%s", userId, timestamp, uniqueId, extension);
    }

    public UserAvatarResponseDTO uploadUserAvatar(Long userId, MultipartFile file) {
        try {
            createBucketIfNotExists();
            if (file.isEmpty()) {
                throw new RuntimeException("Empty file");
            }
            if (file.getSize() > 5 * 1024 * 1024) { // 5MB limit
                throw new RuntimeException("Avatar file too large (max 5MB)");
            }
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new RuntimeException("Invalid image type");
            }

            Optional<UserAvatar> existingOpt = userAvatarRepository.findByUserId(userId);
            LocalDateTime now = LocalDateTime.now();
            if (existingOpt.isPresent()) {
                UserAvatar existing = existingOpt.get();
                if (existing.getUpdatedAt() != null && existing.getUpdatedAt().isAfter(now.minusHours(24))) {
                    throw new AvatarUploadRateLimitException("Avatar can be updated only once per 24h");
                }
            }

            String objectKey = generateAvatarObjectKey(userId, file.getOriginalFilename());

            // Remove previous object if any
            if (existingOpt.isPresent()) {
                try {
                    minioClient.removeObject(
                            RemoveObjectArgs.builder()
                                    .bucket(yandexProperties.getBucketName())
                                    .object(existingOpt.get().getImageKey())
                                    .build()
                    );
                } catch (Exception ignored) {}
            }

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(yandexProperties.getBucketName())
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(contentType)
                            .build()
            );

            BufferedImage bufferedImage = ImageIO.read(file.getInputStream());
            Integer width = null;
            Integer height = null;
            if (bufferedImage != null) {
                width = bufferedImage.getWidth();
                height = bufferedImage.getHeight();
            }

            UserAvatar avatar = existingOpt.orElseGet(UserAvatar::new);
            avatar.setUserId(userId);
            avatar.setImageKey(objectKey);
            avatar.setImageUrl(generateImageUrl(objectKey));
            avatar.setFileSize(file.getSize());
            avatar.setMimeType(contentType);
            avatar.setWidth(width);
            avatar.setHeight(height);
            avatar.setUpdatedAt(LocalDateTime.now());
            if (avatar.getCreatedAt() == null) {
                avatar.setCreatedAt(LocalDateTime.now());
            }

            UserAvatar saved = userAvatarRepository.save(avatar);
            return new UserAvatarResponseDTO(saved);
        } catch (AvatarUploadRateLimitException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload avatar: " + e.getMessage(), e);
        }
    }

    public Optional<UserAvatar> getUserAvatar(Long userId) {
        return userAvatarRepository.findByUserId(userId);
    }
}
