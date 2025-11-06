package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;
import org.springframework.web.util.UriComponentsBuilder;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.dto.MelonChapterImagesResponse;
import shadowshift.studio.mangaservice.dto.MelonImageData;
import shadowshift.studio.mangaservice.config.ServiceUrlProperties;
import shadowshift.studio.mangaservice.dto.PartialBuildChapterNumber;
import shadowshift.studio.mangaservice.repository.MangaRepository;

import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
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

    private static final List<String> EXTERNAL_CHAPTER_ID_KEYS = Arrays.asList(
        "melonChapterId",
        "melon_chapter_id",
        "externalChapterId",
        "external_chapter_id",
        "chapterId",
        "chapter_id",
        "sourceChapterId",
        "source_chapter_id",
        "id"
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

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private ServiceUrlProperties serviceUrlProperties;

    @Value("${melon.service.url:http://parser-service:8084}")
    private String melonServiceUrl;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    // Хранилище задач обновления
    private final Map<String, UpdateTask> updateTasks = new HashMap<>();
    
    // Маппинг parseTaskId -> autoUpdateTaskId для связывания логов от MelonService
    private final Map<String, String> parseTaskToUpdateTask = new ConcurrentHashMap<>();

    // Маппинг updateTaskId -> множество связанных parseTaskId для последующей очистки
    private final Map<String, Set<String>> updateTaskChildTaskIds = new ConcurrentHashMap<>();

    // Буфер логов для parseTaskId до момента, пока не появится связь с updateTaskId
    private final Map<String, List<String>> pendingParseTaskLogs = new ConcurrentHashMap<>();

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
    updateTaskChildTaskIds.put(taskId, ConcurrentHashMap.newKeySet());

    // Запускаем асинхронную обработку через Spring proxy (self-invocation не активирует @Async)
    MangaUpdateService proxy = applicationContext.getBean(MangaUpdateService.class);
    proxy.processAutoUpdateAsync(taskId, mangaList);

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
     * Добавляет лог-сообщение в задачу автообновления
     * Поддерживает как прямой taskId обновления, так и parseTaskId от MelonService
     */
    public void addLogToUpdateTask(String taskId, String logMessage) {
        if (taskId == null || logMessage == null) {
            return;
        }

        // Вначале проверяем, не является ли это прямой задачей автообновления
        UpdateTask directTask = updateTasks.get(taskId);
        if (directTask != null) {
            appendLog(directTask, logMessage);
            logger.debug("Добавлен прямой лог в задачу автообновления {}", taskId);
            return;
        }

        // Пытаемся найти родительскую задачу по parseTaskId
        String updateTaskId = parseTaskToUpdateTask.get(taskId);
        if (updateTaskId != null) {
            UpdateTask parentTask = updateTasks.get(updateTaskId);
            if (parentTask != null) {
                appendLog(parentTask, logMessage);
                flushBufferedParseTaskLogs(updateTaskId, taskId);
                logger.debug("Добавлен лог парсинга {} в задачу автообновления {}", taskId, updateTaskId);
                return;
            }
        }

        // Если связь ещё не установлена или родитель пока недоступен, буферизуем лог
        bufferParseTaskLog(taskId, logMessage);
        logger.debug("Буферизован лог для parseTaskId={}, ожидаем связывания с задачей автообновления", taskId);
    }

    /**
     * Связывает parseTaskId от MelonService с задачей автообновления
     */
    public void linkParseTaskToUpdate(String parseTaskId, String updateTaskId) {
        if (parseTaskId == null || updateTaskId == null) {
            logger.warn("⚠️ Попытка связать NULL: parseTaskId={}, updateTaskId={}", parseTaskId, updateTaskId);
            return;
        }

        registerParseTaskMapping(updateTaskId, parseTaskId);
    }

    private void registerParseTaskMapping(String updateTaskId, String parseTaskId) {
        parseTaskToUpdateTask.put(parseTaskId, updateTaskId);
        updateTaskChildTaskIds.computeIfAbsent(updateTaskId, key -> ConcurrentHashMap.newKeySet()).add(parseTaskId);
        flushBufferedParseTaskLogs(updateTaskId, parseTaskId);
        logger.info("Связан parseTaskId={} с updateTaskId={}", parseTaskId, updateTaskId);
    }

    private void bufferParseTaskLog(String parseTaskId, String logMessage) {
        pendingParseTaskLogs.compute(parseTaskId, (key, existing) -> {
            List<String> target = existing;
            if (target == null) {
                target = Collections.synchronizedList(new ArrayList<>());
            }
            target.add(logMessage);
            return target;
        });
    }

    private void flushBufferedParseTaskLogs(String updateTaskId, String parseTaskId) {
        List<String> buffered = pendingParseTaskLogs.remove(parseTaskId);
        if (buffered == null || buffered.isEmpty()) {
            return;
        }

        UpdateTask parentTask = updateTasks.get(updateTaskId);
        if (parentTask == null) {
            // Родительская задача ещё не готова, возвращаем буфер обратно
            pendingParseTaskLogs.put(parseTaskId, buffered);
            return;
        }

        synchronized (buffered) {
            for (String log : buffered) {
                appendLog(parentTask, log);
            }
        }
        logger.debug("Применено {} буферизованных логов для parseTaskId={} (updateTaskId={})", buffered.size(), parseTaskId, updateTaskId);
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
                String title = Optional.ofNullable(manga.getTitle()).orElse("Без названия");
                String slug = manga.getMelonSlug();
                Integer slugId = manga.getMelonSlugId();
                String normalizedSlug = normalizeSlug(slug);
                String slugForApi = melonService.buildSlugForMangaLibApi(normalizedSlug, slugId);
                if (slugId == null) {
                    logger.debug("Для манги '{}' отсутствует сохраненный MangaLib ID. Используем slug: {}", title, slugForApi);
                }
                if (slug == null || slug.isBlank()) {
                    appendLog(task, String.format("[%d/%d] Пропуск манги '%s': отсутствует slug", i + 1, mangaList.size(), title));
                    task.failedMangas.add(String.format("(slug отсутствует) — %s", title));
                    continue;
                }

                String displayName = String.format("%s — %s", slug, title);

                appendLog(task, String.format("[%d/%d] Старт проверки: %s", i + 1, mangaList.size(), displayName));

                try {
                    task.message = String.format("Проверка манги %d/%d: %s", i + 1, mangaList.size(), title);
                    logger.info("Проверка обновлений для манги: {} (slug: {})", title, slug);

                    // Получаем существующие главы из нашей системы
                    ExistingChapters existingChapters = getExistingChapters(manga.getId());
                    int existingCount = existingChapters.chapterNumbers().size();
                    logger.info("Найдено {} существующих глав для манги {} ({} внешних идентификаторов)",
                        existingCount, title, existingChapters.melonChapterIds().size());
                    appendLog(task, String.format("[%d/%d] %s: найдено %d глав в базе", i + 1, mangaList.size(), displayName, existingCount));

                    // Запрашиваем обновленную информацию у Melon
                    Map<String, Object> updateInfo = checkForUpdates(manga, normalizedSlug, slugForApi, slugId, existingChapters, taskId);

                    if (updateInfo == null) {
                        appendLog(task, String.format("[%d/%d] %s: не удалось получить данные об обновлениях", i + 1, mangaList.size(), displayName));
                    } else if (!Boolean.TRUE.equals(updateInfo.getOrDefault("has_updates", false))) {
                        appendLog(task, String.format("[%d/%d] %s: новых глав не найдено", i + 1, mangaList.size(), displayName));
                    } else {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> newChapters = (List<Map<String, Object>>) updateInfo.get("new_chapters");
                        @SuppressWarnings("unchecked")
                        Map<String, Object> mangaInfoFromUpdate = (Map<String, Object>) updateInfo.get("manga_info");

                        if (slugId == null && mangaInfoFromUpdate != null) {
                            Object resolvedId = mangaInfoFromUpdate.get("id");
                            if (resolvedId instanceof Number number) {
                                slugId = number.intValue();
                                manga.setMelonSlugId(slugId);
                                mangaRepository.save(manga);
                                logger.info("Для манги '{}' сохранен MangaLib ID {}", title, slugId);
                            }
                        }

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
                            boolean success = parseAndImportNewChapters(normalizedSlug, slugForApi, manga.getId(), newChapters, mangaInfoFromUpdate);

                            if (success) {
                                UpdatedMangaRecord record = new UpdatedMangaRecord(slug, title, newChapters.size(), chapterLabels, normalizedNumbers);
                                task.updatedMangas.add(formatUpdatedMangaDisplay(record));
                                task.updatedSlugs.add(slug);
                                task.updatedDetails.add(record);
                                task.newChaptersCount += newChapters.size();

                                logger.info("Успешно обновлена манга {}: добавлено {} глав", title, newChapters.size());
                                appendLog(task, String.format("[%d/%d] %s: импортировано %d глав", i + 1, mangaList.size(), displayName, newChapters.size()));

                                try {
                                    melonService.deleteManga(normalizedSlug);
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

            // Очищаем маппинг задач
            cleanupTaskMappings(taskId);

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
            cleanupTaskMappings(taskId);
        }

        return CompletableFuture.completedFuture(null);
    }

    private void cleanupTaskMappings(String updateTaskId) {
        if (updateTaskId == null) {
            return;
        }

        Set<String> childTaskIds = updateTaskChildTaskIds.remove(updateTaskId);
        if (childTaskIds != null) {
            for (String childId : childTaskIds) {
                parseTaskToUpdateTask.remove(childId);
                flushBufferedParseTaskLogs(updateTaskId, childId);
                pendingParseTaskLogs.remove(childId);
            }
        } else {
            parseTaskToUpdateTask.entrySet().removeIf(entry -> updateTaskId.equals(entry.getValue()));
        }
        logger.debug("Очищен маппинг задач для updateTaskId={}, удалено дочерних задач: {}", updateTaskId, childTaskIds != null ? childTaskIds.size() : 0);
    }

    /**
     * Получает номера существующих глав из ChapterService
     */
    private ExistingChapters getExistingChapters(Long mangaId) {
        String url = chapterServiceUrl + "/api/chapters/manga/" + mangaId;
        try {
            @SuppressWarnings("rawtypes")
            ResponseEntity<List> response = restTemplate.getForEntity(url, List.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> chapters = (List<Map<String, Object>>) response.getBody();

                Set<Double> chapterNumbers = new LinkedHashSet<>();
                Set<String> melonChapterIds = new LinkedHashSet<>();

                for (Map<String, Object> chapter : chapters) {
                    Double numeric = extractChapterNumber(chapter.get("chapterNumber"));
                    if (numeric != null) {
                        chapterNumbers.add(numeric);
                    }

                    String externalId = extractStoredMelonChapterId(chapter);
                    if (externalId != null) {
                        melonChapterIds.add(externalId);
                    }
                }

                return new ExistingChapters(chapterNumbers, melonChapterIds);
            }

            throw new IllegalStateException(String.format(
                "Не удалось получить список существующих глав для манги %d: статус %s",
                mangaId, response.getStatusCode()));

        } catch (Exception e) {
            throw new IllegalStateException(String.format(
                "Не удалось получить существующие главы для манги %d", mangaId), e);
        }
    }

    private String extractStoredMelonChapterId(Map<String, Object> chapterData) {
        if (chapterData == null || chapterData.isEmpty()) {
            return null;
        }

        Object storedId = chapterData.get("melonChapterId");
        if (storedId == null) {
            return null;
        }

        return normalizeExternalChapterId(storedId);
    }

    private boolean chapterAlreadyExists(ExistingChapters existingChapters, ChapterNumeric numeric, String melonChapterId) {
        if (existingChapters == null) {
            return false;
        }

        if (melonChapterId != null && !melonChapterId.isBlank()) {
            String normalizedExternal = normalizeExternalChapterId(melonChapterId);
            if (normalizedExternal != null && existingChapters.melonChapterIds().contains(normalizedExternal)) {
                return true;
            }
        }

        if (numeric == null) {
            return false;
        }

        return chapterAlreadyExists(existingChapters.chapterNumbers(), numeric);
    }

    private Double extractChapterNumber(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.doubleValue();
        }

        String text = value.toString();
        if (text == null) {
            return null;
        }

        text = text.trim();
        if (text.isEmpty()) {
            return null;
        }

        try {
            return Double.parseDouble(text);
        } catch (NumberFormatException ex) {
            logger.debug("Не удалось преобразовать значение '{}' в число главы", text);
            return null;
        }
    }

    private String extractMelonChapterId(Map<String, Object> chapterData) {
        if (chapterData == null || chapterData.isEmpty()) {
            return null;
        }

        Object candidate = findExternalIdCandidate(chapterData);
        if (candidate == null) {
            candidate = findExternalIdCandidateFromNested(chapterData, "meta");
        }
        if (candidate == null) {
            candidate = findExternalIdCandidateFromNested(chapterData, "data");
        }
        if (candidate == null) {
            candidate = findExternalIdCandidateFromNested(chapterData, "chapter");
        }

        if (candidate == null) {
            for (Object value : chapterData.values()) {
                if (value instanceof Map<?, ?> nestedMap) {
                    candidate = findExternalIdCandidate(nestedMap);
                    if (candidate != null) {
                        break;
                    }
                }
            }
        }

        return normalizeExternalChapterId(candidate);
    }

    private Object findExternalIdCandidateFromNested(Map<String, Object> chapterData, String nestedKey) {
        Object nested = chapterData.get(nestedKey);
        if (nested instanceof Map<?, ?> nestedMap) {
            return findExternalIdCandidate(nestedMap);
        }
        return null;
    }

    private Object findExternalIdCandidate(Map<?, ?> source) {
        if (source == null || source.isEmpty()) {
            return null;
        }

        for (String key : EXTERNAL_CHAPTER_ID_KEYS) {
            if (source.containsKey(key)) {
                Object value = source.get(key);
                if (value != null) {
                    return value;
                }
            }
        }

        return null;
    }

    private String normalizeExternalChapterId(Object rawValue) {
        if (rawValue == null) {
            return null;
        }

        if (rawValue instanceof Collection<?> collection) {
            for (Object item : collection) {
                String normalized = normalizeExternalChapterId(item);
                if (normalized != null) {
                    return normalized;
                }
            }
            return null;
        }

        if (rawValue instanceof Number number) {
            BigDecimal numeric = new BigDecimal(number.toString());
            return numeric.stripTrailingZeros().toPlainString();
        }

        String text = rawValue.toString();
        if (text == null) {
            return null;
        }

        text = text.trim();
        if (text.isEmpty() || text.equalsIgnoreCase("null")) {
            return null;
        }

        try {
            BigDecimal numeric = new BigDecimal(text);
            return numeric.stripTrailingZeros().toPlainString();
        } catch (NumberFormatException ex) {
            return text;
        }
    }

    /**
     * Проверяет наличие обновлений через парсинг и сравнение глав
     * @param updateTaskId ID задачи автообновления для связывания логов
     */
    private Map<String, Object> checkForUpdates(Manga manga, String normalizedSlug, String initialSlugForApi, Integer initialSlugId,
                                                ExistingChapters existingChapters, String updateTaskId) {
        String storedSlug = manga.getMelonSlug();
        Integer slugId = initialSlugId;
        String slugForApi = initialSlugForApi;

        try {

            logger.info("Получение метаданных глав с проверкой slides_count для slug (API формат): {}", slugForApi);
            // ✅ ИСПРАВЛЕНИЕ: Используем новый метод с проверкой slides_count
            // Force refresh so we do not rely on stale cached chapter lists on ParserService side
            Map<String, Object> metadata = melonService.getChaptersMetadataWithSlidesCount(slugForApi, true, true);

            if (metadata == null || !Boolean.TRUE.equals(metadata.get("success"))) {
                logger.warn("Первичная попытка получения метаданных для '{}' не удалась: {}",
                    storedSlug, metadata != null ? metadata.get("error") : "unknown error");

                if (slugId == null) {
                    Integer resolvedId = resolveAndPersistSlugId(manga, normalizedSlug);
                    if (resolvedId != null) {
                        slugId = resolvedId;
                        slugForApi = melonService.buildSlugForMangaLibApi(normalizedSlug, slugId);
                        logger.info("Повторно запрашиваем метаданные для '{}' с ID {}", storedSlug, slugId);
                        metadata = melonService.getChaptersMetadataWithSlidesCount(slugForApi, true, true);
                    }
                }

                if (metadata == null || !Boolean.TRUE.equals(metadata.get("success"))) {
                    logger.error("Не удалось получить метаданные для slug '{}' (API '{}'): {}",
                        storedSlug, slugForApi, metadata != null ? metadata.get("error") : "Unknown error");
                    return null;
                }
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> allChaptersMetadata =
                (List<Map<String, Object>>) metadata.get("chapters");
            
            if (allChaptersMetadata == null || allChaptersMetadata.isEmpty()) {
                logger.warn("Не найдено глав в метаданных для slug: {} (API '{}')", storedSlug, slugForApi);
                return Map.of(
                    "has_updates", false,
                    "new_chapters", List.of()
                );
            }
            
            // Фильтруем ТОЛЬКО новые главы по метаданным С ПРОВЕРКОЙ slides_count
            List<Map<String, Object>> newChaptersMetadata = new ArrayList<>();
            Set<Double> candidateChapterKeys = new LinkedHashSet<>();
            Set<PartialBuildChapterNumber> candidateChapterNumbers = new LinkedHashSet<>();
            Set<String> candidateMelonChapterIds = new LinkedHashSet<>();
            int skippedByPaid = 0;
            int skippedByExists = 0;
            int skippedByNoSlides = 0;

            for (Map<String, Object> chapterMeta : allChaptersMetadata) {
                try {
                    Object volumeObj = chapterMeta.get("volume");
                    Object numberObj = chapterMeta.get("number");

                    Optional<ChapterNumeric> numericOpt = parseChapterNumeric(volumeObj, numberObj);
                    if (numericOpt.isEmpty()) {
                        logger.warn("Пропускаем главу без корректного номера при проверке обновлений: volume='{}', number='{}'",
                            volumeObj, numberObj);
                        continue;
                    }

                    ChapterNumeric numeric = numericOpt.get();
                    String melonChapterId = extractMelonChapterId(chapterMeta);

                    if (isChapterPaid(chapterMeta)) {
                        logger.debug("Глава {} (том {}) отмечена как платная, пропускаем при проверке обновлений",
                            numberObj, volumeObj);
                        skippedByPaid++;
                        continue;
                    }

                    if (chapterAlreadyExists(existingChapters, numeric, melonChapterId)) {
                        logger.debug("Глава {} (том {}) уже существует, пропускаем", numberObj, volumeObj);
                        skippedByExists++;
                        continue;
                    }

                    // ✅ КРИТИЧНАЯ ПРОВЕРКА: Есть ли страницы у главы?
                    Object slidesCountObj = chapterMeta.get("slides_count");
                    if (slidesCountObj != null) {
                        int slidesCount = slidesCountObj instanceof Number ? 
                            ((Number) slidesCountObj).intValue() : 0;
                        
                        if (slidesCount == 0) {
                            logger.warn("⚠️ Глава {} (том {}) пропущена: slides_count=0 (нет доступных изображений)", 
                                numberObj, volumeObj);
                            skippedByNoSlides++;
                            continue;
                        }
                        
                        logger.debug("✅ Глава {} (том {}) имеет {} страниц", numberObj, volumeObj, slidesCount);
                    } else {
                        // Если slides_count не определен - логируем предупреждение, но не блокируем
                        logger.debug("⚠️ Глава {} (том {}) не имеет информации о slides_count, будет проверена после парсинга", 
                            numberObj, volumeObj);
                    }

                    boolean added = false;
                    if (melonChapterId != null) {
                        added = candidateMelonChapterIds.add(melonChapterId);
                    }

                    if (!added) {
                        double key = numeric.compositeNumber();
                        added = candidateChapterKeys.add(key);
                    }

                    if (added) {
                        PartialBuildChapterNumber selection = PartialBuildChapterNumber.of(numeric.volume(), numeric.originalNumber());
                        if (selection != null) {
                            candidateChapterNumbers.add(selection);
                        }
                        newChaptersMetadata.add(chapterMeta);
                    }
                } catch (Exception e) {
                    logger.warn("Ошибка обработки метаданных главы: {}", e.getMessage());
                }
            }

            // Логируем детальную статистику фильтрации
            logger.info("📊 Статистика фильтрации глав для slug {}: всего={}, новых={}, пропущено: платные={}, существующие={}, без slides={}",
                storedSlug, allChaptersMetadata.size(), newChaptersMetadata.size(), 
                skippedByPaid, skippedByExists, skippedByNoSlides);

            if (newChaptersMetadata.isEmpty()) {
                logger.info("Новых глав с доступными изображениями не найдено для slug: {} (API '{}') (проверено {} глав)",
                    storedSlug, slugForApi, allChaptersMetadata.size());
                return Map.of(
                    "has_updates", false,
                    "new_chapters", List.of()
                );
            }

            logger.info("Найдено {} новых глав с подтвержденными изображениями для slug: {} (API '{}'), запускаем полный парсинг...",
                newChaptersMetadata.size(), storedSlug, slugForApi);
            
            // КРИТИЧНО: Связываем задачи ПЕРЕД запуском парсинга!
            // Это гарантирует что маппинг будет готов когда придут первые логи
            if (updateTaskId != null) {
                logger.info("🔗 PRE-LINKING: Подготовка маппинга для updateTaskId={}", updateTaskId);
            }
            
            // ТОЛЬКО если есть новые главы - запускаем полный парсинг
            // Это даст нам информацию о страницах для новых глав
            Map<String, Object> parseResult = melonService.startParsing(slugForApi);

            if (parseResult == null || !parseResult.containsKey("task_id")) {
                logger.error("Не удалось запустить парсинг для slug: {} (API '{}')", storedSlug, slugForApi);
                return null;
            }

            String parseTaskId = (String) parseResult.get("task_id");

            if (updateTaskId != null) {
                linkParseTaskToUpdate(parseTaskId, updateTaskId);
            } else {
                logger.warn("⚠️ updateTaskId is NULL! Логи парсинга не будут связаны с задачей обновления");
            }

            if (!waitForTaskCompletion(parseTaskId, normalizedSlug)) {
                logger.error("Парсинг не завершен для slug: {} (API '{}')", storedSlug, slugForApi);
                return null;
            }

            logger.info("Парсинг завершен для slug {}. Запускаем скачивание изображений перед импортом.", storedSlug);

            logger.info(
                "Запуск partial build для slug {}: chapterIds={}, chapterNumbers={}",
                storedSlug,
                candidateMelonChapterIds.size(),
                candidateChapterNumbers.size()
            );

            Map<String, Object> buildResult = melonService.buildManga(
                normalizedSlug,
                null,
                false,
                candidateMelonChapterIds,
                candidateChapterNumbers
            );
            if (buildResult == null || !buildResult.containsKey("task_id")) {
                logger.error("Не удалось запустить скачивание изображений для slug: {}", storedSlug);
                return null;
            }

            String buildTaskId = (String) buildResult.get("task_id");
            if (updateTaskId != null) {
                linkParseTaskToUpdate(buildTaskId, updateTaskId);
            }

            if (!waitForTaskCompletion(buildTaskId, normalizedSlug)) {
                logger.error("Скачивание изображений не завершено для slug: {}", storedSlug);
                return null;
            }

            logger.info("Скачивание изображений завершено для slug {}. Получаем обновленную информацию о манге.", storedSlug);

            // Получаем полную информацию о манге после парсинга и скачивания изображений
            Map<String, Object> mangaInfo = melonService.getMangaInfo(normalizedSlug);

            if ((mangaInfo == null || !mangaInfo.containsKey("content"))
                && !Objects.equals(normalizedSlug, storedSlug)) {
                logger.warn("Не удалось получить информацию по normalized slug '{}', пробуем stored slug '{}'", normalizedSlug, storedSlug);
                mangaInfo = melonService.getMangaInfo(storedSlug);
            }

            if (!hasUsableContent(mangaInfo)) {
                logger.error("Не удалось получить данные о манге для slug: {} (API '{}')", storedSlug, slugForApi);
                return null;
            }
            
            // Собираем полные данные о новых главах из спаршенной информации
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) mangaInfo.get("content");
            
            List<Map<String, Object>> newChaptersWithSlides = new ArrayList<>();
            Set<Double> processedChapterKeys = new HashSet<>();
            Set<String> processedMelonChapterIds = new HashSet<>();

            for (Map.Entry<String, Object> branchEntry : content.entrySet()) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> branchChapters = 
                    (List<Map<String, Object>>) branchEntry.getValue();
                
                for (Map<String, Object> chapter : branchChapters) {
                    try {
                        Object volumeObj = chapter.get("volume");
                        Object numberObj = chapter.get("number");

                        Optional<ChapterNumeric> numericOpt = parseChapterNumeric(volumeObj, numberObj);
                        if (numericOpt.isEmpty()) {
                            logger.warn("Пропускаем главу без корректного номера: volume='{}', number='{}'", volumeObj, numberObj);
                            continue;
                        }

                        ChapterNumeric numeric = numericOpt.get();
                        double chapterKey = numeric.compositeNumber();
                        String melonChapterId = extractMelonChapterId(chapter);

                        boolean matchesByExternalId = melonChapterId != null && candidateMelonChapterIds.contains(melonChapterId);
                        boolean matchesByNumber = candidateChapterKeys.contains(chapterKey);

                        if (!matchesByExternalId && !matchesByNumber) {
                            continue;
                        }

                        if (matchesByExternalId) {
                            if (processedMelonChapterIds.contains(melonChapterId)) {
                                continue;
                            }
                        } else if (processedChapterKeys.contains(chapterKey)) {
                            continue;
                        }

                        if (chapterAlreadyExists(existingChapters, numeric, melonChapterId)) {
                            continue;
                        }

                        if (isChapterPaid(chapter)) {
                            logger.debug("Глава {} (том {}) отмечена как платная, пропускаем при импорте", numberObj, volumeObj);
                            continue;
                        }

                        List<Map<String, Object>> slides = extractSlides(chapter.get("slides"));
                        if (slides.isEmpty()) {
                            logger.debug("Глава {} (том {}) пропущена: отсутствуют изображения после парсинга", numberObj, volumeObj);
                            continue;
                        }

                        Map<String, Object> chapterCopy = new LinkedHashMap<>(chapter);
                        if (melonChapterId != null) {
                            chapterCopy.put("melonChapterId", melonChapterId);
                        }
                        chapterCopy.put("slides", slides);
                        newChaptersWithSlides.add(chapterCopy);
                        if (matchesByExternalId) {
                            processedMelonChapterIds.add(melonChapterId);
                        } else {
                            processedChapterKeys.add(chapterKey);
                        }
                    } catch (Exception e) {
                        logger.warn("Ошибка обработки главы: {}", e.getMessage());
                    }
                }
            }
            
            if (newChaptersWithSlides.isEmpty()) {
                logger.info("Новыми признаны {} глав, но ни одна не содержит доступных изображений. Импорт отменен.",
                    newChaptersMetadata.size());
            } else {
                logger.info("Найдено {} новых глав с данными о страницах для slug: {} (API '{}')",
                    newChaptersWithSlides.size(), storedSlug, slugForApi);
            }
            
            return Map.of(
                "has_updates", !newChaptersWithSlides.isEmpty(),
                "new_chapters", newChaptersWithSlides,
                "manga_info", mangaInfo
            );
            
        } catch (Exception e) {
            logger.error("Ошибка проверки обновлений для slug '{}' (API '{}'): {}", storedSlug, slugForApi, e.getMessage());
            return null;
        }
    }

    private Integer resolveAndPersistSlugId(Manga manga, String normalizedSlug) {
        if (normalizedSlug == null || normalizedSlug.isBlank()) {
            return null;
        }

        try {
            logger.info("Попытка определить MangaLib ID для slug '{}' через каталог", normalizedSlug);
            Map<String, Integer> resolved = melonService.resolveSlugIds(Set.of(normalizedSlug), 50, 60, 1);
            Integer resolvedId = resolved.get(normalizedSlug);
            if (resolvedId != null) {
                manga.setMelonSlugId(resolvedId);
                mangaRepository.save(manga);
                logger.info("Для манги '{}' найден и сохранен MangaLib ID {}", manga.getTitle(), resolvedId);
                return resolvedId;
            }
            logger.warn("Не удалось определить MangaLib ID для slug '{}'", normalizedSlug);
        } catch (Exception ex) {
            logger.error("Ошибка при попытке определить MangaLib ID для slug '{}': {}", normalizedSlug, ex.getMessage());
        }
        return null;
    }

    private String normalizeSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return slug;
        }

        int delimiterIndex = slug.indexOf("--");
        if (delimiterIndex >= 0 && delimiterIndex + 2 < slug.length()) {
            return slug.substring(delimiterIndex + 2);
        }
        return slug;
    }

    /**
     * Импортирует только новые главы (парсинг уже выполнен в checkForUpdates)
     */
    private boolean parseAndImportNewChapters(String normalizedSlug, String slugForApi, Long mangaId,
                                              List<Map<String, Object>> newChapters,
                                              Map<String, Object> mangaInfo) {
        try {
            logger.info("Импорт {} новых глав для манги {} (normalizedSlug='{}', slugForApi='{}')",
                newChapters.size(), mangaId, normalizedSlug, slugForApi);
            
            // mangaInfo уже содержит все необходимые данные после парсинга
            // Импортируем только новые главы
            return importNewChaptersOnly(normalizedSlug, mangaId, newChapters, mangaInfo);
            
        } catch (Exception e) {
            logger.error("Ошибка импорта новых глав: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Импортирует только новые главы в систему
     */
    private boolean importNewChaptersOnly(String normalizedSlug, Long mangaId, List<Map<String, Object>> newChapters,
                                         Map<String, Object> mangaInfo) {
        try {
            if (mangaInfo == null || !mangaInfo.containsKey("content")) {
                logger.error("Не удалось получить информацию о манге из Melon");
                return false;
            }

            if (!hasUsableContent(mangaInfo)) {
                logger.error("Полученная информация о манге не содержит страниц. Импорт отменен.");
                return false;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) mangaInfo.get("content");

            Set<Double> newChapterKeys = newChapters.stream()
                .map(chapter -> parseChapterNumeric(chapter.get("volume"), chapter.get("number")))
                .flatMap(Optional::stream)
                .map(ChapterNumeric::compositeNumber)
                .collect(Collectors.toCollection(LinkedHashSet::new));

            Set<String> newChapterExternalIds = newChapters.stream()
                .map(this::extractMelonChapterId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

            if (newChapterKeys.isEmpty() && newChapterExternalIds.isEmpty()) {
                logger.error("Не удалось определить номера новых глав для импорта (получено {} записей)", newChapters.size());
                return false;
            }

            Set<Double> processedKeys = new HashSet<>();
            Set<String> processedExternalIds = new HashSet<>();
            List<Map<String, Object>> chaptersToImport = new ArrayList<>();
            boolean missingSlidesDetected = false;

            for (Object branchValue : content.values()) {
                if (!(branchValue instanceof List<?> branchChapters)) {
                    continue;
                }

                for (Object chapterObj : branchChapters) {
                    if (!(chapterObj instanceof Map<?, ?> rawChapter)) {
                        continue;
                    }

                    @SuppressWarnings("unchecked")
                    Map<String, Object> chapter = new LinkedHashMap<>((Map<String, Object>) rawChapter);

                    Optional<ChapterNumeric> numericOpt = parseChapterNumeric(chapter.get("volume"), chapter.get("number"));
                    if (numericOpt.isEmpty()) {
                        logger.warn("Пропускаем главу без корректного номера при импорте: volume='{}', number='{}'",
                            chapter.get("volume"), chapter.get("number"));
                        continue;
                    }

                    ChapterNumeric numeric = numericOpt.get();
                    double chapterKey = numeric.compositeNumber();
                    String melonChapterId = extractMelonChapterId(chapter);

                    boolean matchesByExternalId = melonChapterId != null && newChapterExternalIds.contains(melonChapterId);
                    boolean matchesByNumber = newChapterKeys.contains(chapterKey);

                    if (!matchesByExternalId && !matchesByNumber) {
                        continue;
                    }

                    if (matchesByExternalId) {
                        if (processedExternalIds.contains(melonChapterId)) {
                            continue;
                        }
                    } else if (processedKeys.contains(chapterKey)) {
                        continue;
                    }

                    if (isChapterPaid(chapter)) {
                        logger.debug("Глава {} пропущена при импорте новых глав, так как она платная", chapter.get("number"));
                        continue;
                    }

                    List<Map<String, Object>> slides = extractSlides(chapter.get("slides"));
                    if (slides.isEmpty()) {
                        logger.warn("Глава {} (том {}) помечена как новая, но MelonService не вернул изображения",
                            chapter.get("number"), chapter.get("volume"));
                        missingSlidesDetected = true;
                        continue;
                    }

                    if (matchesByNumber) {
                        processedKeys.add(chapterKey);
                    }
                    if (melonChapterId != null) {
                        processedExternalIds.add(melonChapterId);
                        chapter.put("melonChapterId", melonChapterId);
                    }
                    chapter.put("slides", slides);
                    chaptersToImport.add(chapter);
                }
            }

            if (missingSlidesDetected) {
                logger.error("Обнаружены новые главы без изображений. Импорт отменен до устранения проблемы в MelonService.");
                return false;
            }

            if (chaptersToImport.isEmpty()) {
                logger.error("После фильтрации не осталось глав для импорта. Новых глав по ключам: {}, внешних id: {}",
                    newChapterKeys.size(), newChapterExternalIds.size());
                return false;
            }

            logger.info("Будет импортировано {} новых глав", chaptersToImport.size());

            // Используем существующий метод импорта глав из MelonIntegrationService
            // но передаем только отфильтрованные главы
            return importChaptersDirectly(mangaId, chaptersToImport, normalizedSlug);

        } catch (Exception e) {
            logger.error("Ошибка импорта новых глав: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Импортирует главы напрямую, используя логику из MelonIntegrationService.
     * ✅ ИСПРАВЛЕНИЕ: Добавлена транзакционность с rollback при ошибках.
     */
    private boolean importChaptersDirectly(Long mangaId, List<Map<String, Object>> chapters, String normalizedSlug) {
        boolean overallSuccess = true;
        List<Long> createdChapterIds = new ArrayList<>(); // Для rollback при критических ошибках

        try {
            logger.info("🚀 Начало импорта {} глав для манги {}", chapters.size(), mangaId);
            
            for (Map<String, Object> chapterData : chapters) {
                Long chapterId = null;
                double chapterNumber = 0;
                
                try {
                    if (isChapterPaid(chapterData)) {
                        Object numberObj = chapterData.get("number");
                        logger.info("Глава {} помечена как платная, пропускаем импорт", numberObj);
                        continue;
                    }

                    Optional<ChapterNumeric> numericOpt = parseChapterNumeric(chapterData.get("volume"), chapterData.get("number"));
                    if (numericOpt.isEmpty()) {
                        logger.warn("Пропуск главы без корректного номера при импорте: volume='{}', number='{}'",
                            chapterData.get("volume"), chapterData.get("number"));
                        overallSuccess = false;
                        continue;
                    }

                    ChapterNumeric numeric = numericOpt.get();
                    chapterNumber = numeric.compositeNumber();
                    String melonChapterId = extractMelonChapterId(chapterData);

                    List<Map<String, Object>> slides = extractSlides(chapterData.get("slides"));
                    if (slides.isEmpty()) {
                        logger.warn("⚠️ Пропускаем главу {} (том {}): отсутствуют изображения после парсинга",
                            chapterData.get("number"), chapterData.get("volume"));
                        overallSuccess = false;
                        continue;
                    }

                    if (chapterExists(mangaId, numeric, melonChapterId)) {
                        logger.info("Глава {} уже существует для манги {}, пропускаем", chapterNumber, mangaId);
                        continue;
                    }

                    // Шаг 1: Создаем главу в ChapterService
                    Map<String, Object> chapterRequest = new HashMap<>();
                    chapterRequest.put("mangaId", mangaId);
                    chapterRequest.put("chapterNumber", chapterNumber);
                    chapterRequest.put("volumeNumber", numeric.volume());
                    chapterRequest.put("originalChapterNumber", numeric.originalNumber());
                    if (melonChapterId != null) {
                        chapterRequest.put("melonChapterId", melonChapterId);
                    }

                    Object titleObj = chapterData.get("name");
                    String title = (titleObj != null && !titleObj.toString().trim().isEmpty())
                        ? titleObj.toString().trim()
                        : "Глава " + chapterData.get("number");
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

                    if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                        logger.error("❌ Не удалось создать главу {}: статус {}", chapterNumber, response.getStatusCode());
                        overallSuccess = false;
                        continue;
                    }

                    chapterId = Long.parseLong(response.getBody().get("id").toString());
                    createdChapterIds.add(chapterId);
                    logger.debug("✅ Создана глава {} с ID={}", chapterNumber, chapterId);

                    // Шаг 2: Импортируем страницы главы
                    String chapterFolderName = melonService.resolveChapterFolderName(
                        chapterData.get("number") != null ? chapterData.get("number").toString() : null,
                        chapterData.get("name"),
                        numeric.volume(),
                        chapterData,
                        chapterId
                    );

                    boolean pagesImported = importChapterPages(chapterId, slides, normalizedSlug, chapterFolderName);
                    
                    if (!pagesImported) {
                        logger.error("❌ Не удалось импортировать страницы для главы {}, откатываем создание главы", chapterNumber);
                        deleteChapterSilently(chapterId);
                        createdChapterIds.remove(chapterId);
                        overallSuccess = false;
                        continue;
                    }

                    // Шаг 3: Проверяем что страницы действительно импортированы
                    int pageCount = getChapterPageCount(chapterId);
                    if (pageCount == 0) {
                        logger.error("❌ Глава {} создана, но page_count=0! Откатываем создание главы", chapterNumber);
                        deleteChapterSilently(chapterId);
                        createdChapterIds.remove(chapterId);
                        overallSuccess = false;
                        continue;
                    }

                    logger.info("✅ Успешно импортирована глава {} для манги {} ({} страниц)", 
                        chapterNumber, mangaId, pageCount);

                } catch (Exception chapterEx) {
                    logger.error("❌ Ошибка импорта главы {}: {}", chapterNumber, chapterEx.getMessage(), chapterEx);
                    
                    // Откатываем созданную главу если была создана
                    if (chapterId != null) {
                        try {
                            deleteChapterSilently(chapterId);
                            createdChapterIds.remove(chapterId);
                            logger.info("🔄 Откатили создание главы {} (ID={})", chapterNumber, chapterId);
                        } catch (Exception rollbackEx) {
                            logger.error("⚠️ Не удалось откатить главу {} (ID={}): {}", 
                                chapterNumber, chapterId, rollbackEx.getMessage());
                        }
                    }
                    
                    overallSuccess = false;
                }
            }

            logger.info("📊 Завершен импорт глав: успешно={}, создано глав={}", 
                overallSuccess, createdChapterIds.size());
            return overallSuccess;

        } catch (Exception e) {
            logger.error("❌ Критическая ошибка импорта глав для манги {}: {}", mangaId, e.getMessage(), e);
            
            // При критической ошибке откатываем ВСЕ созданные главы
            if (!createdChapterIds.isEmpty()) {
                logger.warn("🔄 Откатываем {} созданных глав из-за критической ошибки", createdChapterIds.size());
                for (Long chapterId : createdChapterIds) {
                    try {
                        deleteChapterSilently(chapterId);
                        logger.debug("🔄 Откатили главу ID={}", chapterId);
                    } catch (Exception rollbackEx) {
                        logger.error("⚠️ Не удалось откатить главу {}: {}", chapterId, rollbackEx.getMessage());
                    }
                }
            }
            
            return false;
        }
    }

    /**
     * Получает количество страниц главы из ChapterService.
     * Используется для проверки успешности импорта страниц.
     * 
     * @param chapterId ID главы
     * @return Количество страниц или 0 если не удалось получить
     */
    private int getChapterPageCount(Long chapterId) {
        try {
            String url = chapterServiceUrl + "/api/chapters/" + chapterId;
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object pageCountObj = response.getBody().get("pageCount");
                int pageCount = pageCountObj instanceof Number ? ((Number) pageCountObj).intValue() : 0;
                logger.debug("Глава {}: pageCount={}", chapterId, pageCount);
                return pageCount;
            } else {
                logger.warn("Не удалось получить page_count для главы {}: статус {}", 
                    chapterId, response.getStatusCode());
                return 0;
            }
        } catch (Exception e) {
            logger.error("Ошибка получения page_count для главы {}: {}", chapterId, e.getMessage());
            return 0;
        }
    }

    /**
     * Проверяет существование главы
     */
    private boolean chapterExists(Long mangaId, ChapterNumeric numeric, String melonChapterId) {
        if (melonChapterId != null && !melonChapterId.isBlank()) {
            if (chapterExistsRemoteByExternalId(mangaId, melonChapterId)) {
                return true;
            }
        }

        if (numeric == null) {
            return false;
        }

        double composite = numeric.compositeNumber();
        double raw = numeric.originalNumber();
        double scaled = numeric.volume() * 100d + raw;

        if (chapterExistsRemote(mangaId, composite)) {
            return true;
        }

        if (chapterExistsRemote(mangaId, raw)) {
            return true;
        }

        return chapterExistsRemote(mangaId, scaled);
    }

    private boolean chapterExistsRemote(Long mangaId, double chapterNumber) {
        if (!Double.isFinite(chapterNumber)) {
            return false;
        }

        String url = String.format("%s/api/chapters/exists?mangaId=%d&chapterNumber=%f",
            chapterServiceUrl, mangaId, chapterNumber);
        try {
            ResponseEntity<Boolean> response = restTemplate.getForEntity(url, Boolean.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return Boolean.TRUE.equals(response.getBody());
            }

            throw new IllegalStateException(String.format(
                "Не удалось проверить существование главы %f для манги %d: статус %s",
                chapterNumber, mangaId, response.getStatusCode()));
        } catch (Exception e) {
            throw new IllegalStateException(String.format(
                "Не удалось проверить существование главы %f для манги %d",
                chapterNumber, mangaId), e);
        }
    }

    private boolean chapterExistsRemoteByExternalId(Long mangaId, String melonChapterId) {
        if (melonChapterId == null || melonChapterId.isBlank()) {
            return false;
        }

        String encodedId = UriUtils.encode(melonChapterId, StandardCharsets.UTF_8);
        String url = String.format("%s/api/chapters/exists?mangaId=%d&melonChapterId=%s",
            chapterServiceUrl, mangaId, encodedId);
        try {
            ResponseEntity<Boolean> response = restTemplate.getForEntity(url, Boolean.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return Boolean.TRUE.equals(response.getBody());
            }

            throw new IllegalStateException(String.format(
                "Не удалось проверить существование внешней главы %s для манги %d: статус %s",
                melonChapterId, mangaId, response.getStatusCode()));
        } catch (Exception e) {
            throw new IllegalStateException(String.format(
                "Не удалось проверить существование внешней главы %s для манги %d",
                melonChapterId, mangaId), e);
        }
    }

    /**
     * Импортирует страницы главы из Melon Service в ImageStorageService
     * Копия логики из MelonIntegrationService.importChapterPagesFromMelonService
     */
    private boolean importChapterPages(Long chapterId, List<Map<String, Object>> slides,
                                   String normalizedSlug, String chapterFolderName) {
        if (slides == null || slides.isEmpty()) {
            logger.warn("Импорт страниц для главы {} отменен: список слайдов пуст", chapterId);
            return false;
        }

        try {
            logger.info("Начинается импорт {} страниц для главы {}", slides.size(), chapterId);

            String safeSlug = normalizedSlug != null ? normalizedSlug.trim() : "";
            String safeFolder = (chapterFolderName != null && !chapterFolderName.isBlank())
                ? chapterFolderName.trim()
                : String.valueOf(chapterId);

            if (safeSlug.isEmpty()) {
                logger.error("Невозможно импортировать страницы для главы {}: пустой slug", chapterId);
                return false;
            }

            URI batchUri = UriComponentsBuilder.fromUriString(melonServiceUrl)
                .pathSegment("chapter-images")
                .pathSegment(safeSlug)
                .pathSegment(safeFolder)
                .build()
                .toUri();

            ResponseEntity<MelonChapterImagesResponse> response = restTemplate.exchange(
                batchUri,
                HttpMethod.GET,
                null,
                MelonChapterImagesResponse.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                logger.error("Не удалось получить изображения для главы {}: статус {}", chapterId, response.getStatusCode());
                return false;
            }

            MelonChapterImagesResponse batchResponse = response.getBody();
            List<MelonImageData> images = batchResponse.getImages();

            if (images == null || images.isEmpty()) {
                logger.warn("MelonService вернул пустой список изображений для главы {}", chapterId);
                return false;
            }

            int uploaded = 0;
            int fallbackPage = 1;
            final String uploadUrlBase = buildImageStorageUrl("/api/images/chapter/" + chapterId + "/page/");

            for (MelonImageData imageData : images) {
                Integer pageNumber;
                if (imageData.getPage() != null) {
                    pageNumber = imageData.getPage();
                    fallbackPage = pageNumber + 1;
                } else {
                    pageNumber = fallbackPage++;
                }
                String format = imageData.getFormat();
                if (format == null || format.isBlank()) {
                    format = "jpg";
                }
                format = format.replace(".", "").toLowerCase(Locale.ROOT);
                if (format.isBlank()) {
                    format = "jpg";
                }

                try {
                    byte[] imageBytes = Base64.getDecoder().decode(imageData.getData());

                    MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                    final String filename = pageNumber + "." + format;
                    body.add("file", new ByteArrayResource(imageBytes) {
                        @Override
                        public String getFilename() {
                            return filename;
                        }
                    });

                    HttpHeaders uploadHeaders = new HttpHeaders();
                    uploadHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);

                    HttpEntity<MultiValueMap<String, Object>> uploadEntity = new HttpEntity<>(body, uploadHeaders);

                    String uploadUrl = uploadUrlBase + pageNumber;
                    ResponseEntity<?> uploadResponse = restTemplate.postForEntity(uploadUrl, uploadEntity, Map.class);

                    if (uploadResponse.getStatusCode().is2xxSuccessful()) {
                        uploaded++;
                    } else {
                        logger.error("Не удалось загрузить страницу {} для главы {}: {}",
                            pageNumber, chapterId, uploadResponse.getStatusCode());
                    }

                } catch (Exception e) {
                    logger.error("Ошибка загрузки страницы {} для главы {}: {}",
                        pageNumber, chapterId, e.getMessage());
                }
            }

            if (uploaded == 0) {
                logger.error("Не удалось загрузить ни одной страницы для главы {}", chapterId);
                return false;
            }

            updateChapterPageCount(chapterId);
            logger.info("Завершен импорт {} страниц для главы {}", uploaded, chapterId);
            return true;

        } catch (Exception e) {
            logger.error("Ошибка импорта страниц для главы {}: {}", chapterId, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Ждет завершения задачи
     */
    private boolean waitForTaskCompletion(String taskId, String normalizedSlug) throws InterruptedException {
    final int pollIntervalMs = 2000;
    final int maxMissingStatusAttempts = 120;

        int attempts = 0;
        int missingStatusStreak = 0;
        Map<String, Object> lastStatus = null;

        while (true) {
            Thread.sleep(pollIntervalMs);
            attempts++;

            lastStatus = melonService.getTaskStatus(taskId);
            String statusValue = lastStatus != null ? Objects.toString(lastStatus.get("status"), null) : null;

            if (statusValue != null && "completed".equalsIgnoreCase(statusValue)) {
                return true;
            }

            if (statusValue != null && ("failed".equalsIgnoreCase(statusValue) || "cancelled".equalsIgnoreCase(statusValue))) {
                logger.error("Задача {} завершилась с ошибкой: {}", taskId, lastStatus.get("message"));
                return false;
            }

            boolean statusMissing = statusValue == null || statusValue.isBlank()
                || "not_found".equalsIgnoreCase(statusValue)
                || "unknown".equalsIgnoreCase(statusValue)
                || "error".equalsIgnoreCase(statusValue);

            if (statusMissing) {
                missingStatusStreak++;

                if (normalizedSlug != null && !normalizedSlug.isBlank()
                    && missingStatusStreak >= 3
                    && missingStatusStreak % 3 == 0) {
                    Map<String, Object> info = melonService.getMangaInfo(normalizedSlug);
                    if (hasUsableContent(info)) {
                        logger.warn("Статус задачи {} недоступен, но данные для '{}' получены и содержат страницы. Продолжаем обработку.",
                            taskId, normalizedSlug);
                        return true;
                    }

                    Object debugInfo = (info != null) ? info.keySet() : "null";
                    logger.debug("Задача {} пока не предоставляет статус, данные для '{}' недоступны или неполные (ключи: {})",
                        taskId, normalizedSlug, debugInfo);
                }

                if (missingStatusStreak >= maxMissingStatusAttempts) {
                    logger.error("Статус задачи {} недоступен после {} попыток. Последний ответ: {}", taskId, missingStatusStreak, lastStatus);
                    return false;
                }
            } else {
                missingStatusStreak = 0;
            }

            if (attempts % 150 == 0) {
                logger.info("Ожидание завершения задачи {} продолжается: {} попыток, текущий статус='{}'", taskId, attempts, statusValue);
            }
        }
    }

    private boolean hasUsableContent(Map<String, Object> mangaInfo) {
        if (mangaInfo == null || mangaInfo.isEmpty()) {
            return false;
        }

        Object contentObj = mangaInfo.get("content");
        if (!(contentObj instanceof Map<?, ?> contentMap)) {
            return false;
        }

        for (Object branchValue : contentMap.values()) {
            if (!(branchValue instanceof List<?> chapters)) {
                continue;
            }

            for (Object chapterObj : chapters) {
                if (!(chapterObj instanceof Map<?, ?> chapterMap)) {
                    continue;
                }

                List<Map<String, Object>> slides = extractSlides(chapterMap.get("slides"));
                if (!slides.isEmpty()) {
                    return true;
                }
            }
        }

        return false;
    }

    private List<Map<String, Object>> extractSlides(Object slidesObj) {
        if (!(slidesObj instanceof List<?> rawSlides) || rawSlides.isEmpty()) {
            return Collections.emptyList();
        }

        List<Map<String, Object>> slides = new ArrayList<>(rawSlides.size());
        for (Object item : rawSlides) {
            if (item instanceof Map<?, ?> slideMap) {
                @SuppressWarnings("unchecked")
                Map<String, Object> typedSlide = (Map<String, Object>) slideMap;
                slides.add(typedSlide);
            }
        }

        return slides;
    }

    private boolean chapterAlreadyExists(Set<Double> existingChapterNumbers, ChapterNumeric numeric) {
        if (existingChapterNumbers == null || existingChapterNumbers.isEmpty()) {
            return false;
        }

        double compositeKey = numeric.compositeNumber();
        double rawNumber = numeric.originalNumber();
        double volumeScaledKey = numeric.volume() * 100d + rawNumber;

        return containsChapterNumber(existingChapterNumbers, compositeKey)
            || containsChapterNumber(existingChapterNumbers, rawNumber)
            || containsChapterNumber(existingChapterNumbers, volumeScaledKey);
    }

    private boolean containsChapterNumber(Set<Double> existingChapterNumbers, double candidate) {
        final double epsilon = 0.0001d;
        for (Double value : existingChapterNumbers) {
            if (Math.abs(value - candidate) < epsilon) {
                return true;
            }
        }
        return false;
    }

    private Optional<ChapterNumeric> parseChapterNumeric(Object volumeObj, Object numberObj) {
        if (numberObj == null) {
            return Optional.empty();
        }

        int volume = 1;
        if (volumeObj != null) {
            try {
                String volumeText = volumeObj.toString().trim();
                if (!volumeText.isEmpty()) {
                    volume = Integer.parseInt(volumeText);
                }
            } catch (NumberFormatException ex) {
                logger.warn("Не удалось распарсить номер тома '{}': {}", volumeObj, ex.getMessage());
            }
        }

        try {
            double originalNumber = Double.parseDouble(numberObj.toString());
            double composite = volume * 10000d + originalNumber;
            return Optional.of(new ChapterNumeric(volume, originalNumber, composite));
        } catch (NumberFormatException ex) {
            logger.warn("Не удалось распарсить номер главы '{}': {}", numberObj, ex.getMessage());
            return Optional.empty();
        }
    }

    private void updateChapterPageCount(Long chapterId) {
        try {
            String countUrl = buildImageStorageUrl("/api/images/chapter/" + chapterId + "/count");
            ResponseEntity<Integer> pageCountResponse = restTemplate.getForEntity(countUrl, Integer.class);

            if (pageCountResponse.getStatusCode().is2xxSuccessful() && pageCountResponse.getBody() != null) {
                Integer pageCount = pageCountResponse.getBody();

                Map<String, Object> updateRequest = new HashMap<>();
                updateRequest.put("pageCount", pageCount);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(updateRequest, headers);

                String updateUrl = "http://chapter-service:8082/api/chapters/" + chapterId + "/pagecount";
                restTemplate.exchange(updateUrl, HttpMethod.PUT, entity, Void.class);
                logger.info("Обновлено количество страниц для главы {}: {}", chapterId, pageCount);
            } else {
                logger.warn("Не удалось получить количество страниц для главы {}: статус {}", chapterId,
                    pageCountResponse.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("Не удалось обновить количество страниц для главы {}: {}", chapterId, e.getMessage());
        }
    }

    private String buildImageStorageUrl(String relativePath) {
        String base = Optional.ofNullable(serviceUrlProperties)
            .map(ServiceUrlProperties::getImageStorageServiceUrl)
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .orElse("http://image-storage-service:8083");

        String normalizedBase = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        String normalizedPath = relativePath.startsWith("/") ? relativePath : "/" + relativePath;
        return normalizedBase + normalizedPath;
    }

    private void deleteChapterSilently(Long chapterId) {
        try {
            restTemplate.delete("http://chapter-service:8082/api/chapters/" + chapterId);
            logger.info("Удалена глава {} после неудачного импорта", chapterId);
        } catch (Exception e) {
            logger.warn("Не удалось удалить главу {} после неудачного импорта: {}", chapterId, e.getMessage());
        }
    }

    private record ExistingChapters(Set<Double> chapterNumbers, Set<String> melonChapterIds) {}

    private record ChapterNumeric(int volume, double originalNumber, double compositeNumber) {}

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
