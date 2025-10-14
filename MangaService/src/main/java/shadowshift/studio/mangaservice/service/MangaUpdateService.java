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

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
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
    private static final List<String> PAID_FLAG_KEYS = Arrays.asList(
        "is_paid",
        "isPaid",
        "paid",
        "is_paid_chapter",
        "locked",
        "is_locked"
    );

    private static final int MAX_TASK_LOGS = 1_000;
    private static final DateTimeFormatter LOG_TIMESTAMP_FORMATTER =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSX").withZone(ZoneOffset.UTC);

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
    task.updatedMangas.clear();
    task.failedMangas.clear();
        task.newChaptersCount = 0;
        task.message = "Подготовка к обновлению...";
        task.progress = 0;
        task.startTime = new Date();
        task.updatedSlugs.clear();
        task.updatedDetails.clear();
        task.logs.clear();

        appendLog(task, String.format("Старт автообновления: найдено %d манг с доступным melonSlug", task.totalMangas));

        updateTasks.put(taskId, task);

        // Запускаем асинхронную обработку
        processAutoUpdateAsync(taskId, mangaList);

        Map<String, Object> response = new HashMap<>();
        response.put("task_id", taskId);
        response.put("status", "pending");
        response.put("total_mangas", mangaList.size());
        response.put("message", "Автообновление запущено");
        response.put("progress", task.progress);
        response.put("processed_mangas", task.processedMangas);
        response.put("new_chapters_count", task.newChaptersCount);
        response.put("updated_mangas", Collections.emptyList());
        response.put("failed_mangas", Collections.emptyList());
        response.put("mangas_with_updates", 0);
        response.put("updated_slugs", Collections.emptyList());
        response.put("updated_details", Collections.emptyList());
        response.put("start_time", task.startTime);
        synchronized (task.logs) {
            response.put("logs", new ArrayList<>(task.logs));
        }
        return response;
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
        result.put("new_chapters_count", task.newChaptersCount);
        result.put("start_time", task.startTime);

        List<String> updatedMangasSnapshot;
        synchronized (task.updatedMangas) {
            updatedMangasSnapshot = new ArrayList<>(task.updatedMangas);
        }
        result.put("updated_mangas", updatedMangasSnapshot);

        List<String> failedMangasSnapshot;
        synchronized (task.failedMangas) {
            failedMangasSnapshot = new ArrayList<>(task.failedMangas);
        }
        result.put("failed_mangas", failedMangasSnapshot);

        List<String> updatedSlugsSnapshot;
        synchronized (task.updatedSlugs) {
            updatedSlugsSnapshot = new ArrayList<>(task.updatedSlugs);
        }
        result.put("updated_slugs", updatedSlugsSnapshot);

        List<Map<String, Object>> updatedDetailsSnapshot;
        synchronized (task.updatedDetails) {
            updatedDetailsSnapshot = task.updatedDetails.stream()
                .map(record -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("slug", record.slug());
                    if (record.title() != null) {
                        detail.put("title", record.title());
                    }
                    detail.put("new_chapters", record.newChapters());
                    detail.put("chapter_labels", new ArrayList<>(record.chapterLabels()));
                    detail.put("chapter_numbers", new ArrayList<>(record.normalizedChapterNumbers()));
                    return detail;
                })
                .collect(Collectors.toList());
        }
        result.put("updated_details", updatedDetailsSnapshot);
        result.put("mangas_with_updates", updatedDetailsSnapshot.size());

        synchronized (task.logs) {
            result.put("logs", new ArrayList<>(task.logs));
        }

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
        appendLog(task, String.format("Запущена задача автообновления. Всего манг для проверки: %d", mangaList.size()));

        try {
            logger.info("Начало проверки обновлений для {} манг", mangaList.size());

            if (mangaList.isEmpty()) {
                appendLog(task, "Список манг пуст. Завершение задачи без обновлений.");
            }

            for (int i = 0; i < mangaList.size(); i++) {
                Manga manga = mangaList.get(i);
                String slug = manga.getMelonSlug();
                if (slug == null || slug.isBlank()) {
                    String titleFallback = Optional.ofNullable(manga.getTitle()).orElse("Без названия");
                    appendLog(task, String.format("[%d/%d] Пропуск манги '%s': отсутствует slug", i + 1, mangaList.size(), titleFallback));
                    task.failedMangas.add(String.format("(slug отсутствует) — %s", titleFallback));
                    continue;
                }

                String title = Optional.ofNullable(manga.getTitle()).orElse("Без названия");
                String displayName = String.format("%s — %s", slug, title);

                appendLog(task, String.format("[%d/%d] Старт проверки: %s", i + 1, mangaList.size(), displayName));

                try {
                    task.message = String.format("Проверка манги %d/%d: %s", i + 1, mangaList.size(), title);
                    logger.info("Проверка обновлений для манги: {} (slug: {})", title, slug);

                    // Получаем существующие главы из нашей системы
                    Set<Double> existingChapterNumbers = getExistingChapterNumbers(manga.getId());
                    logger.info("Найдено {} существующих глав для манги {}", existingChapterNumbers.size(), title);
                    appendLog(task, String.format("[%d/%d] %s: найдено %d глав в базе", i + 1, mangaList.size(), displayName, existingChapterNumbers.size()));

                    // Запрашиваем обновленную информацию у Melon
                    Map<String, Object> updateInfo = checkForUpdates(slug, existingChapterNumbers);

                    if (updateInfo == null) {
                        appendLog(task, String.format("[%d/%d] %s: не удалось получить данные об обновлениях", i + 1, mangaList.size(), displayName));
                    } else if (!Boolean.TRUE.equals(updateInfo.getOrDefault("has_updates", false))) {
                        appendLog(task, String.format("[%d/%d] %s: новых глав не найдено", i + 1, mangaList.size(), displayName));
                    } else {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> newChapters = (List<Map<String, Object>>) updateInfo.get("new_chapters");
                        @SuppressWarnings("unchecked")
                        Map<String, Object> mangaInfoFromUpdate = (Map<String, Object>) updateInfo.get("manga_info");

                        if (newChapters == null || newChapters.isEmpty()) {
                            appendLog(task, String.format("[%d/%d] %s: новые главы отсутствуют после фильтрации (вероятно платные)", i + 1, mangaList.size(), displayName));
                        } else {
                            List<String> chapterLabels = extractChapterLabels(newChapters);
                            List<Double> normalizedNumbers = extractNormalizedChapterNumbers(newChapters);

                            logger.info("Найдено {} новых глав для манги {}", newChapters.size(), title);
                            appendLog(task, String.format("[%d/%d] %s: обнаружено %d новых глав", i + 1, mangaList.size(), displayName, newChapters.size()));
                            if (!chapterLabels.isEmpty()) {
                                appendLog(task, String.format("[%d/%d] %s: главы -> %s", i + 1, mangaList.size(), displayName, String.join(", ", chapterLabels)));
                            }

                            // Импортируем только новые главы (парсинг уже выполнен)
                            boolean success = parseAndImportNewChapters(slug, manga.getId(), newChapters, mangaInfoFromUpdate);

                            if (success) {
                                UpdatedMangaRecord record = new UpdatedMangaRecord(slug, title, newChapters.size(), chapterLabels, normalizedNumbers);
                                task.updatedMangas.add(formatUpdatedMangaDisplay(record));
                                task.updatedSlugs.add(slug);
                                task.updatedDetails.add(record);
                                task.newChaptersCount += newChapters.size();

                                logger.info("Успешно обновлена манга {}: добавлено {} глав", title, newChapters.size());
                                appendLog(task, String.format("[%d/%d] %s: импортировано %d глав", i + 1, mangaList.size(), displayName, newChapters.size()));

                                try {
                                    melonService.deleteManga(slug);
                                    appendLog(task, String.format("[%d/%d] %s: временные данные Melon удалены", i + 1, mangaList.size(), displayName));
                                } catch (Exception cleanupEx) {
                                    logger.warn("Не удалось удалить данные из Melon для slug {}: {}", slug, cleanupEx.getMessage());
                                    appendLog(task, String.format("[%d/%d] %s: не удалось удалить данные Melon: %s", i + 1, mangaList.size(), displayName, cleanupEx.getMessage()));
                                }
                            } else {
                                logger.error("Не удалось обновить мангу {}", title);
                                task.failedMangas.add(displayName);
                                appendLog(task, String.format("[%d/%d] %s: ошибка импорта новых глав", i + 1, mangaList.size(), displayName));
                            }
                        }
                    }

                } catch (Exception e) {
                    logger.error("Ошибка обработки манги '{}': {}", title, e.getMessage(), e);
                    task.failedMangas.add(displayName);
                    appendLog(task, String.format("[%d/%d] %s: ошибка обработки — %s", i + 1, mangaList.size(), displayName, e.getMessage()));
                }

                task.processedMangas++;
                task.progress = task.totalMangas == 0 ? 100 : (task.processedMangas * 100) / task.totalMangas;
                task.message = String.format("Обработано: %d/%d (обновлено тайтлов: %d, новых глав: %d)",
                    task.processedMangas, task.totalMangas, task.updatedDetails.size(), task.newChaptersCount);

                appendLog(task, String.format(
                    "Прогресс: %d/%d | тайтлы с обновлениями: %d | новых глав: %d",
                    task.processedMangas,
                    task.totalMangas,
                    task.updatedDetails.size(),
                    task.newChaptersCount
                ));
            }

            task.status = "completed";
            task.progress = 100;
            task.endTime = new Date();
            task.message = String.format("Автообновление завершено. Тайтлов с обновлениями: %d, добавлено глав: %d, ошибок: %d",
                task.updatedDetails.size(), task.newChaptersCount, task.failedMangas.size());

            logger.info("Автообновление завершено. Результаты: обновлено={}, новых глав={}, ошибок={}",
                task.updatedDetails.size(), task.newChaptersCount, task.failedMangas.size());

            List<String> finalSlugs;
            synchronized (task.updatedSlugs) {
                finalSlugs = new ArrayList<>(task.updatedSlugs);
            }

            String summarySlugs = finalSlugs.isEmpty() ? "нет" : String.join(", ", finalSlugs);
            appendLog(task, String.format(
                "Завершено. Тайтлов с обновлениями: %d (%s). Новых глав: %d. Ошибок: %d.",
                task.updatedDetails.size(),
                summarySlugs,
                task.newChaptersCount,
                task.failedMangas.size()
            ));

        } catch (Exception e) {
            task.status = "failed";
            task.endTime = new Date();
            task.message = "Критическая ошибка автообновления: " + e.getMessage();
            logger.error("Критическая ошибка автообновления", e);
            appendLog(task, "Критическая ошибка автообновления: " + e.getMessage());
        }

        return CompletableFuture.completedFuture(null);
    }

    /**
     * Получает номера существующих глав из ChapterService
     */
    private Set<Double> getExistingChapterNumbers(Long mangaId) {
        try {
            String url = chapterServiceUrl + "/api/chapters/manga/" + mangaId;
            @SuppressWarnings("rawtypes")
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

                    if (isChapterPaid(chapterMeta)) {
                        logger.debug("Глава {} (том {}) отмечена как платная, пропускаем при проверке обновлений", numberObj, volumeObj);
                        continue;
                    }
                    
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
                        
                        if (isChapterPaid(chapter)) {
                            logger.debug("Глава {} (том {}) отмечена как платная, пропускаем при импорте", numberObj, volumeObj);
                            continue;
                        }

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
                        if (isChapterPaid(chapter)) {
                            logger.debug("Глава {} пропущена при импорте новых глав, так как она платная", numberObj);
                            continue;
                        }
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
                if (isChapterPaid(chapterData)) {
                    Object numberObj = chapterData.get("number");
                    logger.info("Глава {} помечена как платная, пропускаем импорт", numberObj);
                    continue;
                }
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

                @SuppressWarnings("rawtypes")
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
                    } else {
                        logger.warn("Пропускаем импорт страниц для главы {}: слайды отсутствуют (возможно, глава платная)", chapterNumber);
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

                        @SuppressWarnings("rawtypes")
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

    private boolean isChapterPaid(Map<String, Object> chapterData) {
        if (chapterData == null) {
            return false;
        }

        for (String key : PAID_FLAG_KEYS) {
            if (!chapterData.containsKey(key)) {
                continue;
            }

            Object value = chapterData.get(key);
            if (value == null) {
                continue;
            }

            if (value instanceof Boolean) {
                if ((Boolean) value) {
                    return true;
                }
            } else if (value instanceof Number) {
                if (((Number) value).intValue() != 0) {
                    return true;
                }
            } else {
                String strValue = value.toString().trim().toLowerCase(Locale.ROOT);
                if (strValue.equals("true") || strValue.equals("1") || strValue.equals("yes") || strValue.equals("paid")) {
                    return true;
                }
            }
        }

        return false;
    }

    private void appendLog(UpdateTask task, String message) {
        if (task == null || message == null) {
            return;
        }

        String timestamp = LOG_TIMESTAMP_FORMATTER.format(Instant.now());
        String line = "[" + timestamp + "] " + message;

        synchronized (task.logs) {
            task.logs.add(line);
            if (task.logs.size() > MAX_TASK_LOGS) {
                task.logs.remove(0);
            }
        }
    }

    private List<String> extractChapterLabels(List<Map<String, Object>> chapters) {
        if (chapters == null || chapters.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> labels = new ArrayList<>(chapters.size());
        for (Map<String, Object> chapter : chapters) {
            labels.add(buildChapterLabel(chapter));
        }
        return labels;
    }

    private List<Double> extractNormalizedChapterNumbers(List<Map<String, Object>> chapters) {
        if (chapters == null || chapters.isEmpty()) {
            return Collections.emptyList();
        }

        List<Double> numbers = new ArrayList<>(chapters.size());
        for (Map<String, Object> chapter : chapters) {
            Double normalized = computeNormalizedChapterNumber(chapter);
            if (normalized != null) {
                numbers.add(normalized);
            }
        }
        return numbers;
    }

    private Double computeNormalizedChapterNumber(Map<String, Object> chapter) {
        if (chapter == null) {
            return null;
        }

        try {
            Object volumeObj = chapter.get("volume");
            Object numberObj = chapter.get("number");

            int volume = volumeObj != null ? Integer.parseInt(volumeObj.toString()) : 1;
            double number = numberObj != null ? Double.parseDouble(numberObj.toString()) : 0d;

            return volume * 10000d + number;
        } catch (Exception ex) {
            return null;
        }
    }

    private String buildChapterLabel(Map<String, Object> chapter) {
        if (chapter == null) {
            return "глава ?";
        }

        Object numberObj = chapter.get("number");
        Object volumeObj = chapter.get("volume");

        String numberPart = numberObj != null ? numberObj.toString() : "?";
        String volumePart = volumeObj != null ? volumeObj.toString() : "1";

        return String.format("том %s глава %s", volumePart, numberPart);
    }

    private String formatUpdatedMangaDisplay(UpdatedMangaRecord record) {
        String safeTitle = record.title != null && !record.title.isBlank() ? record.title : "без названия";
        StringBuilder builder = new StringBuilder();
        builder.append(record.slug)
            .append(" — ")
            .append(safeTitle)
            .append(" (+")
            .append(record.newChapters)
            .append(" глав)");

        if (!record.chapterLabels.isEmpty()) {
            builder.append(" [").append(String.join(", ", record.chapterLabels)).append(']');
        }

        return builder.toString();
    }

    private record UpdatedMangaRecord(
        String slug,
        String title,
        int newChapters,
        List<String> chapterLabels,
        List<Double> normalizedChapterNumbers
    ) {
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
        List<String> updatedMangas = Collections.synchronizedList(new ArrayList<>());
        List<String> failedMangas = Collections.synchronizedList(new ArrayList<>());
        int newChaptersCount;
        Date startTime;
        Date endTime;
        final List<String> logs = Collections.synchronizedList(new ArrayList<>());
        final Set<String> updatedSlugs = Collections.synchronizedSet(new LinkedHashSet<>());
        final List<UpdatedMangaRecord> updatedDetails = Collections.synchronizedList(new ArrayList<>());
    }
}
