package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import shadowshift.studio.mangaservice.repository.MangaRepository;

import java.util.*;
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

    @Autowired
    private MelonIntegrationService melonService;

    @Autowired
    private MangaRepository mangaRepository;

    @Autowired
    private ImportTaskService importTaskService;

    @Autowired
    private ApplicationContext applicationContext;

    // Хранилище задач автопарсинга
    private final Map<String, AutoParseTask> autoParsingTasks = new HashMap<>();
    
    // Маппинг parseTaskId (ID парсинга одной манги) -> autoParsingTaskId (ID задачи автопарсинга)
    // Необходим для связывания логов от MelonService с задачей автопарсинга
    private final Map<String, String> parseTaskToAutoParseTask = new HashMap<>();

    /**
     * Запускает автоматический парсинг манг из каталога MangaLib по номеру страницы
     * 
     * @param page номер страницы каталога
     * @param limit максимальное количество манг для парсинга (null = все с страницы)
     * @return информация о запущенной задаче
     */
    public Map<String, Object> startAutoParsing(Integer page, Integer limit) {
        String taskId = UUID.randomUUID().toString();

        AutoParseTask task = new AutoParseTask();
        task.taskId = taskId;
        task.status = "pending";
        task.totalSlugs = 0;
        task.processedSlugs = 0;
        task.skippedSlugs = new ArrayList<>();
        task.importedSlugs = new ArrayList<>();
        task.failedSlugs = new ArrayList<>();
        task.logs = new ArrayList<>();  // Инициализация списка логов
        task.message = "Получение списка манг из каталога...";
        task.progress = 0;
        task.startTime = new Date();
        task.page = page != null ? page : 1;
        task.limit = limit;

        autoParsingTasks.put(taskId, task);

        // Запускаем асинхронную обработку через Spring proxy для поддержки @Async
        // (self-invocation не работает с @Async)
        AutoParsingService proxy = applicationContext.getBean(AutoParsingService.class);
        proxy.processAutoParsingAsync(taskId, task.page, limit);

        return Map.of(
            "task_id", taskId,
            "status", "pending",
            "page", task.page,
            "limit", limit != null ? limit : "all",
            "message", "Автопарсинг запущен"
        );
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
        result.put("logs", task.logs);  // Добавляем логи в ответ
        result.put("start_time", task.startTime);
        
        if (task.endTime != null) {
            result.put("end_time", task.endTime);
        }

        return result;
    }

    /**
     * Добавляет лог-сообщение в задачу автопарсинга
     * Поддерживает как прямой taskId автопарсинга, так и parseTaskId отдельной манги
     */
    public void addLogToTask(String taskId, String logMessage) {
        // Сначала проверяем, не является ли это parseTaskId
        String autoParsingTaskId = parseTaskToAutoParseTask.get(taskId);
        
        // Если это parseTaskId, используем связанный autoParsingTaskId
        if (autoParsingTaskId != null) {
            taskId = autoParsingTaskId;
            logger.debug("Лог для parseTaskId={} перенаправлен в autoParsingTaskId={}", taskId, autoParsingTaskId);
        }
        
        AutoParseTask task = autoParsingTasks.get(taskId);
        if (task != null) {
            synchronized (task.logs) {
                task.logs.add(logMessage);
                // Ограничиваем количество логов (последние 1000 строк)
                if (task.logs.size() > 1000) {
                    task.logs.remove(0);
                }
            }
            logger.debug("Добавлен лог в задачу {}: {}", taskId, logMessage);
        } else {
            logger.warn("Задача не найдена для taskId={}, лог проигнорирован: {}", taskId, logMessage);
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

        try {
            logger.info("Начало автопарсинга: страница {}, лимит {}", page, limit);

            // Получаем список slug'ов из каталога
            Map<String, Object> catalogResult = melonService.getCatalogSlugs(page, limit);
            
            if (catalogResult == null || !Boolean.TRUE.equals(catalogResult.get("success"))) {
                task.status = "failed";
                task.endTime = new Date();
                task.message = "Ошибка получения каталога: " + catalogResult.get("error");
                logger.error("Не удалось получить каталог: {}", catalogResult.get("error"));
                return CompletableFuture.completedFuture(null);
            }

            @SuppressWarnings("unchecked")
            List<String> slugs = (List<String>) catalogResult.get("slugs");
            
            if (slugs == null || slugs.isEmpty()) {
                task.status = "completed";
                task.progress = 100;
                task.endTime = new Date();
                task.message = "Каталог пуст или не найден";
                logger.info("Каталог пуст, автопарсинг завершен");
                return CompletableFuture.completedFuture(null);
            }

            task.totalSlugs = slugs.size();
            logger.info("Получено {} манг из каталога", slugs.size());

            for (int i = 0; i < slugs.size(); i++) {
                String slug = slugs.get(i);
                String parseTaskId = null; // Для очистки маппинга в finally
                
                try {
                    // Проверяем, существует ли уже манга с таким slug
                    if (mangaRepository.existsByMelonSlug(slug)) {
                        logger.info("Манга с slug '{}' уже импортирована, пропускаем", slug);
                        task.skippedSlugs.add(slug);
                        task.processedSlugs++;
                        task.progress = (task.processedSlugs * 100) / task.totalSlugs;
                        task.message = String.format("Обработано: %d/%d (пропущено: %d, импортировано: %d)",
                            task.processedSlugs, task.totalSlugs, task.skippedSlugs.size(), task.importedSlugs.size());
                        continue;
                    }

                    // Запускаем полный парсинг (парсинг + билдинг)
                    task.message = String.format("Парсинг манги %d/%d: %s", i + 1, slugs.size(), slug);
                    logger.info("Запуск парсинга для slug: {}", slug);
                    
                    Map<String, Object> parseResult = melonService.startFullParsing(slug);
                    
                    if (parseResult != null && parseResult.containsKey("task_id")) {
                        parseTaskId = (String) parseResult.get("task_id");
                        
                        // Связываем parseTaskId с текущим taskId автопарсинга
                        // Теперь логи от MelonService для этого parseTaskId будут попадать в нашу задачу
                        parseTaskToAutoParseTask.put(parseTaskId, taskId);
                        logger.info("Связали parseTaskId={} с autoParsingTaskId={}", parseTaskId, taskId);
                        
                        // Ждем завершения парсинга и билдинга
                        boolean completed = waitForFullParsingCompletion(parseTaskId);
                        
                        if (completed) {
                            // Запускаем импорт в систему
                            task.message = String.format("Импорт манги %d/%d: %s", i + 1, slugs.size(), slug);
                            logger.info("Запуск импорта для slug: {}", slug);
                            
                            Map<String, Object> importResult = melonService.importToSystemAsync(slug, null);
                            
                            if (importResult != null && importResult.containsKey("taskId")) {
                                String importTaskId = (String) importResult.get("taskId");
                                
                                // Ждем завершения импорта
                                boolean importCompleted = waitForImportCompletion(importTaskId);
                                
                                if (importCompleted) {
                                    // Удаляем из Melon после успешного импорта
                                    logger.info("Удаление из Melon для slug: {}", slug);
                                    melonService.deleteManga(slug);
                                    
                                    task.importedSlugs.add(slug);
                                    logger.info("Манга '{}' успешно импортирована и удалена из Melon", slug);
                                } else {
                                    logger.error("Импорт не завершен для slug: {}", slug);
                                    task.failedSlugs.add(slug);
                                }
                            } else {
                                logger.error("Не удалось запустить импорт для slug: {}", slug);
                                task.failedSlugs.add(slug);
                            }
                        } else {
                            logger.error("Парсинг не завершен для slug: {}", slug);
                            task.failedSlugs.add(slug);
                        }
                        
                        // Очищаем маппинг после завершения обработки манги
                        parseTaskToAutoParseTask.remove(parseTaskId);
                        logger.debug("Удален маппинг для parseTaskId={}", parseTaskId);
                    } else {
                        logger.error("Не удалось запустить парсинг для slug: {}", slug);
                        task.failedSlugs.add(slug);
                    }

                } catch (Exception e) {
                    logger.error("Ошибка обработки slug '{}': {}", slug, e.getMessage(), e);
                    task.failedSlugs.add(slug);
                } finally {
                    // Гарантированно очищаем маппинг даже при ошибке
                    if (parseTaskId != null) {
                        parseTaskToAutoParseTask.remove(parseTaskId);
                        logger.debug("Очистка маппинга для parseTaskId={} в finally", parseTaskId);
                    }
                }

                task.processedSlugs++;
                task.progress = (task.processedSlugs * 100) / task.totalSlugs;
                task.message = String.format("Обработано: %d/%d (пропущено: %d, импортировано: %d, ошибок: %d)",
                    task.processedSlugs, task.totalSlugs, task.skippedSlugs.size(), 
                    task.importedSlugs.size(), task.failedSlugs.size());
            }

            task.status = "completed";
            task.progress = 100;
            task.endTime = new Date();
            task.message = String.format("Автопарсинг завершен. Импортировано: %d, пропущено: %d, ошибок: %d",
                task.importedSlugs.size(), task.skippedSlugs.size(), task.failedSlugs.size());
            
            logger.info("Автопарсинг завершен. Результаты: импортировано={}, пропущено={}, ошибок={}",
                task.importedSlugs.size(), task.skippedSlugs.size(), task.failedSlugs.size());

        } catch (Exception e) {
            task.status = "failed";
            task.endTime = new Date();
            task.message = "Критическая ошибка автопарсинга: " + e.getMessage();
            logger.error("Критическая ошибка автопарсинга", e);
        }

        return CompletableFuture.completedFuture(null);
    }

    /**
     * Ждет завершения полного парсинга (parse + build)
     * БЕЗ таймаута - некоторые манги с большим количеством глав могут парситься 100+ минут
     */
    private boolean waitForFullParsingCompletion(String taskId) throws InterruptedException {
        int attempts = 0;

        while (true) {
            Thread.sleep(2000); // проверка каждые 2 секунды
            
            Map<String, Object> status = melonService.getFullParsingTaskStatus(taskId);
            
            if (status != null && "completed".equals(status.get("status"))) {
                logger.info("Полный парсинг завершен успешно после {} попыток ({}s)", attempts, attempts * 2);
                return true;
            }
            
            if (status != null && "failed".equals(status.get("status"))) {
                logger.error("Полный парсинг завершился с ошибкой после {} попыток: {}", attempts, status.get("message"));
                return false;
            }
            
            attempts++;
            
            // Логируем прогресс каждые 30 проверок (1 минута)
            if (attempts % 30 == 0) {
                int minutes = attempts * 2 / 60;
                logger.info("Ожидание парсинга {}: {} минут, прогресс: {}%", 
                    taskId, minutes, status != null ? status.get("progress") : "?");
            }
        }
    }

    /**
     * Ждет завершения импорта
     * БЕЗ таймаута - импорт больших манг может занимать много времени
     */
    private boolean waitForImportCompletion(String taskId) throws InterruptedException {
        int attempts = 0;

        while (true) {
            Thread.sleep(2000); // проверка каждые 2 секунды
            
            Map<String, Object> status = melonService.getImportTaskStatus(taskId);
            
            if (status != null && "completed".equals(status.get("status"))) {
                logger.info("Импорт завершен успешно после {} попыток ({}s)", attempts, attempts * 2);
                return true;
            }
            
            if (status != null && "failed".equals(status.get("status"))) {
                logger.error("Импорт завершился с ошибкой после {} попыток: {}", attempts, status.get("message"));
                return false;
            }
            
            attempts++;
            
            // Логируем прогресс каждые 30 проверок (1 минута)
            if (attempts % 30 == 0) {
                int minutes = attempts * 2 / 60;
                logger.info("Ожидание импорта {}: {} минут, прогресс: {}%", 
                    taskId, minutes, status != null ? status.get("progress") : "?");
            }
        }
    }

    /**
     * Внутренний класс для отслеживания задачи автопарсинга
     */
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
        Date startTime;
        Date endTime;
        Integer page;   // Номер страницы каталога
        Integer limit;  // Ограничение количества манг для парсинга
    }
}
