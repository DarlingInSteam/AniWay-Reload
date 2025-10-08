package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.entity.Genre;
import shadowshift.studio.mangaservice.entity.Tag;
import shadowshift.studio.mangaservice.repository.MangaRepository;
import shadowshift.studio.mangaservice.websocket.ProgressWebSocketHandler;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Сервис для интеграции с MelonService.
 * Предоставляет методы для парсинга, импорта и управления мангой через внешний сервис Melon.
 *
 * @author ShadowShiftStudio
 */
@Service
public class MelonIntegrationService {

    private static final Logger logger = LoggerFactory.getLogger(MelonIntegrationService.class);

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private MangaRepository mangaRepository;

    @Autowired
    private ImportTaskService importTaskService;

    @Autowired
    private ProgressWebSocketHandler webSocketHandler;

    @Autowired
    private GenreService genreService;

    @Autowired
    private TagService tagService;

    @Autowired
    @Lazy
    private AutoParsingService autoParsingService;

    /**
     * URL сервиса Melon.
     */
    @Value("${melon.service.url:http://melon-service:8084}")
    private String melonServiceUrl;

    /**
     * Публичный URL сервиса Melon.
     */
    @Value("${melon.service.public.url:http://localhost:8084}")
    private String melonServicePublicUrl;

    @Autowired
    private FullParsingTaskRunner fullParsingTaskRunner;
    
    // Маппинг fullParsingTaskId -> autoParsingTaskId для связывания логов buildTask
    private final Map<String, String> fullParsingToAutoParsingTask = new HashMap<>();
    
    /**
     * Регистрирует связь между fullParsingTaskId и autoParsingTaskId.
     * Используется AutoParsingService для того, чтобы логи от buildTask попадали в правильную задачу.
     */
    public void registerAutoParsingLink(String fullParsingTaskId, String autoParsingTaskId) {
        if (fullParsingTaskId != null && autoParsingTaskId != null) {
            fullParsingToAutoParsingTask.put(fullParsingTaskId, autoParsingTaskId);
            logger.info("Зарегистрирована связь fullParsingTaskId={} → autoParsingTaskId={}", 
                fullParsingTaskId, autoParsingTaskId);
        }
    }

    /**
     * Нормализует slug для MangaLib, убирая префикс ID-- если он есть.
     * MangaLib изменил формат: теперь slug'и имеют формат "ID--slug" (например "7580--i-alone-level-up")
     * Для совместимости с существующими записями в БД нормализуем до "i-alone-level-up"
     * 
     * @param slug исходный slug (может быть "7580--i-alone-level-up" или "i-alone-level-up")
     * @return нормализованный slug без ID (всегда "i-alone-level-up")
     */
    private String normalizeSlugForMangaLib(String slug) {
        if (slug == null || slug.isEmpty()) {
            return slug;
        }
        
        // Проверяем формат "ID--slug"
        if (slug.contains("--")) {
            String[] parts = slug.split("--", 2);
            // Если первая часть - число (ID), возвращаем вторую часть (slug)
            if (parts.length == 2 && parts[0].matches("\\d+")) {
                logger.debug("Нормализация MangaLib slug: '{}' -> '{}'", slug, parts[1]);
                return parts[1];
            }
        }
        
        // Если формат не "ID--slug", возвращаем как есть
        return slug;
    }

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
     * Запускает пакетный парсинг списка манги с автоматическим импортом
     */
    public Map<String, Object> startBatchParsing(List<String> slugs, String parser, Boolean autoImport) {
        String url = melonServiceUrl + "/batch-parse";

        Map<String, Object> request = new HashMap<>();
        request.put("slugs", slugs);
        request.put("parser", parser);
        request.put("auto_import", autoImport);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

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
        // ВАЖНО: Нормализуем slug в самом начале (убираем ID)
        // MelonService сохраняет файлы БЕЗ ID: "sweet-home-kim-carnby-.json"
        // Но slug из каталога приходит с ID: "3754--sweet-home-kim-carnby-"
        String normalizedSlug = normalizeSlugForMangaLib(slug);
        logger.info("🔧 Нормализация slug: original='{}', normalized='{}'", slug, normalizedSlug);
        
        try {
            updateFullParsingTask(fullTaskId, "running", 5, "Ожидание завершения парсинга JSON...", null);
            Map<String, Object> finalStatus = waitForTaskCompletion(parseTaskId);
            if (!"completed".equalsIgnoreCase(String.valueOf(finalStatus.get("status")))) {
                updateFullParsingTask(fullTaskId, "failed", 100,
                    "Парсинг завершился неуспешно: " + finalStatus.get("message"), finalStatus);
                return;
            }
            
            updateFullParsingTask(fullTaskId, "running", 50, "Парсинг JSON завершен, запускаем скачивание изображений...", null);
            Map<String, Object> buildResult = buildManga(normalizedSlug, null);
            if (buildResult == null || !buildResult.containsKey("task_id")) {
                updateFullParsingTask(fullTaskId, "failed", 100,
                    "Не удалось запустить скачивание изображений", buildResult);
                return;
            }
            String buildTaskId = (String) buildResult.get("task_id");
            
            // Если этот fullParsingTask связан с autoParsingTask, то и buildTaskId тоже нужно связать
            String autoParsingTaskId = fullParsingToAutoParsingTask.get(fullTaskId);
            if (autoParsingTaskId != null) {
                autoParsingService.linkAdditionalTaskId(buildTaskId, autoParsingTaskId);
                logger.info("Связали buildTaskId={} с autoParsingTaskId={} через fullTaskId={}", 
                    buildTaskId, autoParsingTaskId, fullTaskId);
            }
            
            updateFullParsingTask(fullTaskId, "running", 60, "Скачивание изображений запущено, ожидание завершения...", null);
            Map<String, Object> buildStatus = waitForTaskCompletion(buildTaskId);
            if ("completed".equalsIgnoreCase(String.valueOf(buildStatus.get("status")))) {
                // Билд завершен успешно, запускаем импорт
                updateFullParsingTask(fullTaskId, "running", 70, "Скачивание завершено, запускаем импорт в базу данных...", null);
                logger.info("Билд завершен для slug={}, запускаем импорт", slug);
                
                try {
                    // Используем ранее нормализованный slug (объявлен в начале метода)
                    logger.info("📥 Запрос manga-info для normalized slug='{}'", normalizedSlug);
                    
                    // Получаем mangaInfo ДО удаления манги из MelonService
                    Map<String, Object> mangaInfo = getMangaInfo(normalizedSlug);
                    
                    // Создаем задачу импорта
                    String importTaskId = importTaskService.createTask(fullTaskId).getTaskId();
                    logger.info("Создана задача импорта: importTaskId={} для fullTaskId={}", importTaskId, fullTaskId);
                    
                    // КРИТИЧНО: Импортируем мангу используя normalizedSlug (без ID), не оригинальный slug!
                    // MelonService сохраняет файлы БЕЗ ID (например: "made-of-stardust.json")
                    // Поэтому getMangaInfo() должен искать нормализованный файл
                    importMangaWithProgressAsync(importTaskId, normalizedSlug, null).get();
                    logger.info("Импорт завершен для slug={}, очищаем данные из MelonService", slug);
                    
                    // После успешного импорта - удаляем из MelonService
                    // ВАЖНО: используем нормализованный slug (без ID)
                    updateFullParsingTask(fullTaskId, "running", 95, "Импорт завершен, очистка данных из MelonService...", null);
                    Map<String, Object> deleteResult = deleteManga(normalizedSlug);
                    if (deleteResult != null && Boolean.TRUE.equals(deleteResult.get("success"))) {
                        logger.info("Данные успешно удалены из MelonService для slug={} (normalized={})", slug, normalizedSlug);
                    } else {
                        logger.warn("Не удалось удалить данные из MelonService для slug={} (normalized={}): {}", 
                            slug, normalizedSlug, deleteResult);
                    }
                    
                    // Формируем результат (mangaInfo уже получен ранее)
                    Map<String, Object> result = new HashMap<>();
                    result.put("filename", slug);
                    result.put("parse_completed", true);
                    result.put("build_completed", true);
                    result.put("import_completed", true);
                    result.put("cleanup_completed", true);
                    if (mangaInfo != null) {
                        result.put("title", mangaInfo.get("localized_name"));
                        result.put("manga_info", mangaInfo);
                    }
                    updateFullParsingTask(fullTaskId, "completed", 100,
                        "Полный парсинг завершен успешно! JSON, изображения импортированы, данные очищены.", result);
                        
                } catch (Exception importEx) {
                    logger.error("Ошибка при импорте или очистке для slug={}: {}", slug, importEx.getMessage(), importEx);
                    updateFullParsingTask(fullTaskId, "failed", 100,
                        "Ошибка при импорте: " + importEx.getMessage(), null);
                }
            } else {
                updateFullParsingTask(fullTaskId, "failed", 100,
                    "Скачивание изображений завершилось неуспешно: " + buildStatus.get("message"), buildStatus);
            }
        } catch (Exception e) {
            updateFullParsingTask(fullTaskId, "failed", 100,
                "Ошибка при полном парсинге: " + e.getMessage(), null);
        } finally {
            // Очищаем маппинг после завершения (успех или ошибка)
            fullParsingToAutoParsingTask.remove(fullTaskId);
            logger.debug("Очищен маппинг fullParsingTaskId={}", fullTaskId);
        }
    }

    // Хранилище для отслеживания задач полного парсинга
    private final Map<String, Map<String, Object>> fullParsingTasks = new HashMap<>();

    /**
     * Обновляет статус задачи полного парсинга и отправляет через WebSocket
     */
    private void updateFullParsingTask(String taskId, String status, int progress, String message, Map<String, Object> result) {
        Map<String, Object> existingTask = fullParsingTasks.get(taskId);
        Map<String, Object> task = existingTask != null ? new HashMap<>(existingTask) : new HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        task.put("task_id", taskId);
        task.put("status", status);
        task.put("progress", progress);
        task.put("message", message);
        task.put("updated_at", now.toString());

        if (!task.containsKey("started_at")) {
            task.put("started_at", now.toString());
        }

        LocalDateTime startedAt = parseDateTime(task.get("started_at"));
        Duration elapsed = Duration.between(startedAt, now);
        task.put("duration_ms", elapsed.toMillis());
        task.put("duration_seconds", elapsed.getSeconds());
        task.put("duration_formatted", formatDuration(elapsed));

        if ("completed".equalsIgnoreCase(status) || "failed".equalsIgnoreCase(status) || "cancelled".equalsIgnoreCase(status)) {
            task.put("finished_at", now.toString());
        }

        if (result != null) {
            task.put("result", result);
            Object metrics = result.get("metrics");
            if (metrics != null) {
                task.put("metrics", metrics);
            }
            if (result.containsKey("import_task_id")) {
                task.put("import_task_id", result.get("import_task_id"));
            }
        }

        fullParsingTasks.put(taskId, task);

        // Отправляем обновление прогресса через WebSocket
        webSocketHandler.sendProgressUpdate(taskId, task);
        webSocketHandler.sendLogMessage(taskId, "INFO", message);
    }

    private LocalDateTime parseDateTime(Object value) {
        if (value instanceof LocalDateTime ldt) {
            return ldt;
        }
        if (value instanceof String str) {
            try {
                return LocalDateTime.parse(str);
            } catch (Exception ignored) {
                // fall through
            }
        }
        return LocalDateTime.now();
    }

    private String formatDuration(Duration duration) {
        long seconds = duration.getSeconds();
        long absSeconds = Math.abs(seconds);
        long hours = absSeconds / 3600;
        long minutes = (absSeconds % 3600) / 60;
        long secs = absSeconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
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
        int attempts = 0; // БЕЗ таймаута - некоторые манги парсятся 100+ минут

        do {
            Thread.sleep(2000); // жде�� 2 секунды
            status = getTaskStatus(taskId);
            attempts++;

            // Логируем каждые 30 проверок (1 минута)
            if (attempts % 30 == 0) {
                int minutes = attempts * 2 / 60;
                logger.info("Ожидание задачи {}: {}min, статус: {}", 
                    taskId, minutes, status != null ? status.get("status") : "null");
            }

        } while (status != null &&
                !"completed".equalsIgnoreCase(String.valueOf(status.get("status"))) &&
                !"failed".equalsIgnoreCase(String.valueOf(status.get("status"))));

        return status != null ? status : Map.of("status", "failed", "message", "Не удалось получить статус задачи");
    }

    /**
     * Получает статус ��адачи парсинга
     */
    public Map<String, Object> getTaskStatus(String taskId) {
        String url = melonServiceUrl + "/status/" + taskId;
        
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = response.getBody();
            
            if (body != null) {
                return body;
            } else {
                logger.warn("Пустой ответ при запросе статуса задачи: {}", taskId);
                return Map.of(
                    "status", "unknown",
                    "message", "Пустой ответ от MelonService"
                );
            }
            
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            logger.warn("Задача не найдена в MelonService: {} (возможно, еще не создана или уже удалена)", taskId);
            return Map.of(
                "status", "not_found",
                "message", "Задача не найдена в MelonService"
            );
            
        } catch (Exception e) {
            logger.error("Ошибка получения статуса задачи {}: {}", taskId, e.getMessage());
            return Map.of(
                "status", "error",
                "message", "Ошибка получения статуса: " + e.getMessage()
            );
        }
    }

    public List<Map<String, Object>> listTasks() {
        String url = melonServiceUrl + "/tasks";

        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );

            List<Map<String, Object>> body = response.getBody();
            if (body != null) {
                return body;
            }
        } catch (Exception e) {
            logger.error("Ошибка получения списка задач из MelonService: {}", e.getMessage());
        }

        return Collections.emptyList();
    }

    /**
     * Запускает построение архива манги
     */
    public Map<String, Object> buildManga(String filename, String branchId) {
        String url = melonServiceUrl + "/build";

        Map<String, String> request = new HashMap<>();
        request.put("slug", filename);  // MelonService ожидает "slug", а не "filename"
        request.put("parser", "mangalib");
        request.put("type", "simple");  // MelonService ожидает "type", а не "archive_type"

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
     * Получает информацию о спаршенной манге с retry логикой.
     * Пытается получить JSON данные несколько раз с задержкой,
     * т.к. при массовом парсинге MelonService может не успевать создавать файлы.
     */
    public Map<String, Object> getMangaInfo(String filename) {
        String url = melonServiceUrl + "/manga-info/" + filename;
        
        int maxRetries = 5;
        int retryDelayMs = 3000; // 3 секунды между попытками
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info("Получение manga-info для '{}' (попытка {}/{})", filename, attempt, maxRetries);
                ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
                Map<String, Object> body = response.getBody();
                
                if (body != null) {
                    logger.info("Успешно получен manga-info для '{}'", filename);
                    return body;
                } else {
                    logger.warn("Пустой ответ при получении manga-info для '{}', попытка {}/{}", 
                        filename, attempt, maxRetries);
                }
                
            } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
                logger.warn("JSON файл не найден для '{}' (попытка {}/{}): {}. " +
                    "Возможно, MelonService еще не завершил создание файла. Повторная попытка через {}ms...",
                    filename, attempt, maxRetries, e.getMessage(), retryDelayMs);
                    
            } catch (Exception e) {
                logger.error("Ошибка получения manga-info для '{}' (попытка {}/{}): {}", 
                    filename, attempt, maxRetries, e.getMessage());
            }
            
            // Если не последняя попытка - ждем перед retry
            if (attempt < maxRetries) {
                try {
                    Thread.sleep(retryDelayMs);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    logger.error("Прервано ожидание retry для '{}'", filename);
                    break;
                }
            }
        }
        
        // Если все попытки исчерпаны - возвращаем пустой результат
        logger.error("Не удалось получить manga-info для '{}' после {} попыток", filename, maxRetries);
        return Map.of(
            "error", "Не удалось получить manga-info после " + maxRetries + " попыток",
            "filename", filename
        );
    }

    /**
     * Получает ТОЛЬКО метаданные глав без парсинга страниц.
     * Быстрая операция для проверки наличия новых глав.
     * 
     * @param slug Slug манги
     * @return Map с метаданными глав (success, total_chapters, chapters)
     */
    public Map<String, Object> getChaptersMetadataOnly(String slug) {
        try {
            String url = melonServiceUrl + "/manga-info/" + slug + "/chapters-only?parser=mangalib";
            
            logger.info("Получение метаданных глав для slug: {}", slug);
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> result = response.getBody();
            
            if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                logger.info("Успешно получены метаданные для {}: {} глав", 
                    slug, result.get("total_chapters"));
                return result;
            } else {
                logger.error("Не удалось получить метаданные глав для slug '{}': {}", 
                    slug, result != null ? result.get("error") : "Unknown error");
                return Map.of("success", false, "error", 
                    result != null ? result.get("error") : "Unknown error");
            }
            
        } catch (Exception e) {
            logger.error("Ошибка получения метаданных глав для slug '{}': {}", slug, e.getMessage());
            return Map.of("success", false, "error", e.getMessage());
        }
    }

    /**
     * Получает список slug'ов манг из каталога MangaLib по номеру страницы.
     * 
     * @param page Номер страницы каталога (начиная с 1)
     * @param limit Количество манг на странице (по умолчанию 60)
     * @return Map со списком slug'ов (success, page, count, slugs)
     */
    public Map<String, Object> getCatalogSlugs(int page, Integer limit) {
        try {
            int pageLimit = (limit != null && limit > 0) ? limit : 60;
            String url = melonServiceUrl + "/catalog/" + page + "?parser=mangalib&limit=" + pageLimit;
            
            logger.info("Получение каталога манг: страница {}, лимит {}", page, pageLimit);
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> result = response.getBody();
            
            if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                logger.info("Успешно получен каталог: страница {}, найдено {} манг", 
                    page, result.get("count"));
                return result;
            } else {
                logger.error("Не удалось получить каталог для страницы {}: {}", 
                    page, result != null ? result.get("error") : "Unknown error");
                return Map.of("success", false, "error", 
                    result != null ? result.get("error") : "Unknown error");
            }
            
        } catch (Exception e) {
            logger.error("Ошибка получения каталога для страницы {}: {}", page, e.getMessage());
            return Map.of("success", false, "error", e.getMessage());
        }
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
                // Конвертируем HTML-теги в Markdown
                description = convertHtmlToMarkdown(description.trim());
                manga.setDescription(description);
            }

            // Обрабатываем английское название
            String engName = (String) mangaInfo.get("eng_name");
            if (engName != null && !engName.trim().isEmpty()) {
                manga.setEngName(engName.trim());
            }

            // Обрабатываем альтернативные названия
            List<String> anotherNames = (List<String>) mangaInfo.get("another_names");
            System.out.println("DEBUG: another_names = " + anotherNames);
            if (anotherNames != null && !anotherNames.isEmpty()) {
                String altNames = anotherNames.stream()
                    .filter(name -> name != null && !name.trim().isEmpty())
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.joining("; "));
                
                if (!altNames.isEmpty()) {
                    System.out.println("DEBUG: Setting alternative names: " + altNames);
                    manga.setAlternativeNames(altNames);
                }
            }

            // Обрабатываем тип манги
            String typeStr = (String) mangaInfo.get("type");
            System.out.println("DEBUG: type from parser = " + typeStr);
            if (typeStr != null && !typeStr.trim().isEmpty()) {
                try {
                    switch (typeStr.toLowerCase().trim()) {
                        case "manhwa":
                        case "манхва":
                            manga.setType(Manga.MangaType.MANHWA);
                            break;
                        case "manhua":
                        case "маньхуа":
                            manga.setType(Manga.MangaType.MANHUA);
                            break;
                        case "western_comic":
                        case "western comic":
                        case "комикс западный":
                            manga.setType(Manga.MangaType.WESTERN_COMIC);
                            break;
                        case "russian_comic":
                        case "russian comic":
                        case "руманга":
                            manga.setType(Manga.MangaType.RUSSIAN_COMIC);
                            break;
                        case "oel":
                        case "oel-манга":
                        case "oel-manga":
                            manga.setType(Manga.MangaType.OEL);
                            break;
                        case "manga":
                        case "манга":
                            manga.setType(Manga.MangaType.MANGA);
                            break;
                        default:
                            // Для неизвестных типов логируем и ставим MANGA
                            System.out.println("DEBUG: Unknown type '" + typeStr + "', using MANGA");
                            manga.setType(Manga.MangaType.MANGA);
                    }
                    System.out.println("DEBUG: Set type to: " + manga.getType());
                } catch (Exception e) {
                    manga.setType(Manga.MangaType.MANGA);
                }
            } else {
                // Если тип не получен из парсера, устанавливаем MANGA по умолчанию
                manga.setType(Manga.MangaType.MANGA);
                System.out.println("DEBUG: No type from parser, set default MANGA");
            }

            // Обрабатываем возрастное ограничение
            Object ageLimit = mangaInfo.get("age_limit");
            if (ageLimit != null) {
                try {
                    manga.setAgeLimit(Integer.parseInt(ageLimit.toString().trim()));
                } catch (NumberFormatException e) {
                    // Игнорируем ошибки парсинга возраста
                }
            }

            // Обрабатываем статус лицензирования
            Object isLicensed = mangaInfo.get("is_licensed");
            if (isLicensed != null) {
                manga.setIsLicensed(Boolean.parseBoolean(isLicensed.toString()));
            }

            // Обрабатываем статус
            Object statusRaw = mangaInfo.get("status");
            System.out.println("DEBUG: status from parser = " + statusRaw);
            Manga.MangaStatus resolvedStatus = resolveMangaStatus(statusRaw);
            manga.setStatus(resolvedStatus);
            System.out.println("DEBUG: Set status to: " + manga.getStatus());

            // Обрабатываем жанры
            List<String> genres = (List<String>) mangaInfo.get("genres");
            if (genres != null && !genres.isEmpty()) {
                // Фильтруем пустые жанры
                List<String> filteredGenres = genres.stream()
                    .filter(genre -> genre != null && !genre.trim().isEmpty())
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.toList());

                if (!filteredGenres.isEmpty()) {
                    // Создаем или получаем жанры из базы данных
                    Set<Genre> genreSet = filteredGenres.stream()
                        .map(genreName -> genreService.createOrGetGenre(genreName))
                        .collect(Collectors.toSet());
                    manga.setGenres(genreSet);
                    
                    // Также сохраняем как строку для совместимости
                    manga.setGenre(String.join(", ", filteredGenres));
                }
            }

            // Обрабатываем теги
            List<String> tags = (List<String>) mangaInfo.get("tags");
            System.out.println("DEBUG: tags = " + tags);
            if (tags != null && !tags.isEmpty()) {
                // Фильтруем пустые теги
                List<String> filteredTags = tags.stream()
                    .filter(tag -> tag != null && !tag.trim().isEmpty())
                    .map(String::trim)
                    .collect(java.util.stream.Collectors.toList());

                if (!filteredTags.isEmpty()) {
                    System.out.println("DEBUG: Setting tags: " + String.join(", ", filteredTags));
                    // Создаем или получаем теги из базы данных
                    Set<Tag> tagSet = filteredTags.stream()
                        .map(tagName -> tagService.createOrGetTag(tagName))
                        .collect(Collectors.toSet());
                    manga.setTags(tagSet);
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
            
            // Обрабатываем обложку ПОСЛЕ сохранения манги - скачиваем из MelonService и сохраняем в ImageStorageService
            try {
                // Скачиваем обложку из MelonService
                String coverUrl = melonServiceUrl + "/cover/" + filename;
                System.out.println("Downloading cover from MelonService: " + coverUrl);
                ResponseEntity<byte[]> coverResponse = restTemplate.getForEntity(coverUrl, byte[].class);

                if (coverResponse.getStatusCode().is2xxSuccessful() && coverResponse.getBody() != null) {
                    System.out.println("Downloaded cover size: " + coverResponse.getBody().length + " bytes");
                    
                    // Определяем расширение файла по Content-Type
                    String contentType = coverResponse.getHeaders().getFirst("Content-Type");
                    String fileExtension = ".jpg"; // По умолчанию
                    if (contentType != null) {
                        if (contentType.contains("png")) {
                            fileExtension = ".png";
                        } else if (contentType.contains("webp")) {
                            fileExtension = ".webp";
                        }
                    }

                    // Сохраняем обложку как файл через ImageStorageService
                    String coverFileName = "cover_" + filename + fileExtension;

                    // Создаем multipart запрос для обложки
                    MultiValueMap<String, Object> coverRequest = new LinkedMultiValueMap<>();

                    // Создаем ByteArrayResource для отправки
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

                    // Сохраняем обложку в ImageStorageService
                    ResponseEntity<Map> uploadResponse = restTemplate.postForEntity(
                        "http://image-storage-service:8083/api/images/cover/" + manga.getId(),
                        coverEntity,
                        Map.class
                    );

                    if (uploadResponse.getStatusCode().is2xxSuccessful() && uploadResponse.getBody() != null) {
                        String savedImageUrl = (String) uploadResponse.getBody().get("imageUrl");
                        if (savedImageUrl != null && !savedImageUrl.isEmpty()) {
                            manga.setCoverImageUrl(savedImageUrl);
                            manga = mangaRepository.save(manga);
                            System.out.println("Cover saved successfully: " + savedImageUrl);
                        }
                    } else {
                        System.err.println("Failed to upload cover to ImageStorageService: " + uploadResponse.getStatusCode());
                        System.err.println("Cover will not be set for manga: " + manga.getTitle());
                    }
                } else {
                    System.err.println("Failed to download cover from MelonService: " + coverResponse.getStatusCode());
                    System.err.println("Cover will not be set for manga: " + manga.getTitle());
                }
            } catch (Exception e) {
                System.err.println("Error processing cover: " + e.getMessage());
                System.err.println("Cover will not be set for manga: " + manga.getTitle());
            }

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
        
        logger.info("=== НАЧАЛО ИМПОРТА ===");
        logger.info("Task ID: {}", taskId);
        logger.info("Filename: {}", filename);
        logger.info("Branch ID: {}", branchId);

        try {
            // Шаг 1: Получаем данные манги
            task.setStatus(ImportTaskService.TaskStatus.IMPORTING_MANGA);
            task.setProgress(5);
            task.setMessage("Получение данных манги...");
            
            logger.info("Шаг 1: Получение данных манги из MelonService...");
            Map<String, Object> mangaInfo = getMangaInfo(filename);
            
            if (mangaInfo == null) {
                logger.error("ОШИБКА: Информация о манге не найдена в MelonService для filename: {}", filename);
                importTaskService.markTaskFailed(taskId, "Информация о манге не найдена");
                return CompletableFuture.completedFuture(null);
            }
            
            logger.info("✓ Данные манги успешно получены. Заголовок: {}", mangaInfo.get("localized_name"));

            // Шаг 2: Пропускаем повторное скачивание - изображения уже скачаны во время полного парсинга
            task.setProgress(15);
            task.setMessage("Создание записи манги...");
            
            logger.info("Шаг 2: Создание записи манги в БД...");
            Manga manga = createMangaFromData(mangaInfo, filename);
            logger.info("✓ Манга создана с ID: {}, название: {}", manga.getId(), manga.getTitle());

            // Подсчитываем главы
            logger.info("Шаг 3: Подсчет глав для импорта...");
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
            logger.info("✓ Найдено {} глав для импорта, {} страниц всего", totalChapters, totalPages);

            // Обновляем информацию о задаче
            task.setMangaId(manga.getId());
            task.setTitle(manga.getTitle());
            task.setTotalChapters(totalChapters);
            task.setTotalPages(totalPages);

            // Шаг 3: Импортируем главы
            logger.info("Шаг 4: Импорт глав и страниц...");
            task.setStatus(ImportTaskService.TaskStatus.IMPORTING_CHAPTERS);
            task.setProgress(20);
            task.setMessage("Импорт глав: 0/" + totalChapters);

            importChaptersWithProgress(taskId, manga.getId(), chaptersToImport, filename);
            
            logger.info("✓ Все главы импортированы успешно");
            importTaskService.markTaskCompleted(taskId);
            logger.info("=== ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===");

        } catch (Exception e) {
            logger.error("=== ОШИБКА ИМПОРТА ===");
            logger.error("Task ID: {}", taskId);
            logger.error("Filename: {}", filename);
            logger.error("Тип ошибки: {}", e.getClass().getName());
            logger.error("Сообщение ошибки: {}", e.getMessage());
            logger.error("Стек трейс:", e);
            importTaskService.markTaskFailed(taskId, e.getMessage());
        }

        return CompletableFuture.completedFuture(null);
    }

    private Manga createMangaFromData(Map<String, Object> mangaInfo, String filename) {
        Manga manga = new Manga();

        // MangaLib изменил формат slug: теперь может быть "7580--i-alone-level-up"
        // Нормализуем до "i-alone-level-up" для совместимости с существующими записями
        String normalizedSlug = normalizeSlugForMangaLib(filename);
        
        // КРИТИЧНО: Устанавливаем melonSlug для проверки дубликатов и автообновления
        manga.setMelonSlug(normalizedSlug);

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
            // Конвертируем HTML-теги в Markdown
            description = convertHtmlToMarkdown(description.trim());
            manga.setDescription(description);
        }

        Object statusRaw = mangaInfo.get("status");
        System.out.println("DEBUG: status from parser (async flow) = " + statusRaw);
        Manga.MangaStatus asyncResolvedStatus = resolveMangaStatus(statusRaw);
        manga.setStatus(asyncResolvedStatus);
        System.out.println("DEBUG: Async flow set status to: " + manga.getStatus());

        // Обрабатываем жанры
        List<String> genres = (List<String>) mangaInfo.get("genres");
        if (genres != null && !genres.isEmpty()) {
            // Фильтруем пустые жанры
            List<String> filteredGenres = genres.stream()
                .filter(genre -> genre != null && !genre.trim().isEmpty())
                .map(String::trim)
                .collect(java.util.stream.Collectors.toList());

            if (!filteredGenres.isEmpty()) {
                // Создаем или получаем жанры из базы данных и добавляем их к манге
                for (String genreName : filteredGenres) {
                    Genre genre = genreService.createOrGetGenre(genreName);
                    manga.addGenre(genre);
                    // Явно сохраняем жанр с обновленным счетчиком
                    genreService.saveGenre(genre);
                }
                
                // Также сохраняем как строку для совместимости
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

        // DEBUG: Проверяем данные из парсинга
        System.out.println("=== DEBUG PARSING DATA ===");
        System.out.println("Filename: " + filename);
        System.out.println("Full mangaInfo: " + mangaInfo);

        // Обрабатываем тип манги (manga/manhwa/manhua)
        String type = (String) mangaInfo.get("type");
        System.out.println("DEBUG: Raw type from parsing: " + type);
        if (type != null && !type.trim().isEmpty()) {
            try {
                Manga.MangaType mangaType = Manga.MangaType.valueOf(type.trim().toUpperCase());
                manga.setType(mangaType);
                System.out.println("DEBUG: Set manga type to: " + mangaType);
            } catch (IllegalArgumentException e) {
                System.err.println("DEBUG: Unknown manga type: " + type + ", setting to MANGA");
                manga.setType(Manga.MangaType.MANGA);
            }
        } else {
            System.out.println("DEBUG: No type found, setting to MANGA by default");
            manga.setType(Manga.MangaType.MANGA);
        }

        // Обрабатываем английское название
        String engName = (String) mangaInfo.get("eng_name");
        System.out.println("DEBUG: Raw eng_name from parsing: " + engName);
        if (engName != null && !engName.trim().isEmpty()) {
            manga.setEngName(engName.trim());
            System.out.println("DEBUG: Set eng_name to: " + engName.trim());
        }

        // Обрабатываем альтернативные названия
        List<String> alternativeNames = (List<String>) mangaInfo.get("another_names");
        System.out.println("DEBUG: Raw another_names from parsing: " + alternativeNames);
        if (alternativeNames != null && !alternativeNames.isEmpty()) {
            List<String> filteredNames = alternativeNames.stream()
                .filter(name -> name != null && !name.trim().isEmpty())
                .map(String::trim)
                .collect(java.util.stream.Collectors.toList());

            if (!filteredNames.isEmpty()) {
                String alternativeNamesString = String.join(", ", filteredNames);
                manga.setAlternativeNames(alternativeNamesString);
                System.out.println("DEBUG: Set alternative_names to: " + alternativeNamesString);
            }
        }

        // Обрабатываем теги
        List<String> tags = (List<String>) mangaInfo.get("tags");
        System.out.println("DEBUG: Raw tags from parsing: " + tags);
        if (tags != null && !tags.isEmpty()) {
            List<String> filteredTags = tags.stream()
                .filter(tag -> tag != null && !tag.trim().isEmpty())
                .map(String::trim)
                .collect(java.util.stream.Collectors.toList());

            if (!filteredTags.isEmpty()) {
                // Создаем или получаем теги из базы данных и добавляем их к манге
                for (String tagName : filteredTags) {
                    Tag tag = tagService.createOrGetTag(tagName);
                    manga.addTag(tag);
                    // Явно сохраняем тег с обновленным счетчиком
                    tagService.saveTag(tag);
                }
                System.out.println("DEBUG: Set tags to: " + String.join(", ", filteredTags));
            }
        }

        // Обрабатываем возрастной рейтинг
        Object ageLimit = mangaInfo.get("age_limit");
        System.out.println("DEBUG: Raw age_limit from parsing: " + ageLimit);
        if (ageLimit != null && !ageLimit.toString().trim().isEmpty()) {
            try {
                int ageLimitInt = Integer.parseInt(ageLimit.toString().trim());
                if (ageLimitInt >= 0 && ageLimitInt <= 21) {
                    manga.setAgeLimit(ageLimitInt);
                    System.out.println("DEBUG: Set age_limit to: " + ageLimitInt);
                }
            } catch (NumberFormatException e) {
                System.err.println("DEBUG: Invalid age_limit format: " + ageLimit);
            }
        }

        // Обрабатываем статус лицензии
        Object isLicensed = mangaInfo.get("is_licensed");
        System.out.println("DEBUG: Raw is_licensed from parsing: " + isLicensed);
        if (isLicensed != null) {
            if (isLicensed instanceof Boolean) {
                manga.setIsLicensed((Boolean) isLicensed);
                System.out.println("DEBUG: Set is_licensed to: " + isLicensed);
            } else if (isLicensed instanceof String) {
                String licensedStr = isLicensed.toString().toLowerCase();
                boolean licensed = "true".equals(licensedStr) || "1".equals(licensedStr) || "yes".equals(licensedStr);
                manga.setIsLicensed(licensed);
                System.out.println("DEBUG: Set is_licensed to: " + licensed + " (parsed from string: " + licensedStr + ")");
            }
        }

        System.out.println("=== END DEBUG PARSING ===");

        // СНАЧАЛА сохраняем мангу, чтобы получить ID
        manga = mangaRepository.save(manga);
        System.out.println("Manga saved with ID: " + manga.getId() + " for filename: " + filename);
        
        // Обрабатываем обложку - скачиваем из MelonService и сохраняем как файл
        try {
            System.out.println("Starting cover processing for manga: " + filename);
            // Скачиваем обложку из MelonService
            String coverUrl = melonServiceUrl + "/cover/" + filename;
            ResponseEntity<byte[]> coverResponse = restTemplate.getForEntity(coverUrl, byte[].class);

            if (coverResponse.getStatusCode().is2xxSuccessful() && coverResponse.getBody() != null) {
                System.out.println("Cover downloaded successfully from: " + coverUrl);
                // Определяем расширение файла по Content-Type
                String contentType = coverResponse.getHeaders().getFirst("Content-Type");
                String fileExtension = ".jpg"; // По умолчанию
                if (contentType != null) {
                    if (contentType.contains("png")) {
                        fileExtension = ".png";
                    } else if (contentType.contains("webp")) {
                        fileExtension = ".webp";
                    }
                }

                // Сохраняем обложку как файл через специальный эндпоинт для обложек
                String coverFileName = "cover_" + filename + fileExtension;

                // Создаем multipart запрос для специального эндпоинта обложек
                MultiValueMap<String, Object> coverRequest = new LinkedMultiValueMap<>();

                // Создаем ByteArrayResource для отправки
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

                System.out.println("Uploading cover to ImageStorageService for manga ID: " + manga.getId());
                // ОСНОВНОЙ путь - всегда сохраняем в Minio через ImageStorageService
                ResponseEntity<Map> uploadResponse = restTemplate.postForEntity(
                    "http://image-storage-service:8083/api/images/cover/" + manga.getId(),
                    coverEntity,
                    Map.class
                );

                if (uploadResponse.getStatusCode().is2xxSuccessful() && uploadResponse.getBody() != null) {
                    String savedImageUrl = (String) uploadResponse.getBody().get("imageUrl");
                    if (savedImageUrl != null) {
                        // Если путь не содержит http, формируем публичный URL
                        if (!savedImageUrl.startsWith("http")) {
                            savedImageUrl = "http://image-storage-service:8083/api/images/public/" + savedImageUrl;
                        }
                        manga.setCoverImageUrl(savedImageUrl);
                        manga = mangaRepository.save(manga); // Сохраняем обновленный URL
                        System.out.println("Cover saved successfully to Minio for manga: " + filename + " with URL: " + savedImageUrl);
                    }
                } else {
                    System.err.println("Failed to save cover to Minio for manga " + filename +
                        ", status: " + uploadResponse.getStatusCode());
                    // Fallback - пробуем использовать обложку из JSON
                    setFallbackCoverFromJson(manga, mangaInfo);
                }
            } else {
                System.err.println("Failed to download cover for manga: " + filename +
                    ", status: " + coverResponse.getStatusCode());
                // Fallback - пробуем использовать обложку из JSON
                setFallbackCoverFromJson(manga, mangaInfo);
            }
        } catch (Exception e) {
            System.err.println("Error processing cover for manga " + filename + ": " + e.getMessage());
            e.printStackTrace();
            // Fallback - пробуем использовать обложку из JSON
            setFallbackCoverFromJson(manga, mangaInfo);
        }

        return manga;
    }

    private Manga.MangaStatus resolveMangaStatus(Object statusRaw) {
        if (statusRaw == null) {
            return Manga.MangaStatus.ONGOING;
        }

        String statusStr;
        if (statusRaw instanceof String) {
            statusStr = ((String) statusRaw).trim();
        } else {
            statusStr = statusRaw.toString().trim();
        }

        if (statusStr.isEmpty()) {
            return Manga.MangaStatus.ONGOING;
        }

        String normalized = statusStr.toLowerCase(Locale.ROOT);

        switch (normalized) {
            case "ongoing":
            case "продолжается":
            case "продолжается выпуск":
                return Manga.MangaStatus.ONGOING;
            case "completed":
            case "завершен":
            case "завершён":
            case "завершена":
            case "завершено":
                return Manga.MangaStatus.COMPLETED;
            case "announced":
            case "анонс":
            case "анонсирован":
            case "анонсировано":
                return Manga.MangaStatus.ANNOUNCED;
            case "hiatus":
            case "заморожен":
            case "заморожена":
            case "заморожено":
            case "приостановлен":
            case "приостановлена":
            case "приостановлено":
                return Manga.MangaStatus.HIATUS;
            case "cancelled":
            case "canceled":
            case "dropped":
            case "отменен":
            case "отменён":
            case "отменена":
            case "отменено":
            case "выпуск прекращён":
            case "выпуск прекращен":
            case "выпуск прекращена":
            case "выпуск прекращено":
                return Manga.MangaStatus.CANCELLED;
            default:
                return Manga.MangaStatus.ONGOING;
        }
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
        
        logger.info("=== ИМПОРТ ГЛАВ ===");
        logger.info("Manga ID: {}", mangaId);
        logger.info("Filename (slug): {}", filename);
        logger.info("Количество глав для импорта: {}", chapters.size());

        for (int i = 0; i < chapters.size(); i++) {
            Map<String, Object> chapterData = chapters.get(i);

            try {
                logger.info("--- Импорт главы {}/{} ---", i + 1, chapters.size());
                // DEBUG: Выводим информацию о главе
                System.out.println("=== CHAPTER DEBUG ===");
                System.out.println("Chapter data: " + chapterData);

                // Создаем запрос к ChapterService
                Map<String, Object> chapterRequest = new HashMap<>();
                chapterRequest.put("mangaId", mangaId);

                // Улучшенная обработка номера главы
                Object volumeObj = chapterData.get("volume");
                Object numberObj = chapterData.get("number");
                
                System.out.println("Raw volume: " + volumeObj);
                System.out.println("Raw number: " + numberObj);

                // Формируем уникальный номер главы с учетом тома
                double chapterNumber;
                int volume = 1;
                double originalNumber = 1;
                boolean isSpecialChapter = false;
                
                try {
                    // Сначала пытаемся получить том
                    volume = volumeObj != null ? Integer.parseInt(volumeObj.toString()) : 1;
                } catch (NumberFormatException e) {
                    volume = 1;
                    System.out.println("Failed to parse volume, using default: " + e.getMessage());
                }
                
                try {
                    // Пытаемся распарсить номер главы как число
                    originalNumber = Double.parseDouble(numberObj.toString());
                    
                    // Формула: том * 1000 + номер главы
                    // Например: том 2, глава 12.5 = 2012.5
                    chapterNumber = volume * 1000 + originalNumber;
                    
                    System.out.println("Calculated chapter number: " + chapterNumber);
                } catch (NumberFormatException e) {
                    // Если не можем распарсить как число, это специальная глава
                    isSpecialChapter = true;
                    
                    // Для специальных глав используем хэш-код + базовый номер
                    String numberStr = numberObj.toString().toLowerCase().trim();
                    int hashCode = Math.abs(numberStr.hashCode()) % 1000; // Ограничиваем до 999
                    
                    // Формула для специальных глав: том * 1000 + 9000 + хэш
                    // Это гарантирует, что специальные главы будут после обычных
                    chapterNumber = volume * 1000 + 9000 + hashCode;
                    originalNumber = chapterNumber; // Для специальных глав оригинальный номер = вычисленному
                    
                    System.out.println("Special chapter detected: '" + numberStr + "', calculated number: " + chapterNumber + ", error: " + e.getMessage());
                }

                chapterRequest.put("chapterNumber", chapterNumber);
                chapterRequest.put("volumeNumber", volume);
                chapterRequest.put("originalChapterNumber", originalNumber);

                // Обрабатываем title - может быть null
                Object titleObj = chapterData.get("name");
                String title;
                if (titleObj != null && !titleObj.toString().trim().isEmpty()) {
                    title = titleObj.toString().trim();
                } else {
                    // Формируем красивое название
                    if (isSpecialChapter) {
                        title = numberObj.toString(); // Оставляем оригинальное название для специальных глав
                    } else if (volumeObj != null && !volumeObj.toString().equals("1")) {
                        title = "Том " + volumeObj + ", Глава " + numberObj;
                    } else {
                        title = "Глава " + numberObj;
                    }
                }
                chapterRequest.put("title", title);

                System.out.println("Final chapter request: " + chapterRequest);
                System.out.println("=== END CHAPTER DEBUG ===");

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
                    // Используем оригинальное название главы для URL-а в MelonService
                    String originalChapterName = numberObj.toString();
                    importChapterPagesFromMelonService(taskId, chapterId, slides, filename, originalChapterName);

                    // Обновляем прогресс
                    importTaskService.incrementImportedChapters(taskId);

                    // Устанавли��аем прогресс от 20% до 95%
                    int progress = 20 + (75 * (i + 1)) / chapters.size();
                    task.setProgress(progress);

                    System.out.println("Successfully imported chapter: " + title + " with ID: " + chapterId);
                } else {
                    System.err.println("Failed to create chapter, response: " + response.getStatusCode());
                }

            } catch (Exception e) {
                System.err.println("Ошибка импорта главы " + chapterData.get("number") + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    /**
     * Импортирует страницы главы из MelonService через HTTP API
     */
    private void importChapterPagesFromMelonService(String taskId, Long chapterId, List<Map<String, Object>> slides,
                                                   String mangaFilename, String originalChapterName) {
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
            Integer pageIndex = Integer.parseInt(slide.get("index").toString());

            // Формируем URL изображения в MelonService используя оригинальное название главы
            String imageUrl = String.format("%s/images/%s/%s/%d",
                melonServiceUrl, mangaFilename, originalChapterName, pageIndex);

            System.out.println("Importing page from URL: " + imageUrl);

            try {
                // Скачиваем изображение из MelonService в MangaService
                System.out.println("Downloading image from MelonService: " + imageUrl);
                ResponseEntity<byte[]> imageResponse = restTemplate.getForEntity(imageUrl, byte[].class);
                
                if (!imageResponse.getStatusCode().is2xxSuccessful() || imageResponse.getBody() == null) {
                    System.err.println("Failed to download image from MelonService: " + imageUrl + ", status: " + imageResponse.getStatusCode());
                    continue;
                }
                
                byte[] imageBytes = imageResponse.getBody();
                System.out.println("Downloaded image size: " + imageBytes.length + " bytes");

                // Создаем ByteArrayResource из скачанного изображения
                String filename = "page_" + pageIndex + ".jpg";
                ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
                    @Override
                    public String getFilename() {
                        return filename;
                    }
                };

                // Отправляем файл в ImageStorageService
                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                body.add("file", imageResource);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.MULTIPART_FORM_DATA);
                HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

                // Отправляем в ImageStorageService endpoint для загрузки файла
                String uploadUrl = "http://image-storage-service:8083/api/images/chapter/" + chapterId + "/page/" + pageIndex;
                ResponseEntity<Map> response = restTemplate.postForEntity(uploadUrl, entity, Map.class);

                // Проверяем успешность импорта страницы
                if (response.getStatusCode().is2xxSuccessful()) {
                    importTaskService.incrementImportedPages(taskId);
                    System.out.println("Successfully imported page " + pageIndex + " for chapter " + chapterId);
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
                System.err.println("Ошибка при обработке страницы " + pageIndex + " для главы " + chapterId + ": " + e.getMessage());
                e.printStackTrace();
            }
        }
        
        // После успешной загрузки всех страниц, обновляем pageCount в ChapterService
        try {
            // Получаем актуальное количество страниц из ImageStorageService
            String getPageCountUrl = "http://image-storage-service:8083/api/images/chapter/" + chapterId + "/count";
            ResponseEntity<Integer> pageCountResponse = restTemplate.getForEntity(getPageCountUrl, Integer.class);
            
            if (pageCountResponse.getStatusCode().is2xxSuccessful() && pageCountResponse.getBody() != null) {
                Integer actualPageCount = pageCountResponse.getBody();
                
                // Обновляем pageCount в ChapterService
                Map<String, Object> updateRequest = new HashMap<>();
                updateRequest.put("pageCount", actualPageCount);
                
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> updateEntity = new HttpEntity<>(updateRequest, headers);
                
                String updateChapterUrl = "http://chapter-service:8082/api/chapters/" + chapterId + "/pagecount";
                restTemplate.put(updateChapterUrl, updateEntity);
                
                System.out.println("Updated chapter " + chapterId + " pageCount to: " + actualPageCount);
            }
        } catch (Exception e) {
            System.err.println("Failed to update pageCount for chapter " + chapterId + ": " + e.getMessage());
        }
    }

    /**
     * Конвертирует HTML-теги в Markdown-форматирование.
     * Поддерживаемые теги:
     * - <b>, <strong> → **bold**
     * - <i>, <em> → *italic*
     * - <br>, <br/> → перенос строки
     * - <p> → двойной перенос строки
     * - все остальные теги удаляются
     *
     * @param html исходная строка с HTML-тегами
     * @return строка в формате Markdown
     */
    private String convertHtmlToMarkdown(String html) {
        if (html == null || html.isEmpty()) {
            return html;
        }

        String markdown = html
            // <br> → перенос строки
            .replaceAll("<br\\s*/?>", "\n")
            // <p> → двойной перенос строки
            .replaceAll("</p>\\s*<p>", "\n\n")
            .replaceAll("</?p>", "\n\n")
            // <b>, <strong> → **bold**
            .replaceAll("<b>(.*?)</b>", "**$1**")
            .replaceAll("<strong>(.*?)</strong>", "**$1**")
            // <i>, <em> → *italic*
            .replaceAll("<i>(.*?)</i>", "*$1*")
            .replaceAll("<em>(.*?)</em>", "*$1*")
            // <b><i> → ***bold+italic***
            .replaceAll("<b>\\s*<i>(.*?)</i>\\s*</b>", "***$1***")
            .replaceAll("<i>\\s*<b>(.*?)</b>\\s*</i>", "***$1***")
            .replaceAll("<strong>\\s*<em>(.*?)</em>\\s*</strong>", "***$1***")
            .replaceAll("<em>\\s*<strong>(.*?)</strong>\\s*</em>", "***$1***")
            // Убираем все остальные HTML-теги
            .replaceAll("<[^>]*>", "")
            // Нормализуем пробелы (несколько пробелов → один)
            .replaceAll(" +", " ")
            // Нормализуем переносы строк (больше 3 переносов → 2 переноса)
            .replaceAll("\n{3,}", "\n\n")
            .trim();

        return markdown;
    }

    /**
     * Отменяет задачу в MelonService
     */
    public Map<String, Object> cancelMelonTask(String taskId) {
        String url = melonServiceUrl + "/tasks/" + taskId + "/cancel";
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> body = response.getBody();
            
            if (body != null) {
                logger.info("Задача {} отменена в MelonService: {}", taskId, body);
                return body;
            } else {
                logger.warn("Пустой ответ при отмене задачи: {}", taskId);
                return Map.of(
                    "cancelled", false,
                    "message", "Пустой ответ от MelonService"
                );
            }
            
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            logger.warn("Задача не найдена в MelonService: {}", taskId);
            return Map.of(
                "cancelled", false,
                "message", "Задача не найдена в MelonService"
            );
            
        } catch (Exception e) {
            logger.error("Ошибка отмены задачи {}: {}", taskId, e.getMessage());
            return Map.of(
                "cancelled", false,
                "message", "Ошибка отмены: " + e.getMessage()
            );
        }
    }
}
