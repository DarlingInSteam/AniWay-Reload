package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Сервис для автоматического обновления манги.
 * Проверяет наличие новых глав у существующих манг и импортирует их.
 *
 * @author ShadowShiftStudio
 */
@Service
public class MangaUpdateService {

    private static final Logger logger = LoggerFactory.getLogger(MangaUpdateService.class);

    @Autowired
    private MangaRepository mangaRepository;

    @Autowired
    private MelonIntegrationService melonService;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${melon.service.url:http://melon-service:8084}")
    private String melonServiceUrl;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    // Хранилище задач обновления
    private final Map<String, UpdateTask> updateTasks = new HashMap<>();

    /**
     * Запускает автоматическое обновление всех манг в системе
     */
    public Map<String, Object> startAutoUpdate() {
        String taskId = UUID.randomUUID().toString();

        // Получаем все манги с melonSlug
        List<Manga> mangaList = mangaRepository.findAll().stream()
            .filter(m -> m.getMelonSlug() != null && !m.getMelonSlug().isEmpty())
            .collect(Collectors.toList());

        UpdateTask task = new UpdateTask();
        task.taskId = taskId;
        task.status = "pending";
        task.totalMangas = mangaList.size();
        task.processedMangas = 0;
        task.updatedMangas = new ArrayList<>();
        task.failedMangas = new ArrayList<>();
        task.newChaptersCount = 0;
        task.message = "Подготовка к обновлению...";
        task.progress = 0;
        task.startTime = new Date();

        updateTasks.put(taskId, task);

        // Запускаем асинхронную обработку
        processAutoUpdateAsync(taskId, mangaList);

        return Map.of(
            "task_id", taskId,
            "status", "pending",
            "total_mangas", mangaList.size(),
            "message", "Автообновление запущено"
        );
    }

    /**
     * Получает статус задачи обновления
     */
    public Map<String, Object> getUpdateTaskStatus(String taskId) {
        UpdateTask task = updateTasks.get(taskId);
        if (task == null) {
            return Map.of("error", "Задача не найдена");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", task.taskId);
        result.put("status", task.status);
        result.put("progress", task.progress);
        result.put("message", task.message);
        result.put("total_mangas", task.totalMangas);
        result.put("processed_mangas", task.processedMangas);
        result.put("updated_mangas", task.updatedMangas);
        result.put("failed_mangas", task.failedMangas);
        result.put("new_chapters_count", task.newChaptersCount);
        result.put("start_time", task.startTime);

        if (task.endTime != null) {
            result.put("end_time", task.endTime);
        }

        return result;
    }

    /**
     * Асинхронная обработка обновления манг
     */
    @Async
    public CompletableFuture<Void> processAutoUpdateAsync(String taskId, List<Manga> mangaList) {
        UpdateTask task = updateTasks.get(taskId);
        task.status = "running";
        task.message = "Проверка обновлений для манг...";

        try {
            logger.info("Начало проверки обновлений для {} манг", mangaList.size());

            for (int i = 0; i < mangaList.size(); i++) {
                Manga manga = mangaList.get(i);
                String slug = manga.getMelonSlug();

                try {
                    task.message = String.format("Проверка манги %d/%d: %s", i + 1, mangaList.size(), manga.getTitle());
                    logger.info("Проверка обновлений для манги: {} (slug: {})", manga.getTitle(), slug);

                    // Получаем существующие главы из нашей системы
                    Set<Double> existingChapterNumbers = getExistingChapterNumbers(manga.getId());
                    logger.info("Найдено {} существующих глав для манги {}", existingChapterNumbers.size(), manga.getTitle());

                    // Запрашиваем обновленную информацию у Melon
                    Map<String, Object> updateInfo = checkForUpdates(slug, existingChapterNumbers);

                    if (updateInfo != null && (Boolean) updateInfo.getOrDefault("has_updates", false)) {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> newChapters = (List<Map<String, Object>>) updateInfo.get("new_chapters");
                        @SuppressWarnings("unchecked")
                        Map<String, Object> mangaInfoFromUpdate = (Map<String, Object>) updateInfo.get("manga_info");

                        if (newChapters != null && !newChapters.isEmpty()) {
                            logger.info("Найдено {} новых глав для манги {}", newChapters.size(), manga.getTitle());
                            
                            // Импортируем только новые главы (парсинг уже выполнен)
                            boolean success = parseAndImportNewChapters(slug, manga.getId(), newChapters, mangaInfoFromUpdate);

                            if (success) {
                                task.updatedMangas.add(manga.getTitle());
                                task.newChaptersCount += newChapters.size();
                                logger.info("Успешно обновлена манга {}: добавлено {} глав", manga.getTitle(), newChapters.size());

                                // Удаляем из Melon после импорта
                                melonService.deleteManga(slug);
                            } else {
                                logger.error("Не удалось обновить мангу {}", manga.getTitle());
                                task.failedMangas.add(manga.getTitle());
                            }
                        }
                    } else {
                        logger.info("Новых глав не найдено для манги {}", manga.getTitle());
                    }

                } catch (Exception e) {
                    logger.error("Ошибка обработки манги '{}': {}", manga.getTitle(), e.getMessage(), e);
                    task.failedMangas.add(manga.getTitle());
                }

                task.processedMangas++;
                task.progress = (task.processedMangas * 100) / task.totalMangas;
                task.message = String.format("Обработано: %d/%d (обновлено: %d, новых глав: %d)",
                    task.processedMangas, task.totalMangas, task.updatedMangas.size(), task.newChaptersCount);
            }

            task.status = "completed";
            task.progress = 100;
            task.endTime = new Date();
            task.message = String.format("Автообновление завершено. Обновлено манг: %d, добавлено глав: %d, ошибок: %d",
                task.updatedMangas.size(), task.newChaptersCount, task.failedMangas.size());

            logger.info("Автообновление завершено. Результаты: обновлено={}, новых глав={}, ошибок={}",
                task.updatedMangas.size(), task.newChaptersCount, task.failedMangas.size());

        } catch (Exception e) {
            task.status = "failed";
            task.endTime = new Date();
            task.message = "Критическая ошибка автообновления: " + e.getMessage();
            logger.error("Критическая ошибка автообновления", e);
        }

        return CompletableFuture.completedFuture(null);
    }

    /**
     * Получает номера существующих глав из ChapterService
     */
    private Set<Double> getExistingChapterNumbers(Long mangaId) {
        try {
            String url = chapterServiceUrl + "/api/chapters/manga/" + mangaId;
            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> chapters = (List<Map<String, Object>>) response.getBody();
                
                return chapters.stream()
                    .map(ch -> {
                        Object chapterNumberObj = ch.get("chapterNumber");
                        if (chapterNumberObj instanceof Number) {
                            return ((Number) chapterNumberObj).doubleValue();
                        }
                        return null;
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            }
        } catch (Exception e) {
            logger.error("Ошибка получения существующих глав для манги {}: {}", mangaId, e.getMessage());
        }

        return new HashSet<>();
    }

    /**
     * Проверяет наличие обновлений через парсинг и сравнение глав
     */
    private Map<String, Object> checkForUpdates(String slug, Set<Double> existingChapterNumbers) {
        try {
            // ОПТИМИЗАЦИЯ: Сначала получаем ТОЛЬКО метаданные глав (БЕЗ ПАРСИНГА!)
            logger.info("Получение метаданных глав для slug: {}", slug);
            Map<String, Object> metadata = melonService.getChaptersMetadataOnly(slug);
            
            // Проверяем успешность получения метаданных
            if (metadata == null || !Boolean.TRUE.equals(metadata.get("success"))) {
                logger.error("Не удалось получить метаданные для slug '{}': {}", 
                    slug, metadata != null ? metadata.get("error") : "Unknown error");
                return null;
            }
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> allChaptersMetadata = 
                (List<Map<String, Object>>) metadata.get("chapters");
            
            if (allChaptersMetadata == null || allChaptersMetadata.isEmpty()) {
                logger.warn("Не найдено глав в метаданных для slug: {}", slug);
                return Map.of(
                    "has_updates", false,
                    "new_chapters", List.of()
                );
            }
            
            // Фильтруем ТОЛЬКО новые главы по метаданным
            List<Map<String, Object>> newChaptersMetadata = new ArrayList<>();
            
            for (Map<String, Object> chapterMeta : allChaptersMetadata) {
                try {
                    Object volumeObj = chapterMeta.get("volume");
                    Object numberObj = chapterMeta.get("number");
                    
                    int volume = volumeObj != null ? Integer.parseInt(volumeObj.toString()) : 1;
                    double number = Double.parseDouble(numberObj.toString());
                    double chapterNum = volume * 10000 + number;
                    
                    // Проверяем, является ли глава новой
                    if (!existingChapterNumbers.contains(chapterNum)) {
                        newChaptersMetadata.add(chapterMeta);
                    }
                } catch (Exception e) {
                    logger.warn("Ошибка обработки метаданных главы: {}", e.getMessage());
                }
            }
            
            // КРИТИЧНО: Если нет новых глав - возвращаем сразу (БЕЗ ПАРСИНГА!)
            if (newChaptersMetadata.isEmpty()) {
                logger.info("Новых глав не найдено для slug: {} (проверено {} глав)", 
                    slug, allChaptersMetadata.size());
                return Map.of(
                    "has_updates", false,
                    "new_chapters", List.of()
                );
            }
            
            logger.info("Найдено {} новых глав для slug: {}, запускаем полный парсинг...", 
                newChaptersMetadata.size(), slug);
            
            // ТОЛЬКО если есть новые главы - запускаем полный парсинг
            // Это даст нам информацию о страницах для новых глав
            Map<String, Object> parseResult = melonService.startParsing(slug);
            
            if (parseResult == null || !parseResult.containsKey("task_id")) {
                logger.error("Не удалось запустить парсинг для slug: {}", slug);
                return null;
            }
            
            String taskId = (String) parseResult.get("task_id");
            
            // Ждем завершения парсинга
            if (!waitForTaskCompletion(taskId)) {
                logger.error("Парсинг не завершен для slug: {}", slug);
                return null;
            }
            
            // Получаем полную информацию о манге после парсинга
            Map<String, Object> mangaInfo = melonService.getMangaInfo(slug);
            
            if (mangaInfo == null || !mangaInfo.containsKey("content")) {
                logger.error("Не удалось получить информацию о манге для slug: {}", slug);
                return null;
            }
            
            // Собираем полные данные о новых главах из спаршенной информации
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) mangaInfo.get("content");
            
            List<Map<String, Object>> newChaptersWithSlides = new ArrayList<>();
            
            for (Map.Entry<String, Object> branchEntry : content.entrySet()) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> branchChapters = 
                    (List<Map<String, Object>>) branchEntry.getValue();
                
                for (Map<String, Object> chapter : branchChapters) {
                    try {
                        Object volumeObj = chapter.get("volume");
                        Object numberObj = chapter.get("number");
                        
                        int volume = volumeObj != null ? Integer.parseInt(volumeObj.toString()) : 1;
                        double number = Double.parseDouble(numberObj.toString());
                        double chapterNum = volume * 10000 + number;
                        
                        // Проверяем, является ли эта глава новой (улучшенное сравнение)
                        if (!existingChapterNumbers.contains(chapterNum)) {
                            newChaptersWithSlides.add(chapter);
                        }
                    } catch (Exception e) {
                        logger.warn("Ошибка обработки главы: {}", e.getMessage());
                    }
                }
            }
            
            logger.info("Найдено {} новых глав с данными о страницах для slug: {}", 
                newChaptersWithSlides.size(), slug);
            
            return Map.of(
                "has_updates", !newChaptersWithSlides.isEmpty(),
                "new_chapters", newChaptersWithSlides,
                "manga_info", mangaInfo
            );
            
        } catch (Exception e) {
            logger.error("Ошибка проверки обновлений для slug '{}': {}", slug, e.getMessage());
            return null;
        }
    }

    /**
     * Импортирует только новые главы (парсинг уже выполнен в checkForUpdates)
     */
    private boolean parseAndImportNewChapters(String slug, Long mangaId, List<Map<String, Object>> newChapters, Map<String, Object> mangaInfo) {
        try {
            logger.info("Импорт {} новых глав для манги {}", newChapters.size(), mangaId);
            
            // mangaInfo уже содержит все необходимые данные после парсинга
            // Импортируем только новые главы
            return importNewChaptersOnly(slug, mangaId, newChapters, mangaInfo);
            
        } catch (Exception e) {
            logger.error("Ошибка импорта новых глав: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Импортирует только новые главы в систему
     */
    private boolean importNewChaptersOnly(String slug, Long mangaId, List<Map<String, Object>> newChapters, Map<String, Object> mangaInfo) {
        try {
            if (mangaInfo == null || !mangaInfo.containsKey("content")) {
                logger.error("Не удалось получить информацию о манге из Melon");
                return false;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) mangaInfo.get("content");
            
            // Создаем список для новых глав
            List<Map<String, Object>> chaptersToImport = new ArrayList<>();
            
            // Проходим по всем веткам
            for (Map.Entry<String, Object> branchEntry : content.entrySet()) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> branchChapters = (List<Map<String, Object>>) branchEntry.getValue();
                
                // Фильтруем только новые главы
                for (Map<String, Object> chapter : branchChapters) {
                    Object numberObj = chapter.get("number");
                    if (numberObj != null) {
                        // Проверяем, является ли эта глава новой (улучшенное сравнение)
                        String chapterNumStr = String.valueOf(numberObj);
                        boolean isNewChapter = newChapters.stream()
                            .anyMatch(nc -> String.valueOf(nc.get("number")).equals(chapterNumStr));
                        
                        if (isNewChapter) {
                            chaptersToImport.add(chapter);
                        }
                    }
                }
            }

            logger.info("Будет импортировано {} новых глав", chaptersToImport.size());

            // Используем существующий метод импорта глав из MelonIntegrationService
            // но передаем только отфильтрованные главы
            return importChaptersDirectly(mangaId, chaptersToImport, slug);

        } catch (Exception e) {
            logger.error("Ошибка импорта новых глав: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Импортирует главы напрямую, используя логику из MelonIntegrationService
     */
    private boolean importChaptersDirectly(Long mangaId, List<Map<String, Object>> chapters, String filename) {
        // Здесь используем ту же логику, что и в MelonIntegrationService.importChaptersWithProgress
        // но без создания задачи импорта
        
        try {
            for (Map<String, Object> chapterData : chapters) {
                // Получаем номер главы
                Object volumeObj = chapterData.get("volume");
                Object numberObj = chapterData.get("number");
                
                double chapterNumber;
                int volume = 1;
                double originalNumber = 1;
                
                try {
                    volume = volumeObj != null ? Integer.parseInt(volumeObj.toString()) : 1;
                    originalNumber = Double.parseDouble(numberObj.toString());
                    chapterNumber = volume * 10000 + originalNumber;
                } catch (NumberFormatException e) {
                    logger.warn("Не удалось распарсить номер главы: {}", numberObj);
                    continue;
                }

                // Проверяем, существует ли уже эта глава
                if (chapterExists(mangaId, chapterNumber)) {
                    logger.info("Глава {} уже существует для манги {}, пропускаем", chapterNumber, mangaId);
                    continue;
                }

                // Создаем запрос к ChapterService
                Map<String, Object> chapterRequest = new HashMap<>();
                chapterRequest.put("mangaId", mangaId);
                chapterRequest.put("chapterNumber", chapterNumber);
                chapterRequest.put("volumeNumber", volume);
                chapterRequest.put("originalChapterNumber", originalNumber);

                Object titleObj = chapterData.get("name");
                String title = (titleObj != null && !titleObj.toString().trim().isEmpty()) 
                    ? titleObj.toString().trim() 
                    : "Глава " + numberObj;
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

                    // Импортируем страницы
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> slides = (List<Map<String, Object>>) chapterData.get("slides");
                    if (slides != null && !slides.isEmpty()) {
                        importChapterPages(chapterId, slides, filename, numberObj.toString());
                    }

                    logger.info("Успешно импортирована глава {} для манги {}", chapterNumber, mangaId);
                } else {
                    logger.error("Не удалось создать главу {}: {}", chapterNumber, response.getStatusCode());
                    return false;
                }
            }

            return true;
        } catch (Exception e) {
            logger.error("Ошибка прямого импорта глав: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Проверяет существование главы
     */
    private boolean chapterExists(Long mangaId, double chapterNumber) {
        try {
            String url = String.format("%s/api/chapters/exists?mangaId=%d&chapterNumber=%f", 
                chapterServiceUrl, mangaId, chapterNumber);
            ResponseEntity<Boolean> response = restTemplate.getForEntity(url, Boolean.class);
            return response.getBody() != null && response.getBody();
        } catch (Exception e) {
            logger.warn("Ошибка проверки существования главы: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Импортирует страницы главы из Melon Service в ImageStorageService
     * Копия логики из MelonIntegrationService.importChapterPagesFromMelonService
     */
    private void importChapterPages(Long chapterId, List<Map<String, Object>> slides, 
                                   String mangaFilename, String originalChapterName) {
        try {
            logger.info("Начинается импорт {} страниц для главы {}", slides.size(), chapterId);

            for (int i = 0; i < slides.size(); i++) {
                final int pageNumber = i;
                
                // Формируем имя файла в Melon Service (используя правило: глава/номер_страницы.jpg)
                String melonImagePath = String.format("%s/%s/%d.jpg", 
                    mangaFilename, originalChapterName, pageNumber);

                // URL для загрузки изображения из Melon Service
                String imageUrl = melonServiceUrl + "/images/" + melonImagePath;

                try {
                    // Получаем изображение из Melon
                    ResponseEntity<byte[]> imageResponse = restTemplate.getForEntity(imageUrl, byte[].class);

                    if (imageResponse.getStatusCode().is2xxSuccessful() && imageResponse.getBody() != null) {
                        byte[] imageData = imageResponse.getBody();

                        // Подготовка для отправки в ImageStorageService
                        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                        body.add("file", new ByteArrayResource(imageData) {
                            @Override
                            public String getFilename() {
                                return pageNumber + ".jpg";
                            }
                        });
                        body.add("pageNumber", pageNumber);
                        body.add("chapterId", chapterId);

                        HttpHeaders uploadHeaders = new HttpHeaders();
                        uploadHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

                        String uploadUrl = "http://image-storage-service:8086/api/storage/upload-page";
                        HttpEntity<MultiValueMap<String, Object>> uploadEntity = new HttpEntity<>(body, uploadHeaders);

                        ResponseEntity<Map> uploadResponse = restTemplate.postForEntity(
                            uploadUrl, uploadEntity, Map.class);

                        if (uploadResponse.getStatusCode().is2xxSuccessful()) {
                            logger.debug("Страница {} успешно загружена для главы {}", pageNumber, chapterId);
                        } else {
                            logger.error("Не удалось загрузить страницу {} для главы {}: {}",
                                pageNumber, chapterId, uploadResponse.getStatusCode());
                        }
                    } else {
                        logger.error("Не удалось получить изображение из Melon: {}", imageResponse.getStatusCode());
                    }

                } catch (Exception e) {
                    logger.error("Ошибка загрузки страницы {} для главы {}: {}", 
                        pageNumber, chapterId, e.getMessage());
                }
            }

            logger.info("Завершен импорт страниц для главы {}", chapterId);

        } catch (Exception e) {
            logger.error("Ошибка импорта страниц для главы {}: {}", chapterId, e.getMessage(), e);
        }
    }

    /**
     * Ждет завершения задачи
     */
    private boolean waitForTaskCompletion(String taskId) throws InterruptedException {
        int maxAttempts = 60;
        int attempts = 0;

        while (attempts < maxAttempts) {
            Thread.sleep(2000);
            
            Map<String, Object> status = melonService.getTaskStatus(taskId);
            
            if (status != null && "completed".equals(status.get("status"))) {
                return true;
            }
            
            if (status != null && "failed".equals(status.get("status"))) {
                logger.error("Задача завершилась с ошибкой: {}", status.get("message"));
                return false;
            }
            
            attempts++;
        }

        logger.error("Превышено время ожидания завершения задачи");
        return false;
    }

    /**
     * Внутренний класс для отслеживания задачи обновления
     */
    private static class UpdateTask {
        String taskId;
        String status;
        int progress;
        String message;
        int totalMangas;
        int processedMangas;
        List<String> updatedMangas;
        List<String> failedMangas;
        int newChaptersCount;
        Date startTime;
        Date endTime;
    }
}
