package shadowshift.studio.mangaservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.repository.MangaRepository;
import shadowshift.studio.mangaservice.websocket.ProgressWebSocketHandler;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class MelonIntegrationService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private MangaRepository mangaRepository;

    @Autowired
    private ImportTaskService importTaskService;

    @Autowired
    private ProgressWebSocketHandler webSocketHandler;

    @Value("${melon.service.url:http://melon-service:8084}")
    private String melonServiceUrl;

    @Value("${melon.service.public.url:http://localhost:8084}")
    private String melonServicePublicUrl;

    @Autowired
    private FullParsingTaskRunner fullParsingTaskRunner;

    /**
     * Запускает парсинг манги через MelonService
     */
    public Map<String, Object> startParsing(String slug) {
        String url = melonServiceUrl + "/parse";

        Map<String, String> request = new HashMap<>();
        request.put("slug", slug);
        request.put("parser", "mangalib");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return response.getBody();
    }

    /**
     * Запускает полный парсинг манги с автоматическим скачиванием изображений
     * Это основной метод, который должен и��пользоваться вместо startParsing
     */
    public Map<String, Object> startFullParsing(String slug) {
        try {
            Map<String, Object> parseResult = startParsing(slug);
            if (parseResult == null || !parseResult.containsKey("task_id")) {
                return Map.of("error", "Не удалось запустить парсинг");
            }
            String parseTaskId = (String) parseResult.get("task_id");
            String fullParsingTaskId = UUID.randomUUID().toString();
            // Исправлено: передаем ссылку на this
            fullParsingTaskRunner.startFullParsingTask(this, fullParsingTaskId, parseTaskId, slug);
            return Map.of(
                "task_id", fullParsingTaskId,
                "parse_task_id", parseTaskId,
                "status", "pending",
                "message", "Запущен полный парсинг с скачиванием изображений"
            );
        } catch (Exception e) {
            return Map.of("error", "Ошибка полного парсинга: " + e.getMessage());
        }
    }

    // Публичный метод для запуска логики полного парсинга (вызывается из FullParsingTaskRunner)
    public void runFullParsingTaskLogic(String fullTaskId, String parseTaskId, String slug) {
        try {
            updateFullParsingTask(fullTaskId, "running", 5, "Ожидание завершения парсинга JSON...", null);
            Map<String, Object> finalStatus = waitForTaskCompletion(parseTaskId);
            if (!"completed".equals(finalStatus.get("status"))) {
                updateFullParsingTask(fullTaskId, "failed", 100,
                    "Парсинг завершился неуспешно: " + finalStatus.get("message"), finalStatus);
                return;
            }
            updateFullParsingTask(fullTaskId, "running", 50, "Парсинг JSON завершен, запускаем скачивание изображений...", null);
            Map<String, Object> buildResult = buildManga(slug, null);
            if (buildResult == null || !buildResult.containsKey("task_id")) {
                updateFullParsingTask(fullTaskId, "failed", 100,
                    "Не удалось ��апустить скачивание изображений", buildResult);
                return;
            }
            String buildTaskId = (String) buildResult.get("task_id");
            updateFullParsingTask(fullTaskId, "running", 60, "Скачивание изображений запущено, ожидание завершения...", null);
            Map<String, Object> buildStatus = waitForTaskCompletion(buildTaskId);
            if ("completed".equals(buildStatus.get("status"))) {
                Map<String, Object> mangaInfo = getMangaInfo(slug);
                Map<String, Object> result = new HashMap<>();
                result.put("filename", slug);
                result.put("parse_completed", true);
                result.put("build_completed", true);
                if (mangaInfo != null) {
                    result.put("title", mangaInfo.get("localized_name"));
                    result.put("manga_info", mangaInfo);
                }
                updateFullParsingTask(fullTaskId, "completed", 100,
                    "Полный парсинг завершен успешно! JSON и изображения готовы.", result);
            } else {
                updateFullParsingTask(fullTaskId, "failed", 100,
                    "Скачивание изображений завершилось неуспешно: " + buildStatus.get("message"), buildStatus);
            }
        } catch (Exception e) {
            updateFullParsingTask(fullTaskId, "failed", 100,
                "Ошибка при полном парсинге: " + e.getMessage(), null);
        }
    }

    // Хранилище для отслеживания задач полного парсинга
    private final Map<String, Map<String, Object>> fullParsingTasks = new HashMap<>();

    /**
     * Обновляет статус задачи полного парсинга и отправляет через WebSocket
     */
    private void updateFullParsingTask(String taskId, String status, int progress, String message, Map<String, Object> result) {
        Map<String, Object> task = new HashMap<>();
        task.put("task_id", taskId);
        task.put("status", status);
        task.put("progress", progress);
        task.put("message", message);
        task.put("updated_at", java.time.LocalDateTime.now().toString());
        if (result != null) {
            task.put("result", result);
        }
        fullParsingTasks.put(taskId, task);

        // Отправляем обновление прогресса через WebSocket
        webSocketHandler.sendProgressUpdate(taskId, task);
        webSocketHandler.sendLogMessage(taskId, "INFO", message);
    }

    /**
     * Получает статус задачи полного парсинга
     */
    public Map<String, Object> getFullParsingTaskStatus(String taskId) {
        return fullParsingTasks.getOrDefault(taskId, Map.of("error", "Задача не найдена"));
    }

    /**
     * Ожидает завершения задачи парсинга
     */
    private Map<String, Object> waitForTaskCompletion(String taskId) throws InterruptedException {
        Map<String, Object> status;
        int maxAttempts = 60; // максимум 2 минуты ожидания
        int attempts = 0;

        do {
            Thread.sleep(2000); // жде�� 2 секунды
            status = getTaskStatus(taskId);
            attempts++;

            if (attempts >= maxAttempts) {
                return Map.of("status", "failed", "message", "Превышено время ожидания завершения задачи");
            }

        } while (status != null &&
                !"completed".equals(status.get("status")) &&
                !"failed".equals(status.get("status")));

        return status != null ? status : Map.of("status", "failed", "message", "Не удалось получить статус задачи");
    }

    /**
     * Получает статус ��адачи парсинга
     */
    public Map<String, Object> getTaskStatus(String taskId) {
        String url = melonServiceUrl + "/status/" + taskId;
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return response.getBody();
    }

    /**
     * Запускает построение архива манги
     */
    public Map<String, Object> buildManga(String filename, String branchId) {
        String url = melonServiceUrl + "/build";

        Map<String, String> request = new HashMap<>();
        request.put("filename", filename);
        request.put("parser", "mangalib");
        request.put("archive_type", "simple");

        if (branchId != null && !branchId.isEmpty()) {
            request.put("branch_id", branchId);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return response.getBody();
    }

    /**
     * Получает список спаршенных манг
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listParsedManga() {
        String url = melonServiceUrl + "/list-parsed";
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        Map<String, Object> body = response.getBody();

        if (body != null && body.containsKey("manga_list")) {
            return (List<Map<String, Object>>) body.get("manga_list");
        }

        return new ArrayList<>();
    }

    /**
     * Получает информацию о спаршенной манге
     */
    public Map<String, Object> getMangaInfo(String filename) {
        String url = melonServiceUrl + "/manga-info/" + filename;
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return response.getBody();
    }

    /**
     * Импортирует спаршенную мангу в нашу систему
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> importToSystem(String filename, String branchId) {
        try {
            // Получаем по��ные данные манги от MelonService
            Map<String, Object> mangaInfo = getMangaInfo(filename);

            if (mangaInfo == null) {
                throw new RuntimeException("Информация о манге не найден��");
            }

            // Создаем мангу в нашей системе
            Manga manga = new Manga();

            // Обрабатываем title - используем localized_name (русское название)
            String title = (String) mangaInfo.get("localized_name");
            if (title == null || title.trim().isEmpty()) {
                title = (String) mangaInfo.get("eng_name");
                if (title == null || title.trim().isEmpty()) {
                    // Используем filename как title, если все названия пустые
                    title = filename.replace("-", " ").replace("_", " ");
                    // Делаем первую букву заглавной
                    title = title.substring(0, 1).toUpperCase() + title.substring(1);
                }
            }
            manga.setTitle(title.trim());

            // Обрабатываем а��торов
            List<String> authors = (List<String>) mangaInfo.get("authors");
            if (authors != null && !authors.isEmpty()) {
                // Фильтруем пустых авторов и объединяем
                String authorString = authors.stream()
                    .filter(author -> author != null && !author.trim().isEmpty())
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.joining(", "));

                if (!authorString.isEmpty()) {
                    manga.setAuthor(authorString);
                }
            }

            // Обрабатываем описание
            String description = (String) mangaInfo.get("description");
            if (description != null && !description.trim().isEmpty()) {
                manga.setDescription(description.trim());
            }

            manga.setStatus(Manga.MangaStatus.ONGOING);

            // Обрабатываем жанры
            List<String> genres = (List<String>) mangaInfo.get("genres");
            if (genres != null && !genres.isEmpty()) {
                // Фильтруем пустые жанры
                List<String> filteredGenres = genres.stream()
                    .filter(genre -> genre != null && !genre.trim().isEmpty())
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.toList());

                if (!filteredGenres.isEmpty()) {
                    manga.setGenre(String.join(", ", filteredGenres));
                }
            }

            // Обрабатываем год
            Object publicationYear = mangaInfo.get("publication_year");
            if (publicationYear != null && !publicationYear.toString().trim().isEmpty()) {
                try {
                    int yearInt = Integer.parseInt(publicationYear.toString().trim());
                    if (yearInt > 1900 && yearInt <= LocalDate.now().getYear()) {
                        manga.setReleaseDate(LocalDate.of(yearInt, 1, 1));
                    }
                } catch (NumberFormatException e) {
                    // Игнорируем ошибки парсинга года
                }
            }

            // Подсчитываем общее количество глав
            Map<String, Object> content = (Map<String, Object>) mangaInfo.get("content");
            int totalChapters = 0;
            if (content != null) {
                for (Object chaptersList : content.values()) {
                    if (chaptersList instanceof List) {
                        totalChapters += ((List<?>) chaptersList).size();
                    }
                }
            }
            manga.setTotalChapters(totalChapters);

            // СНАЧАЛА сохраняем мангу, чтобы получить ID
            manga = mangaRepository.save(manga);
            System.out.println("Manga saved with ID: " + manga.getId() + " for filename: " + filename);
            // Формируем публичную ссылку на обложку для фронта
            manga.setCoverImageUrl(melonServicePublicUrl + "/cover/" + filename);
            manga = mangaRepository.save(manga);

//            // Обрабатываем обложку ПОСЛЕ сохранения манги - скачиваем из MelonService и сохраняем как файл
//            try {
//                // Скачиваем обложку из MelonService
//                String coverUrl = melonServiceUrl + "/cover/" + filename;
//                ResponseEntity<byte[]> coverResponse = restTemplate.getForEntity(coverUrl, byte[].class);
//
//                if (coverResponse.getStatusCode().is2xxSuccessful() && coverResponse.getBody() != null) {
//                    // Определяем расширение файла по Content-Type
//                    String contentType = coverResponse.getHeaders().getFirst("Content-Type");
//                    String fileExtension = ".jpg"; // По умолчанию
//                    if (contentType != null) {
//                        if (contentType.contains("png")) {
//                            fileExtension = ".png";
//                        } else if (contentType.contains("webp")) {
//                            fileExtension = ".webp";
//                        }
//                    }
//
//                    // Сохраняем обложку как файл через специальный эндпоинт для обложек
//                    String coverFileName = "cover_" + filename + fileExtension;
//
//                    // Создаем multipart запрос для специального эндпоинта обложек
//                    MultiValueMap<String, Object> coverRequest = new LinkedMultiValueMap<>();
//
//                    // Создаем ByteArrayResource для отправки
//                    ByteArrayResource coverResource = new ByteArrayResource(coverResponse.getBody()) {
//                        @Override
//                        public String getFilename() {
//                            return coverFileName;
//                        }
//                    };
//                    coverRequest.add("file", coverResource);
//
//                    HttpHeaders coverHeaders = new HttpHeaders();
//                    coverHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
//                    HttpEntity<MultiValueMap<String, Object>> coverEntity = new HttpEntity<>(coverRequest, coverHeaders);
//
//                    // ОСНОВНОЙ путь - всегда сохраняем в Minio через ImageStorageService
//                    ResponseEntity<Map> uploadResponse = restTemplate.postForEntity(
//                        "http://image-storage-service:8083/api/images/cover/" + manga.getId(),
//                        coverEntity,
//                        Map.class
//                    );
//
//
//
//                    if (uploadResponse.getStatusCode().is2xxSuccessful() && uploadResponse.getBody() != null) {
//                        String savedImageUrl = (String) uploadResponse.getBody().get("imageUrl");
//                        if (savedImageUrl != null) {
//                            if (savedImageUrl != null && !savedImageUrl.isEmpty() && !savedImageUrl.isBlank()) {
//                                manga.setCoverImageUrl(savedImageUrl);
//                            } else {
//                            }
//                            System.out.println("Cover saved successfully to Minio for manga: " + filename + " with URL: " + savedImageUrl);
//                        }
//                    } else {
//                        System.err.println("Failed to save cover to Minio for manga " + filename +
//                            ", status: " + uploadResponse.getStatusCode());
//                        // Fallback - пробуем использовать обложку из JSON
//                        setFallbackCoverFromJson(manga, mangaInfo);
//                    }
//                } else {
//                    System.err.println("Failed to download cover for manga: " + filename +
//                        ", status: " + coverResponse.getStatusCode());
//                    // Fallback - пробуем использовать обложку из JSON
//                    setFallbackCoverFromJson(manga, mangaInfo);
//                }
//            } catch (Exception e) {
//                System.err.println("Error processing cover for manga " + filename + ": " + e.getMessage());
//                // Fallback - пробуем использовать обложку из JSON
//                setFallbackCoverFromJson(manga, mangaInfo);
//            }

            return Map.of(
                "success", true,
                "manga_id", manga.getId(),
                "title", manga.getTitle(),
                "total_chapters", totalChapters,
                "selected_branch", branchId != null ? branchId : "auto"
            );

        } catch (Exception e) {
            throw new RuntimeException("Ошибка импорта манги: " + e.getMessage(), e);
        }
    }

    /**
     * Импортирует спаршенную мангу в нашу систему асинхронно
     */
    public Map<String, Object> importToSystemAsync(String filename, String branchId) {
        String taskId = UUID.randomUUID().toString();

        // Создаем задачу
        ImportTaskService.ImportTask task = importTaskService.createTask(taskId);

        // Запускаем импорт асинхронно
        importMangaWithProgressAsync(taskId, filename, branchId);

        return Map.of(
            "success", true,
            "taskId", taskId,
            "status", "pending",
            "message", "Импорт запущен"
        );
    }

    /**
     * Получает статус задачи импорта
     */
    public Map<String, Object> getImportTaskStatus(String taskId) {
        ImportTaskService.ImportTask task = importTaskService.getTask(taskId);
        if (task == null) {
            return Map.of("error", "За��ача не найдена");
        }

        return task.toMap();
    }

    @Async
    public CompletableFuture<Void> importMangaWithProgressAsync(String taskId, String filename, String branchId) {
        ImportTaskService.ImportTask task = importTaskService.getTask(taskId);

        try {
            // Шаг 1: Получаем данные манги
            task.setStatus(ImportTaskService.TaskStatus.IMPORTING_MANGA);
            task.setProgress(5);
            task.setMessage("Получение данных манги...");

            Map<String, Object> mangaInfo = getMangaInfo(filename);
            if (mangaInfo == null) {
                importTaskService.markTaskFailed(taskId, "Информация о манге не найдена");
                return CompletableFuture.completedFuture(null);
            }

            // Шаг 2: Пропускаем повторное скачивание - изображения уже скачаны во время полного парсинга
            task.setProgress(15);
            task.setMessage("Создание записи манги...");

            Manga manga = createMangaFromData(mangaInfo, filename);

            // Подсчитываем главы
            Map<String, Object> content = (Map<String, Object>) mangaInfo.get("content");
            int totalChapters = 0;
            int totalPages = 0;
            List<Map<String, Object>> chaptersToImport = new ArrayList<>();

            if (content != null) {
                // Если указан конкретный branch, берем только его
                if (branchId != null && !branchId.isEmpty()) {
                    Object branchContent = content.get(branchId);
                    if (branchContent instanceof List) {
                        chaptersToImport = (List<Map<String, Object>>) branchContent;
                    }
                } else {
                    // Берем первую ветку
                    for (Object branchContent : content.values()) {
                        if (branchContent instanceof List) {
                            chaptersToImport = (List<Map<String, Object>>) branchContent;
                            break;
                        }
                    }
                }

                totalChapters = chaptersToImport.size();

                // Подсчитываем общее количество страниц
                for (Map<String, Object> chapter : chaptersToImport) {
                    List<Map<String, Object>> slides = (List<Map<String, Object>>) chapter.get("slides");
                    if (slides != null) {
                        totalPages += slides.size();
                    }
                }
            }

            manga.setTotalChapters(totalChapters);
            manga = mangaRepository.save(manga);

            // Обновляем информацию о задаче
            task.setMangaId(manga.getId());
            task.setTitle(manga.getTitle());
            task.setTotalChapters(totalChapters);
            task.setTotalPages(totalPages);

            // Шаг 3: Импортируем главы
            task.setStatus(ImportTaskService.TaskStatus.IMPORTING_CHAPTERS);
            task.setProgress(20);
            task.setMessage("Импорт глав: 0/" + totalChapters);

            importChaptersWithProgress(taskId, manga.getId(), chaptersToImport, filename);

            importTaskService.markTaskCompleted(taskId);

        } catch (Exception e) {
            importTaskService.markTaskFailed(taskId, e.getMessage());
        }

        return CompletableFuture.completedFuture(null);
    }

    private Manga createMangaFromData(Map<String, Object> mangaInfo, String filename) {
        Manga manga = new Manga();

        // Обрабатываем title - используем localized_name (русское название)
        String title = (String) mangaInfo.get("localized_name");
        if (title == null || title.trim().isEmpty()) {
            title = (String) mangaInfo.get("eng_name");
            if (title == null || title.trim().isEmpty()) {
                title = filename.replace("-", " ").replace("_", " ");
                title = title.substring(0, 1).toUpperCase() + title.substring(1);
            }
        }
        manga.setTitle(title.trim());

        // Обрабатываем авторов
        List<String> authors = (List<String>) mangaInfo.get("authors");
        if (authors != null && !authors.isEmpty()) {
            String authorString = authors.stream()
                .filter(author -> author != null && !author.trim().isEmpty())
                .map(String::trim)
                .collect(java.util.stream.Collectors.joining(", "));

            if (!authorString.isEmpty()) {
                manga.setAuthor(authorString);
            }
        }

        // Обрабатываем описание
        String description = (String) mangaInfo.get("description");
        if (description != null && !description.trim().isEmpty()) {
            manga.setDescription(description.trim());
        }

        manga.setStatus(Manga.MangaStatus.ONGOING);

        // Обрабатываем жанры
        List<String> genres = (List<String>) mangaInfo.get("genres");
        if (genres != null && !genres.isEmpty()) {
            // Фильтруем пустые жанры
            List<String> filteredGenres = genres.stream()
                .filter(genre -> genre != null && !genre.trim().isEmpty())
                .map(String::trim)
                .collect(java.util.stream.Collectors.toList());

            if (!filteredGenres.isEmpty()) {
                manga.setGenre(String.join(", ", filteredGenres));
            }
        }

        // Обрабатываем год
        Object publicationYear = mangaInfo.get("publication_year");
        if (publicationYear != null && !publicationYear.toString().trim().isEmpty()) {
            try {
                int yearInt = Integer.parseInt(publicationYear.toString().trim());
                if (yearInt > 1900 && yearInt <= LocalDate.now().getYear()) {
                    manga.setReleaseDate(LocalDate.of(yearInt, 1, 1));
                }
            } catch (NumberFormatException e) {
                // Игнорируем ошибки парсинга года
            }
        }

        // СНАЧАЛА сохраняем мангу, чтобы получить ID
        manga = mangaRepository.save(manga);
        System.out.println("Manga saved with ID: " + manga.getId() + " for filename: " + filename);
        // Формируем публичную ссылку на обложку для фронта
        manga.setCoverImageUrl(melonServicePublicUrl + "/cover/" + filename);
        manga = mangaRepository.save(manga);

//        // Обрабатываем обложку - скачиваем из MelonService и сохраняем как файл
//        try {
//            System.out.println("Starting cover processing for manga: " + filename);
//            // Скачиваем обложку из MelonService
//            String coverUrl = melonServiceUrl + "/cover/" + filename;
//            ResponseEntity<byte[]> coverResponse = restTemplate.getForEntity(coverUrl, byte[].class);
//
//            if (coverResponse.getStatusCode().is2xxSuccessful() && coverResponse.getBody() != null) {
//                System.out.println("Cover downloaded successfully from: " + coverUrl);
//                // Определяем расширение файла по Content-Type
//                String contentType = coverResponse.getHeaders().getFirst("Content-Type");
//                String fileExtension = ".jpg"; // По умолчанию
//                if (contentType != null) {
//                    if (contentType.contains("png")) {
//                        fileExtension = ".png";
//                    } else if (contentType.contains("webp")) {
//                        fileExtension = ".webp";
//                    }
//                }
//
//                // Сохраняем обложку как файл через специальный эндпоинт для обложек
//                String coverFileName = "cover_" + filename + fileExtension;
//
//                // Создаем multipart запрос для специального эндпоинта обложек
//                MultiValueMap<String, Object> coverRequest = new LinkedMultiValueMap<>();
//
//                // Создаем ByteArrayResource для отправки
//                ByteArrayResource coverResource = new ByteArrayResource(coverResponse.getBody()) {
//                    @Override
//                    public String getFilename() {
//                        return coverFileName;
//                    }
//                };
//                coverRequest.add("file", coverResource);
//
//                HttpHeaders coverHeaders = new HttpHeaders();
//                coverHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
//                HttpEntity<MultiValueMap<String, Object>> coverEntity = new HttpEntity<>(coverRequest, coverHeaders);
//
//                System.out.println("Uploading cover to ImageStorageService for manga ID: " + manga.getId());
//                // ОСНОВНОЙ путь - всегда сохраняем в Minio через ImageStorageService
//                ResponseEntity<Map> uploadResponse = restTemplate.postForEntity(
//                    "http://image-storage-service:8083/api/images/cover/" + manga.getId(),
//                    coverEntity,
//                    Map.class
//                );
//
//                if (uploadResponse.getStatusCode().is2xxSuccessful() && uploadResponse.getBody() != null) {
//                    String savedImageUrl = (String) uploadResponse.getBody().get("imageUrl");
//                    if (savedImageUrl != null) {
//                        // Если путь не содержит http, формируем публичный URL
//                        if (!savedImageUrl.startsWith("http")) {
//                            savedImageUrl = "http://image-storage-service:8083/api/images/public/" + savedImageUrl;
//                        }
//                        manga.setCoverImageUrl(savedImageUrl);
//                        manga = mangaRepository.save(manga); // Сохраняем обновленный URL
//                        System.out.println("Cover saved successfully to Minio for manga: " + filename + " with URL: " + savedImageUrl);
//                    }
//                } else {
//                    System.err.println("Failed to save cover to Minio for manga " + filename +
//                        ", status: " + uploadResponse.getStatusCode());
//                    // Fallback - пробуем использовать обложку из JSON
//                    setFallbackCoverFromJson(manga, mangaInfo);
//                }
//            } else {
//                System.err.println("Failed to download cover for manga: " + filename +
//                    ", status: " + coverResponse.getStatusCode());
//                // Fallback - пробуем использовать обложку из JSON
//                setFallbackCoverFromJson(manga, mangaInfo);
//            }
//        } catch (Exception e) {
//            System.err.println("Error processing cover for manga " + filename + ": " + e.getMessage());
//            e.printStackTrace();
//            // Fallback - пробуем использовать обложку из JSON
//            setFallbackCoverFromJson(manga, mangaInfo);
//        }

        return manga;
    }

    private void setFallbackCoverFromJson(Manga manga, Map<String, Object> mangaInfo) {
        // Fallback - пробуем использовать обложку из JSON
        List<Map<String, Object>> covers = (List<Map<String, Object>>) mangaInfo.get("covers");
        if (covers != null && !covers.isEmpty()) {
            Map<String, Object> firstCover = covers.get(0);
            String coverUrl = (String) firstCover.get("link");
            if (coverUrl != null && !coverUrl.trim().isEmpty()) {
                manga.setCoverImageUrl(coverUrl.trim());
                mangaRepository.save(manga);
            }
        }
    }

    /**
     * Удаляет мангу из MelonService (JSON, обложку, изображения)
     */
    public Map<String, Object> deleteManga(String filename) {
        try {
            String url = melonServiceUrl + "/delete/" + filename;
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.DELETE, null, Map.class);
            return response.getBody();
        } catch (Exception e) {
            return Map.of("success", false, "message", "Ошибка удаления: " + e.getMessage());
        }
    }

    /**
     * Проверяет доступность MelonService
     */
    public boolean isServiceAvailable() {
        try {
            String url = melonServiceUrl + "/";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Мигрирует существующие обложки из MelonService в Minio
     */
    public Map<String, Object> migrateExistingCovers() {
        try {
            System.out.println("Starting migration of existing covers from MelonService to Minio");

            // Пол��чаем все манги с обложками от MelonService
            List<Manga> mangasToMigrate = mangaRepository.findAll().stream()
                .filter(manga -> manga.getCoverImageUrl() != null &&
                               manga.getCoverImageUrl().contains("localhost:8084/cover/"))
                .collect(java.util.stream.Collectors.toList());

            System.out.println("Found " + mangasToMigrate.size() + " mangas with MelonService covers to migrate");

            int successCount = 0;
            int failureCount = 0;

            for (Manga manga : mangasToMigrate) {
                try {
                    // Извлекаем filename из URL обложки MelonService
                    String coverUrl = manga.getCoverImageUrl();
                    String filename = coverUrl.substring(coverUrl.lastIndexOf("/") + 1);

                    System.out.println("Migrating cover for manga ID: " + manga.getId() +
                                     ", filename: " + filename + ", title: " + manga.getTitle());

                    // Скачиваем обложку из MelonService
                    String melonCoverUrl = melonServiceUrl + "/cover/" + filename;
                    ResponseEntity<byte[]> coverResponse = restTemplate.getForEntity(melonCoverUrl, byte[].class);

                    if (coverResponse.getStatusCode().is2xxSuccessful() && coverResponse.getBody() != null) {
                        // Определяем рас��ирение файла
                        String contentType = coverResponse.getHeaders().getFirst("Content-Type");
                        String fileExtension = ".jpg";
                        if (contentType != null) {
                            if (contentType.contains("png")) {
                                fileExtension = ".png";
                            } else if (contentType.contains("webp")) {
                                fileExtension = ".webp";
                            }
                        }

                        String coverFileName = "cover_" + filename + fileExtension;

                        // Создаем multipart запрос
                        MultiValueMap<String, Object> coverRequest = new LinkedMultiValueMap<>();
                        ByteArrayResource coverResource = new ByteArrayResource(coverResponse.getBody()) {
                            @Override
                            public String getFilename() {
                                return coverFileName;
                            }
                        };
                        coverRequest.add("file", coverResource);

                        HttpHeaders coverHeaders = new HttpHeaders();
                        coverHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
                        HttpEntity<MultiValueMap<String, Object>> coverEntity = new HttpEntity<>(coverRequest, coverHeaders);

                        // Сохраняем в Minio
                        ResponseEntity<Map> uploadResponse = restTemplate.postForEntity(
                            "http://image-storage-service:8083/api/images/cover/" + manga.getId(),
                            coverEntity,
                            Map.class
                        );

                        if (uploadResponse.getStatusCode().is2xxSuccessful() && uploadResponse.getBody() != null) {
                            String savedImageUrl = (String) uploadResponse.getBody().get("imageUrl");
                            if (savedImageUrl != null) {
                                // Обновляем URL в базе данных
                                manga.setCoverImageUrl(savedImageUrl);
                                mangaRepository.save(manga);

                                System.out.println("Successfully migrated cover for manga: " + manga.getTitle() +
                                                 " to URL: " + savedImageUrl);
                                successCount++;
                            } else {
                                System.err.println("Failed to get saved image URL for manga: " + manga.getTitle());
                                failureCount++;
                            }
                        } else {
                            System.err.println("Failed to upload cover to Minio for manga: " + manga.getTitle() +
                                             ", status: " + uploadResponse.getStatusCode());
                            failureCount++;
                        }
                    } else {
                        System.err.println("Failed to download cover from MelonService for manga: " + manga.getTitle() +
                                         ", status: " + coverResponse.getStatusCode());
                        failureCount++;
                    }

                    // Небольшая пауза между миграциями
                    Thread.sleep(100);

                } catch (Exception e) {
                    System.err.println("Error migrating cover for manga " + manga.getTitle() + ": " + e.getMessage());
                    failureCount++;
                }
            }

            System.out.println("Cover migration completed. Success: " + successCount + ", Failures: " + failureCount);

            return Map.of(
                "success", true,
                "message", "Cover migration completed",
                "totalManga", mangasToMigrate.size(),
                "successCount", successCount,
                "failureCount", failureCount
            );

        } catch (Exception e) {
            System.err.println("Error during cover migration: " + e.getMessage());
            e.printStackTrace();
            return Map.of(
                "success", false,
                "error", "Error during cover migration: " + e.getMessage()
            );
        }
    }

    // Недостающие методы для importChaptersWithProgress
    private void importChaptersWithProgress(String taskId, Long mangaId, List<Map<String, Object>> chapters, String filename) {
        ImportTaskService.ImportTask task = importTaskService.getTask(taskId);

        for (int i = 0; i < chapters.size(); i++) {
            Map<String, Object> chapterData = chapters.get(i);

            try {
                // Создаем запрос к ChapterService
                Map<String, Object> chapterRequest = new HashMap<>();
                chapterRequest.put("mangaId", mangaId);
                chapterRequest.put("chapterNumber", Integer.parseInt(chapterData.get("number").toString()));

                // Обрабаты��аем title - может быть null
                Object titleObj = chapterData.get("name");
                String title = titleObj != null ? titleObj.toString() : "Глава " + chapterData.get("number");
                chapterRequest.put("title", title);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(chapterRequest, headers);

                ResponseEntity<Map> response = restTemplate.postForEntity(
                    "http://chapter-service:8082/api/chapters",
                    entity,
                    Map.class
                );

                if (response.getStatusCode().is2xxSuccessful()) {
                    Long chapterId = Long.parseLong(response.getBody().get("id").toString());

                    // Импортируем страницы из MelonService
                    List<Map<String, Object>> slides = (List<Map<String, Object>>) chapterData.get("slides");
                    task.setStatus(ImportTaskService.TaskStatus.IMPORTING_PAGES);
                    importChapterPagesFromMelonService(taskId, chapterId, slides, filename, chapterData.get("number").toString());

                    // Обновляем прогресс
                    importTaskService.incrementImportedChapters(taskId);

                    // Устанавли��аем прогресс от 20% до 95%
                    int progress = 20 + (75 * (i + 1)) / chapters.size();
                    task.setProgress(progress);
                }

            } catch (Exception e) {
                System.err.println("Ошибка импорта главы " + chapterData.get("number") + ": " + e.getMessage());
            }
        }
    }

    /**
     * Импортирует страницы главы из MelonService через HTTP API
     */
    private void importChapterPagesFromMelonService(String taskId, Long chapterId, List<Map<String, Object>> slides,
                                                   String mangaFilename, String chapterNumber) {
        if (slides == null || slides.isEmpty()) {
            return;
        }

        // Сортируем страницы по индексу для гарантии правильного порядка
        slides.sort((slide1, slide2) -> {
            Integer index1 = Integer.parseInt(slide1.get("index").toString());
            Integer index2 = Integer.parseInt(slide2.get("index").toString());
            return index1.compareTo(index2);
        });

        // Импортируем страницы последовательно через HTTP API MelonService
        for (Map<String, Object> slide : slides) {
            try {
                Integer pageIndex = Integer.parseInt(slide.get("index").toString());

                // Формируем URL изображения в MelonService
                String imageUrl = String.format("%s/images/%s/%s/%d",
                    melonServiceUrl, mangaFilename, chapterNumber, pageIndex);

                // Создае�� запрос к ImageStorageService для импорта изображения по URL
                Map<String, Object> pageRequest = new HashMap<>();
                pageRequest.put("chapterId", chapterId);
                pageRequest.put("pageNumber", pageIndex);
                pageRequest.put("imageUrl", imageUrl);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(pageRequest, headers);

                // Синхронный запрос для сохранения порядка страниц
                ResponseEntity<Map> response = restTemplate.postForEntity(
                    "http://image-storage-service:8083/api/images/upload-from-url",
                    entity,
                    Map.class
                );

                // Проверяем успешность импорта страницы
                if (response.getStatusCode().is2xxSuccessful()) {
                    importTaskService.incrementImportedPages(taskId);

                    // Небольшая пауза между страницами для стабильности
                    Thread.sleep(50);
                } else {
                    System.err.println("Ошибка импорта страницы " + pageIndex + " для главы " + chapterId + ": HTTP " + response.getStatusCode());
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                System.err.println("Импорт страниц был прерван для главы " + chapterId);
                break;
            } catch (Exception e) {
                System.err.println("Ошибка импорта страницы для главы " + chapterId + ": " + e.getMessage());
                // Продолжаем импорт следующих страниц несмотря на ошибку
            }
        }
    }
}
