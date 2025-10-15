package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import shadowshift.studio.mangaservice.repository.MangaRepository;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CompletableFuture;

/**
 * Сервис для автоматического парсинга манги.
 * Обрабатывает список slug'ов, проверяет на дубликаты и импортирует только новые манги.
 *
 * @author ShadowShiftStudio
 */
@Service
public class AutoParsingService {

    private static final Logger logger = LoggerFactory.getLogger(AutoParsingService.class);
    private static final Duration FULL_PARSING_POLL_INTERVAL = Duration.ofSeconds(2);
    private static final int MAX_MISSING_FULL_STATUS_ATTEMPTS = 30;
    private static final int MAX_TASK_LOGS = 1_000;
    private static final DateTimeFormatter LOG_TIMESTAMP_FORMATTER =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSX").withZone(ZoneOffset.UTC);

    @Autowired
    private MelonIntegrationService melonService;

    @Autowired
    private MangaRepository mangaRepository;

    @Autowired
    private ApplicationContext applicationContext;

    // Хранилище задач автопарсинга
    private final ConcurrentMap<String, AutoParseTask> autoParsingTasks = new ConcurrentHashMap<>();
    
    // Маппинг parseTaskId (ID парсинга одной манги) -> autoParsingTaskId (ID задачи автопарсинга)
    // Необходим для связывания логов от MelonService с задачей автопарсинга
    private final ConcurrentMap<String, String> parseTaskToAutoParseTask = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Set<String>> autoParsingChildTaskIds = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, List<String>> pendingChildTaskLogs = new ConcurrentHashMap<>();

    void setMelonServiceForTesting(MelonIntegrationService melonService) {
        this.melonService = melonService;
    }

    /**
     * Запускает автоматический парсинг манг из каталога MangaLib по номеру страницы
     * 
     * @param page номер страницы каталога
     * @param limit максимальное количество манг для парсинга (null = все с страницы)
     * @return информация о запущенной задаче
     */
    public Map<String, Object> startAutoParsing(Integer page, Integer limit, Integer minChapters, Integer maxChapters) {
        String taskId = UUID.randomUUID().toString();

        AutoParseTask task = new AutoParseTask();
        task.taskId = taskId;
        task.status = "pending";
        task.totalSlugs = 0;
        task.processedSlugs = 0;
    task.skippedSlugs = new ArrayList<>();
    task.importedSlugs = new ArrayList<>();
    task.failedSlugs = new ArrayList<>();
    task.logs = Collections.synchronizedList(new ArrayList<>());  // Инициализация списка логов
    task.mangaMetrics = Collections.synchronizedList(new ArrayList<>());
        task.message = "Получение списка манг из каталога...";
        task.progress = 0;
        task.startTime = new Date();
        task.page = page != null ? page : 1;
        task.limit = limit;
        task.minChapters = minChapters;
        task.maxChapters = maxChapters;

    autoParsingTasks.put(taskId, task);
    autoParsingChildTaskIds.put(taskId, ConcurrentHashMap.newKeySet());

        appendLog(task, String.format(
            "Старт автопарсинга: страница %d, лимит: %s, минимум глав: %s, максимум глав: %s",
            task.page,
            limit != null ? limit : "все",
            minChapters != null ? minChapters : "—",
            maxChapters != null ? maxChapters : "—"
        ));

        // Запускаем асинхронную обработку через Spring proxy для поддержки @Async
        // (self-invocation не работает с @Async)
        AutoParsingService proxy = applicationContext.getBean(AutoParsingService.class);
        proxy.processAutoParsingAsync(taskId, task.page, limit);

        Map<String, Object> response = new HashMap<>();
        response.put("task_id", taskId);
        response.put("status", "pending");
        response.put("page", task.page);
        response.put("limit", limit != null ? limit : "all");
        response.put("message", "Автопарсинг запущен");
        if (minChapters != null) {
            response.put("min_chapters", minChapters);
        }
        if (maxChapters != null) {
            response.put("max_chapters", maxChapters);
        }

        return response;
    }

    /**
     * Получает статус задачи автопарсинга
     */
    public Map<String, Object> getAutoParseTaskStatus(String taskId) {
        AutoParseTask task = autoParsingTasks.get(taskId);
        if (task == null) {
            return Map.of("error", "Задача не найдена");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", task.taskId);
        result.put("status", task.status);
        result.put("progress", task.progress);
        result.put("message", task.message);
        result.put("total_slugs", task.totalSlugs);
        result.put("processed_slugs", task.processedSlugs);
        result.put("skipped_slugs", task.skippedSlugs);
        result.put("imported_slugs", task.importedSlugs);
        result.put("failed_slugs", task.failedSlugs);

        List<String> logsSnapshot;
        if (task.logs != null) {
            synchronized (task.logs) {
                logsSnapshot = new ArrayList<>(task.logs);
            }
        } else {
            logsSnapshot = Collections.emptyList();
        }
        result.put("logs", logsSnapshot);  // Добавляем логи в ответ
        result.put("start_time", task.startTime);
        result.put("page", task.page);
        if (task.limit != null) {
            result.put("limit", task.limit);
        }
        if (task.minChapters != null) {
            result.put("min_chapters", task.minChapters);
        }
        if (task.maxChapters != null) {
            result.put("max_chapters", task.maxChapters);
        }
        
        if (task.endTime != null) {
            result.put("end_time", task.endTime);
        }

        long currentTime = task.endTime != null ? task.endTime.getTime() : System.currentTimeMillis();
        long durationMs = Math.max(0, currentTime - task.startTime.getTime());
        result.put("duration_ms", durationMs);
        result.put("duration_formatted", formatDuration(durationMs));

        if (task.mangaMetrics != null) {
            synchronized (task.mangaMetrics) {
                result.put("manga_metrics", new ArrayList<>(task.mangaMetrics));
            }
        } else {
            result.put("manga_metrics", Collections.emptyList());
        }

        return result;
    }

    /**
     * Отменяет задачу автопарсинга
     */
    public Map<String, Object> cancelAutoParseTask(String taskId) {
        AutoParseTask task = autoParsingTasks.get(taskId);
        if (task == null) {
            return Map.of("error", "Задача не найдена");
        }

        if ("completed".equals(task.status) || "failed".equals(task.status) || "cancelled".equals(task.status)) {
            return Map.of(
                "cancelled", false,
                "status", task.status,
                "message", "Задача уже завершена"
            );
        }

        task.status = "cancelled";
        task.endTime = new Date();
        task.message = "Задача отменена пользователем";
    appendLog(task, "Задача автопарсинга отменена пользователем");
        
        logger.info("Задача автопарсинга {} отменена пользователем", taskId);
        
        // Пытаемся отменить связанные задачи в MelonService
        // Находим все связанные taskId и пытаемся их отменить
        Set<String> childTaskIds = autoParsingChildTaskIds.getOrDefault(taskId, Collections.emptySet());
        for (String childTaskId : new ArrayList<>(childTaskIds)) {
            try {
                logger.info("Отмена связанной задачи в MelonService: {}", childTaskId);
                melonService.cancelMelonTask(childTaskId);
            } catch (Exception e) {
                logger.warn("Не удалось отменить задачу {}: {}", childTaskId, e.getMessage());
            }
            parseTaskToAutoParseTask.remove(childTaskId);
        }
        autoParsingChildTaskIds.remove(taskId);

        return Map.of(
            "cancelled", true,
            "status", "cancelled",
            "message", "Задача отменена"
        );
    }

    /**
     * Добавляет лог-сообщение в задачу автопарсинга
     * Поддерживает как прямой taskId автопарсинга, так и parseTaskId отдельной манги
     */
    public void addLogToTask(String taskId, String logMessage) {
        // Сначала проверяем, не является ли это parseTaskId
        if (taskId == null || logMessage == null) {
            return;
        }

        String originalTaskId = taskId;
        String autoParsingTaskId = parseTaskToAutoParseTask.get(taskId);

        if (autoParsingTaskId != null) {
            taskId = autoParsingTaskId;
            logger.debug("Лог для parseTaskId={} перенаправлен в autoParsingTaskId={}", originalTaskId, autoParsingTaskId);
        }

        AutoParseTask task = autoParsingTasks.get(taskId);
        if (task != null) {
            appendLog(task, logMessage);

            if (!Objects.equals(originalTaskId, taskId)) {
                flushBufferedChildLogs(taskId, originalTaskId);
            }

            logger.debug("Добавлен лог в задачу {}: {}", taskId, logMessage);
            return;
        }

        // Если прямой задачи тоже нет, буферизуем лог до момента связывания
        bufferChildTaskLog(originalTaskId, logMessage);
        logger.debug("Буферизован лог для неизвестной дочерней задачи {}: {}", originalTaskId, logMessage);
    }
    
    /**
     * Связывает дополнительный taskId (например, parseTaskId или buildTaskId от MelonService)
     * с задачей автопарсинга. Позволяет логам от этих задач попадать в нужную задачу автопарсинга.
     */
    public void linkAdditionalTaskId(String childTaskId, String autoParsingTaskId) {
        if (childTaskId != null && autoParsingTaskId != null) {
            registerChildTaskMapping(autoParsingTaskId, childTaskId);
            logger.info("Связан дополнительный taskId={} с autoParsingTaskId={}", childTaskId, autoParsingTaskId);
        }
    }

    /**
     * Асинхронная обработка автопарсинга
     */
    @Async
    public CompletableFuture<Void> processAutoParsingAsync(String taskId, Integer page, Integer limit) {
        AutoParseTask task = autoParsingTasks.get(taskId);
        task.status = "running";
        task.message = "Получение списка манг из каталога...";
        appendLog(task, String.format(
            "Запущена задача автопарсинга. Страница: %d, лимит: %s",
            page,
            limit != null ? limit : "все"
        ));

        try {
            logger.info("Начало автопарсинга: страница {}, лимит {}", page, limit);

            // Получаем список slug'ов из каталога
            Map<String, Object> catalogResult = melonService.getCatalogSlugs(page, limit);
            
            if (catalogResult == null || !Boolean.TRUE.equals(catalogResult.get("success"))) {
                String errorMessage = catalogResult != null && catalogResult.get("error") != null
                    ? String.valueOf(catalogResult.get("error"))
                    : "Неизвестная ошибка";
                task.status = "failed";
                task.endTime = new Date();
                task.message = "Ошибка получения каталога: " + errorMessage;
                appendLog(task, "Ошибка получения каталога: " + errorMessage);
                logger.error("Не удалось получить каталог: {}", errorMessage);
                cleanupChildTaskMappings(taskId);
                return CompletableFuture.completedFuture(null);
            }

            @SuppressWarnings("unchecked")
            List<String> slugs = (List<String>) catalogResult.get("slugs");
            
            if (slugs == null || slugs.isEmpty()) {
                task.status = "completed";
                task.progress = 100;
                task.endTime = new Date();
                task.message = "Каталог пуст или не найден";
                appendLog(task, "Каталог пуст или не найден. Автопарсинг завершен.");
                logger.info("Каталог пуст, автопарсинг завершен");
                cleanupChildTaskMappings(taskId);
                return CompletableFuture.completedFuture(null);
            }

            task.totalSlugs = slugs.size();
            logger.info("Получено {} манг из каталога", slugs.size());
            appendLog(task, String.format("Найдено %d тайтлов для обработки", slugs.size()));

            for (int i = 0; i < slugs.size(); i++) {
                if ("cancelled".equals(task.status)) {
                    logger.info("Задача автопарсинга {} отменена, прерываем цикл", taskId);
                    appendLog(task, "Задача была отменена, оставшиеся тайтлы не будут обработаны.");
                    break;
                }

                String slug = slugs.get(i);
                String normalizedSlug = normalizeSlug(slug);
                Integer slugId = extractSlugId(slug);
                long slugStartMillis = System.currentTimeMillis();
                Map<String, Object> mangaMetric = new LinkedHashMap<>();
                mangaMetric.put("index", i + 1);
                mangaMetric.put("slug", slug);
                mangaMetric.put("normalized_slug", normalizedSlug);
                if (slugId != null) {
                    mangaMetric.put("slug_id", slugId);
                }
                mangaMetric.put("started_at", toIsoString(slugStartMillis));
                appendLog(task, String.format("[%d/%d] Начало обработки: %s", i + 1, slugs.size(), normalizedSlug));

                String fullParsingTaskId = null;
                String parseTaskId = null;
                boolean metricRecorded = false;
                Map<String, Object> thresholdMetrics = new LinkedHashMap<>();
                ChapterThresholdDecision thresholdDecision = null;

                try {
                    boolean alreadyImported = mangaRepository.existsByMelonSlug(normalizedSlug);
                    if (!alreadyImported && slugId != null) {
                        alreadyImported = mangaRepository.existsByMelonSlugId(slugId);
                    }

                    if (alreadyImported) {
                        logger.info("Манга с slug '{}' (normalized: '{}', id: {}) уже импортирована, пропускаем",
                            slug, normalizedSlug, slugId);
                        task.skippedSlugs.add(slug);
                        appendLog(task, String.format("[%d/%d] %s: пропуск — уже импортирована",
                            i + 1, slugs.size(), normalizedSlug));

                        mangaMetric.put("status", "skipped");
                        mangaMetric.put("reason", "already_imported");
                        mangaMetric.put("completed_at", toIsoString(System.currentTimeMillis()));
                        mangaMetric.put("duration_ms", 0L);
                        mangaMetric.put("duration_formatted", formatDuration(0));
                        addMangaMetric(task, mangaMetric);
                        metricRecorded = true;

                        task.processedSlugs++;
                        task.progress = (task.processedSlugs * 100) / task.totalSlugs;
                        task.message = String.format("Обработано: %d/%d (пропущено: %d, импортировано: %d)",
                            task.processedSlugs, task.totalSlugs, task.skippedSlugs.size(), task.importedSlugs.size());
                        continue;
                    }

                    thresholdDecision = evaluateChapterThreshold(slug, normalizedSlug, task);
                    if (thresholdDecision != null) {
                        if (thresholdDecision.totalChapters() != null) {
                            thresholdMetrics.put("total_chapters", thresholdDecision.totalChapters());
                        }
                        if (task.minChapters != null) {
                            thresholdMetrics.put("min_chapters_threshold", task.minChapters);
                        }
                        if (task.maxChapters != null) {
                            thresholdMetrics.put("max_chapters_threshold", task.maxChapters);
                        }

                        if (thresholdDecision.failureMessage() != null
                            || thresholdDecision.belowMinimum()
                            || thresholdDecision.aboveMaximum()) {
                            String reason;
                            if (thresholdDecision.failureMessage() != null) {
                                reason = "threshold_check_failed";
                            } else if (thresholdDecision.belowMinimum()) {
                                reason = "below_min_chapters";
                            } else {
                                reason = "above_max_chapters";
                            }

                            task.skippedSlugs.add(slug);
                            long slugEndMillis = System.currentTimeMillis();
                            long durationMs = Math.max(0, slugEndMillis - slugStartMillis);
                            mangaMetric.put("status", "skipped");
                            mangaMetric.put("reason", reason);
                            mangaMetric.put("completed_at", toIsoString(slugEndMillis));
                            mangaMetric.put("duration_ms", durationMs);
                            mangaMetric.put("duration_formatted", formatDuration(durationMs));
                            if (thresholdDecision.totalChapters() != null) {
                                mangaMetric.put("detected_chapters", thresholdDecision.totalChapters());
                            }
                            if (thresholdDecision.failureMessage() != null && !thresholdDecision.failureMessage().isBlank()) {
                                mangaMetric.put("error_message", thresholdDecision.failureMessage());
                            }

                            mergeMetricData(mangaMetric, thresholdMetrics);

                            if (thresholdDecision.failureMessage() != null) {
                                appendLog(task, String.format("[%d/%d] %s: пропуск — не удалось проверить количество глав (%s)",
                                    i + 1, slugs.size(), normalizedSlug, thresholdDecision.failureMessage()));
                            } else if (thresholdDecision.belowMinimum()) {
                                appendLog(task, String.format("[%d/%d] %s: пропуск — глав %d меньше минимального %d",
                                    i + 1, slugs.size(), normalizedSlug,
                                    thresholdDecision.totalChapters(), task.minChapters));
                            } else {
                                appendLog(task, String.format("[%d/%d] %s: пропуск — глав %d больше максимального %d",
                                    i + 1, slugs.size(), normalizedSlug,
                                    thresholdDecision.totalChapters(), task.maxChapters));
                            }

                            addMangaMetric(task, mangaMetric);
                            metricRecorded = true;

                            task.processedSlugs++;
                            task.progress = (task.processedSlugs * 100) / task.totalSlugs;
                            task.message = String.format("Обработано: %d/%d (пропущено: %d, импортировано: %d)",
                                task.processedSlugs, task.totalSlugs, task.skippedSlugs.size(), task.importedSlugs.size());
                            continue;
                        }
                    }

                    task.message = String.format("Парсинг манги %d/%d: %s", i + 1, slugs.size(), slug);
                    logger.info("=== АВТОПАРСИНГ MANGA {}/{} ===", i + 1, slugs.size());
                    logger.info("Slug: {}", slug);
                    logger.info("Текущая статистика - Обработано: {}, Пропущено: {}, Импортировано: {}, Ошибок: {}", 
                        task.processedSlugs, task.skippedSlugs.size(), task.importedSlugs.size(), task.failedSlugs.size());
                    appendLog(task, String.format("[%d/%d] Запуск полного парсинга: %s",
                        i + 1, slugs.size(), normalizedSlug));

                    Map<String, Object> parseResult = melonService.startFullParsing(slug);

                    if (parseResult != null && parseResult.containsKey("task_id")) {
                        fullParsingTaskId = (String) parseResult.get("task_id");
                        mangaMetric.put("full_parsing_task_id", fullParsingTaskId);

                        if (parseResult.containsKey("parse_task_id")) {
                            parseTaskId = (String) parseResult.get("parse_task_id");
                            mangaMetric.put("parse_task_id", parseTaskId);
                            registerChildTaskMapping(taskId, parseTaskId);
                            logger.info("Связали parseTaskId={} с autoParsingTaskId={}", parseTaskId, taskId);
                        }

                        registerChildTaskMapping(taskId, fullParsingTaskId);
                        logger.info("Связали fullParsingTaskId={} с autoParsingTaskId={}", fullParsingTaskId, taskId);

                        melonService.registerAutoParsingLink(fullParsingTaskId, taskId);

                        Map<String, Object> finalStatus = waitForFullParsingCompletion(fullParsingTaskId);
                        boolean completed = finalStatus != null &&
                            "completed".equalsIgnoreCase(String.valueOf(finalStatus.get("status")));

                        long slugEndMillis = System.currentTimeMillis();
                        long durationMs = Math.max(0, slugEndMillis - slugStartMillis);
                        mangaMetric.put("completed_at", toIsoString(slugEndMillis));
                        mangaMetric.put("duration_ms", durationMs);
                        mangaMetric.put("duration_formatted", formatDuration(durationMs));

                        if (completed) {
                            task.importedSlugs.add(slug);
                            logger.info("✅ ИМПОРТ УСПЕШЕН для slug={}, время: {} мс", slug, durationMs);
                            mangaMetric.put("status", "completed");
                            logger.info("Манга '{}' успешно обработана через полный парсинг (импорт и очистка выполнены автоматически)", slug);
                            appendLog(task, String.format("[%d/%d] %s: импорт завершен успешно",
                                i + 1, slugs.size(), normalizedSlug));
                        } else {
                            task.failedSlugs.add(slug);
                            String statusValue = finalStatus != null ? String.valueOf(finalStatus.get("status")) : "failed";
                            mangaMetric.put("status", statusValue);
                            if (finalStatus != null && finalStatus.get("message") != null) {
                                mangaMetric.put("error_message", finalStatus.get("message"));
                            }
                            logger.error("❌ ИМПОРТ ПРОВАЛЕН для slug={}, статус: {}, время: {} мс", slug, statusValue, durationMs);
                            String failureMessage = finalStatus != null && finalStatus.get("message") != null
                                ? String.valueOf(finalStatus.get("message"))
                                : "Неизвестная ошибка";
                            appendLog(task, String.format("[%d/%d] %s: ошибка импорта — %s",
                                i + 1, slugs.size(), normalizedSlug, failureMessage));
                        }

                        if (finalStatus != null) {
                            if (finalStatus.get("status") != null) {
                                mangaMetric.put("full_parsing_status", finalStatus.get("status"));
                            }
                            if (finalStatus.get("message") != null) {
                                mangaMetric.put("final_message", finalStatus.get("message"));
                            }

                            Map<String, Object> topMetrics = asStringObjectMap(finalStatus.get("metrics"));
                            if (!topMetrics.isEmpty()) {
                                mangaMetric.put("metrics", topMetrics);
                            }

                            Map<String, Object> resultData = asStringObjectMap(finalStatus.get("result"));
                            if (!resultData.isEmpty()) {
                                if (resultData.get("title") != null) {
                                    mangaMetric.put("title", resultData.get("title"));
                                }
                                if (resultData.get("import_task_id") != null) {
                                    mangaMetric.put("import_task_id", resultData.get("import_task_id"));
                                }

                                Map<String, Object> innerMetrics = asStringObjectMap(resultData.get("metrics"));
                                if (!innerMetrics.isEmpty()) {
                                    mangaMetric.put("metrics", innerMetrics);
                                }
                            }
                        }

                        mergeMetricData(mangaMetric, thresholdMetrics);
                        addMangaMetric(task, mangaMetric);
                        metricRecorded = true;

                    } else {
                        logger.error("Не удалось запустить парсинг для slug: {}", slug);
                        task.failedSlugs.add(slug);
                        appendLog(task, String.format("[%d/%d] %s: не удалось запустить парсинг",
                            i + 1, slugs.size(), normalizedSlug));

                        long slugEndMillis = System.currentTimeMillis();
                        long durationMs = Math.max(0, slugEndMillis - slugStartMillis);
                        mangaMetric.put("status", "failed");
                        mangaMetric.put("completed_at", toIsoString(slugEndMillis));
                        mangaMetric.put("duration_ms", durationMs);
                        mangaMetric.put("duration_formatted", formatDuration(durationMs));
                        mangaMetric.put("error_message", "Не удалось запустить парсинг");
                        mergeMetricData(mangaMetric, thresholdMetrics);
                        addMangaMetric(task, mangaMetric);
                        metricRecorded = true;
                    }

                } catch (Exception e) {
                    logger.error("Ошибка обработки slug '{}': {}", slug, e.getMessage(), e);
                    task.failedSlugs.add(slug);
                    mangaMetric.put("status", "failed");
                    mangaMetric.put("error_message", e.getMessage());
                    appendLog(task, String.format("[%d/%d] %s: критическая ошибка — %s",
                        i + 1, slugs.size(), normalizedSlug, e.getMessage()));
                } finally {
                    if (!metricRecorded) {
                        long slugEndMillis = System.currentTimeMillis();
                        long durationMs = Math.max(0, slugEndMillis - slugStartMillis);
                        mangaMetric.putIfAbsent("completed_at", toIsoString(slugEndMillis));
                        mangaMetric.putIfAbsent("duration_ms", durationMs);
                        mangaMetric.putIfAbsent("duration_formatted", formatDuration(durationMs));
                        mangaMetric.putIfAbsent("status", "failed");
                        mergeMetricData(mangaMetric, thresholdMetrics);
                        addMangaMetric(task, mangaMetric);
                    }
                }

                task.processedSlugs++;
                task.progress = (task.processedSlugs * 100) / task.totalSlugs;
                task.message = String.format("Обработано: %d/%d (пропущено: %d, импортировано: %d, ошибок: %d)",
                    task.processedSlugs, task.totalSlugs, task.skippedSlugs.size(),
                    task.importedSlugs.size(), task.failedSlugs.size());
                appendLog(task, String.format(
                    "Прогресс: %d/%d | импортировано: %d | пропущено: %d | ошибок: %d",
                    task.processedSlugs,
                    task.totalSlugs,
                    task.importedSlugs.size(),
                    task.skippedSlugs.size(),
                    task.failedSlugs.size()
                ));
            }

            task.status = "completed";
            task.progress = 100;
            task.endTime = new Date();
            task.message = String.format("Автопарсинг завершен. Импортировано: %d, пропущено: %d, ошибок: %d",
                task.importedSlugs.size(), task.skippedSlugs.size(), task.failedSlugs.size());
            appendLog(task, String.format(
                "Автопарсинг завершен. Импортировано: %d, пропущено: %d, ошибок: %d",
                task.importedSlugs.size(),
                task.skippedSlugs.size(),
                task.failedSlugs.size()
            ));

            cleanupChildTaskMappings(taskId);
            
            logger.info("Автопарсинг завершен. Результаты: импортировано={}, пропущено={}, ошибок={}",
                task.importedSlugs.size(), task.skippedSlugs.size(), task.failedSlugs.size());

        } catch (Exception e) {
            task.status = "failed";
            task.endTime = new Date();
            task.message = "Критическая ошибка автопарсинга: " + e.getMessage();
            logger.error("Критическая ошибка автопарсинга", e);
            appendLog(task, "Критическая ошибка автопарсинга: " + e.getMessage());
            cleanupChildTaskMappings(taskId);
        }

        return CompletableFuture.completedFuture(null);
    }

    /**
     * Ждет завершения полного парсинга (parse + build)
     * БЕЗ таймаута - некоторые манги с большим количеством глав могут парситься 100+ минут
     */
    Map<String, Object> waitForFullParsingCompletion(String taskId) throws InterruptedException {
        int attempts = 0;
        int missingStatusAttempts = 0;
        AutoParseTask autoParseTask = null;
        
        // Находим родительскую задачу автопарсинга
        String autoParsingTaskId = parseTaskToAutoParseTask.get(taskId);
        if (autoParsingTaskId != null) {
            autoParseTask = autoParsingTasks.get(autoParsingTaskId);
        }

        while (true) {
            // Проверяем, не отменена ли задача автопарсинга
            if (autoParseTask != null && "cancelled".equals(autoParseTask.status)) {
                logger.info("Задача автопарсинга отменена, прерываем ожидание парсинга {}", taskId);
                return Map.of(
                    "status", "cancelled",
                    "message", "Задача автопарсинга отменена пользователем"
                );
            }

            sleepForFullParsing(getFullParsingPollInterval());
            attempts++;

            Map<String, Object> status = melonService.getFullParsingTaskStatus(taskId);
            String statusValue = status != null ? String.valueOf(status.get("status")) : null;

            if (statusValue != null) {
                if ("completed".equalsIgnoreCase(statusValue)) {
                    logger.info("Полный парсинг завершен успешно после {} попыток ({}s)",
                        attempts, attempts * getFullParsingPollInterval().getSeconds());
                    return status;
                }

                if ("failed".equalsIgnoreCase(statusValue) || "cancelled".equalsIgnoreCase(statusValue)) {
                    logger.error("Полный парсинг завершился с ошибкой/отменен после {} попыток: {}",
                        attempts, status.get("message"));
                    return status;
                }
            }

            if (isMissingFullParsingStatus(status, statusValue)) {
                missingStatusAttempts++;

                if (missingStatusAttempts >= getMaxMissingFullStatusAttempts()) {
                    logger.warn("Статус полного парсинга {} недоступен после {} попыток. Предполагаем потерю задачи.",
                        taskId, missingStatusAttempts);
                    String message = status != null && status.get("message") != null
                        ? String.valueOf(status.get("message"))
                        : "Не удалось получить статус полного парсинга (возможно, MelonService был перезапущен)";
                    return Map.of(
                        "status", "failed",
                        "message", message
                    );
                }
            } else {
                missingStatusAttempts = 0;
            }

            // Логируем прогресс каждые 30 проверок (1 минута)
            if (attempts % 30 == 0) {
                long minutes = attempts * getFullParsingPollInterval().toMillis() / 60000;
                logger.info("Ожидание парсинга {}: {} минут, прогресс: {}%",
                    taskId, minutes, status != null ? status.get("progress") : "?");
            }
        }
    }

    protected Duration getFullParsingPollInterval() {
        return FULL_PARSING_POLL_INTERVAL;
    }

    protected int getMaxMissingFullStatusAttempts() {
        return MAX_MISSING_FULL_STATUS_ATTEMPTS;
    }

    protected void sleepForFullParsing(Duration interval) throws InterruptedException {
        long millis = Math.max(1L, interval.toMillis());
        Thread.sleep(millis);
    }

    private boolean isMissingFullParsingStatus(Map<String, Object> status, String statusValue) {
        if (status == null) {
            return true;
        }
        if (statusValue == null || statusValue.isBlank()) {
            return true;
        }
        if ("not_found".equalsIgnoreCase(statusValue)) {
            return true;
        }
        if (!status.containsKey("status") && status.containsKey("error")) {
            return true;
        }
        return false;
    }

    private void addMangaMetric(AutoParseTask task, Map<String, Object> metric) {
        if (task.mangaMetrics == null) {
            task.mangaMetrics = Collections.synchronizedList(new ArrayList<>());
        }

        synchronized (task.mangaMetrics) {
            task.mangaMetrics.add(metric);
        }
    }

    private void registerChildTaskMapping(String autoTaskId, String childTaskId) {
        if (autoTaskId == null || childTaskId == null) {
            return;
        }

        parseTaskToAutoParseTask.put(childTaskId, autoTaskId);
        autoParsingChildTaskIds
            .computeIfAbsent(autoTaskId, key -> ConcurrentHashMap.newKeySet())
            .add(childTaskId);

        flushBufferedChildLogs(autoTaskId, childTaskId);
    }

    private void cleanupChildTaskMappings(String autoTaskId) {
        if (autoTaskId == null) {
            return;
        }

        Set<String> childIds = autoParsingChildTaskIds.remove(autoTaskId);
        if (childIds == null || childIds.isEmpty()) {
            return;
        }

        for (String childId : childIds) {
            parseTaskToAutoParseTask.remove(childId);
            pendingChildTaskLogs.remove(childId);
        }
    }

    private void bufferChildTaskLog(String childTaskId, String logMessage) {
        if (childTaskId == null || logMessage == null) {
            return;
        }

        pendingChildTaskLogs.compute(childTaskId, (key, existing) -> {
            List<String> target = existing;
            if (target == null) {
                target = Collections.synchronizedList(new ArrayList<>());
            }

            synchronized (target) {
                target.add(logMessage);
                int overflow = target.size() - MAX_TASK_LOGS;
                if (overflow > 0) {
                    for (int i = 0; i < overflow; i++) {
                        target.remove(0);
                    }
                }
            }

            return target;
        });
    }

    private void flushBufferedChildLogs(String autoTaskId, String childTaskId) {
        if (autoTaskId == null || childTaskId == null) {
            return;
        }

        List<String> buffered = pendingChildTaskLogs.remove(childTaskId);
        if (buffered == null || buffered.isEmpty()) {
            return;
        }

        AutoParseTask parentTask = autoParsingTasks.get(autoTaskId);
        if (parentTask == null) {
            // Родитель еще не готов — возвращаем лог обратно
            pendingChildTaskLogs.putIfAbsent(childTaskId, buffered);
            return;
        }

        synchronized (buffered) {
            for (String bufferedLog : buffered) {
                appendLog(parentTask, bufferedLog);
            }
        }

        logger.debug("Флаш логов дочерней задачи {} в autoParsingTask={} ({} записей)", childTaskId, autoTaskId, buffered.size());
    }

    private void mergeMetricData(Map<String, Object> metric, Map<String, Object> additions) {
        if (metric == null || additions == null || additions.isEmpty()) {
            return;
        }

        Map<String, Object> merged = new LinkedHashMap<>();
        Map<String, Object> existing = asStringObjectMap(metric.get("metrics"));
        if (!existing.isEmpty()) {
            merged.putAll(existing);
        }
        merged.putAll(additions);
        metric.put("metrics", merged);
    }

    private ChapterThresholdDecision evaluateChapterThreshold(String slug, String normalizedSlug, AutoParseTask task) {
        Integer min = task.minChapters;
        Integer max = task.maxChapters;
        if (min == null && max == null) {
            return null;
        }

        Map<String, Object> metadata = melonService.getChaptersMetadataOnly(slug);
        if (metadata == null || !Boolean.TRUE.equals(metadata.get("success"))) {
            String message = metadata != null && metadata.get("error") != null
                ? String.valueOf(metadata.get("error"))
                : "Неизвестная ошибка";
            logger.warn("Не удалось получить метаданные для '{}' при проверке лимитов глав: {}", slug, message);
            return new ChapterThresholdDecision(null, false, false, message);
        }

        Integer total = extractTotalChapters(metadata);
        if (total == null) {
            logger.warn("Метаданные для '{}' не содержат информации о количестве глав", slug);
            return new ChapterThresholdDecision(null, false, false, "Количество глав не определено");
        }

        boolean below = min != null && total < min;
        boolean above = max != null && total > max;
        return new ChapterThresholdDecision(total, below, above, null);
    }

    private Integer extractTotalChapters(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return null;
        }

        Integer direct = safeToInteger(metadata.get("total_chapters"));
        if (direct != null) {
            return direct;
        }

        direct = safeToInteger(metadata.get("totalChapters"));
        if (direct != null) {
            return direct;
        }

        Object chaptersObj = metadata.get("chapters");
        if (chaptersObj instanceof Collection<?> collection) {
            Set<String> unique = new LinkedHashSet<>();
            for (Object item : collection) {
                if (item instanceof Map<?, ?> map) {
                    Object id = map.get("id");
                    if (id != null) {
                        unique.add(String.valueOf(id));
                        continue;
                    }

                    Object number = map.get("number");
                    Object volume = map.get("volume");
                    String key = String.valueOf(volume) + ":" + String.valueOf(number);
                    unique.add(key);
                } else if (item != null) {
                    unique.add(item.toString());
                }
            }

            if (!unique.isEmpty()) {
                return unique.size();
            }
        }

        return null;
    }

    private Integer safeToInteger(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.intValue();
        }

        if (value instanceof String text) {
            String trimmed = text.trim();
            if (trimmed.isEmpty()) {
                return null;
            }
            try {
                return Integer.parseInt(trimmed);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }

    private void appendLog(AutoParseTask task, String message) {
        if (task == null || message == null) {
            return;
        }

        if (task.logs == null) {
            task.logs = Collections.synchronizedList(new ArrayList<>());
        }

        String normalized = message.trim();
        if (normalized.isEmpty()) {
            return;
        }

        String line = normalized;
        if (!(normalized.startsWith("[") && normalized.contains("]"))) {
            String timestamp = LOG_TIMESTAMP_FORMATTER.format(Instant.now());
            line = "[" + timestamp + "] " + normalized;
        }

        synchronized (task.logs) {
            task.logs.add(line);
            if (task.logs.size() > MAX_TASK_LOGS) {
                task.logs.remove(0);
            }
        }
    }

    private String toIsoString(long epochMillis) {
        return Instant.ofEpochMilli(epochMillis).toString();
    }

    private String formatDuration(long millis) {
        Duration duration = Duration.ofMillis(Math.max(0, millis));
        long seconds = duration.getSeconds();
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }

    private Map<String, Object> asStringObjectMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> result = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() != null) {
                    String key = String.valueOf(entry.getKey());
                    if ("manga_info".equals(key)) {
                        continue; // избегаем передачи тяжелого JSON
                    }
                    result.put(key, entry.getValue());
                }
            }
            return result;
        }
        return Collections.emptyMap();
    }

    /**
     * Нормализует slug, убирая префикс ID-- если он есть.
     * MangaLib изменил формат: теперь slug'и имеют формат "ID--slug" (например "7580--i-alone-level-up")
     * Для проверки дубликатов нужно сравнивать только часть после "--"
     * 
     * @param slug исходный slug (может быть "7580--i-alone-level-up" или "i-alone-level-up")
     * @return нормализованный slug без ID (всегда "i-alone-level-up")
     */
    private String normalizeSlug(String slug) {
        if (slug == null || slug.isEmpty()) {
            return slug;
        }
        
        // Проверяем формат "ID--slug"
        if (slug.contains("--")) {
            String[] parts = slug.split("--", 2);
            // Если первая часть - число (ID), возвращаем вторую часть (slug)
            if (parts.length == 2 && parts[0].matches("\\d+")) {
                logger.debug("Нормализация slug: '{}' -> '{}'", slug, parts[1]);
                return parts[1];
            }
        }
        
        // Если формат не "ID--slug", возвращаем как есть
        return slug;
    }

    private Integer extractSlugId(String slug) {
        if (slug == null || slug.isEmpty()) {
            return null;
        }

        if (slug.contains("--")) {
            String[] parts = slug.split("--", 2);
            if (parts.length == 2 && parts[0].matches("\\d+")) {
                try {
                    return Integer.valueOf(parts[0]);
                } catch (NumberFormatException ignored) {
                    // игнорируем и вернем null
                }
            }
        }

        return null;
    }

    /**
     * Внутренний класс для отслеживания задачи автопарсинга
     */
    private record ChapterThresholdDecision(Integer totalChapters, boolean belowMinimum, boolean aboveMaximum, String failureMessage) {}

    private static class AutoParseTask {
        String taskId;
        String status;
        int progress;
        String message;
        int totalSlugs;
        int processedSlugs;
        List<String> skippedSlugs;
        List<String> importedSlugs;
        List<String> failedSlugs;
        List<String> logs;  // Логи из MelonService в реальном времени
        List<Map<String, Object>> mangaMetrics;
        Date startTime;
        Date endTime;
        Integer page;   // Номер страницы каталога
        Integer limit;  // Ограничение количества манг для парсинга
        Integer minChapters;
        Integer maxChapters;
    }
}
