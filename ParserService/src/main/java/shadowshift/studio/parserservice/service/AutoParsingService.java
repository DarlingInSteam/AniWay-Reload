package shadowshift.studio.parserservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.dto.*;

import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Сервис для автоматического парсинга манги из каталога
 */
@Service
public class AutoParsingService {

    private static final Logger logger = LoggerFactory.getLogger(AutoParsingService.class);

    @Autowired
    private MangaLibParserService parserService;

    @Autowired
    private MangaBuildService buildService;

    @Autowired
    private TaskStorageService taskStorage;

    /**
     * Запускает автопарсинг: получение каталога и парсинг манг
     */
    public String startAutoParsing(Integer page, Integer limit, Integer minChapters, Integer maxChapters) {
        String taskId = UUID.randomUUID().toString();
        AutoParseTask task = taskStorage.createAutoParseTask(taskId, page != null ? page : 1, limit);

        task.addLog(String.format("Старт автопарсинга: страница %d, лимит: %s, мин глав: %s, макс глав: %s",
                task.getPage(),
                limit != null ? limit : "все",
                minChapters != null ? minChapters : "—",
                maxChapters != null ? maxChapters : "—"));

        // Запускаем асинхронно
        CompletableFuture.runAsync(() -> executeAutoParsing(task, minChapters, maxChapters));

        return taskId;
    }

    /**
     * Выполняет автопарсинг
     */
    private void executeAutoParsing(AutoParseTask task, Integer minChapters, Integer maxChapters) {
        try {
            task.updateStatus("running", 5, "Получение каталога...");

            // Получаем каталог
            CatalogResult catalog = parserService.fetchCatalog(task.getPage(), minChapters, maxChapters).join();

            List<CatalogItem> items = catalog.getItems();
            if (task.getLimit() != null && items.size() > task.getLimit()) {
                items = items.subList(0, task.getLimit());
            }

            task.setTotalSlugs(items.size());
            task.addLog(String.format("Найдено %d манг для парсинга", items.size()));

            if (items.isEmpty()) {
                task.updateStatus("completed", 100, "Манги не найдены");
                return;
            }

            // Парсим каждую мангу
            int processed = 0;
            for (CatalogItem item : items) {
                processed++;

                try {
                    task.addLog(String.format("[%d/%d] Парсинг: %s (%s)", processed, items.size(), item.getTitle(), item.getSlug()));

                    // TODO: Проверка на дубликаты с MangaService
                    // Пока просто парсим все

                    CompletableFuture<ParseResult> parseFuture = parserService.parseManga(item.getSlug(), "mangalib");
                    ParseResult result = parseFuture.join();

                    if (result.getSuccess()) {
                        task.getImportedSlugs().add(item.getSlug());
                        task.addLog(String.format("  ✓ Успешно: %d глав", result.getChaptersCount()));
                    } else {
                        task.getFailedSlugs().add(item.getSlug());
                        task.addLog(String.format("  ✗ Ошибка: %s", result.getError()));
                    }

                } catch (Exception e) {
                    task.getFailedSlugs().add(item.getSlug());
                    task.addLog(String.format("  ✗ Ошибка: %s", e.getMessage()));
                    logger.error("Ошибка парсинга манги {}: {}", item.getSlug(), e.getMessage(), e);
                }

                task.setProcessedSlugs(processed);
                int progress = 10 + (processed * 85 / items.size());
                task.updateStatus("running", progress, String.format("Обработано %d/%d", processed, items.size()));
            }

            task.updateStatus("completed", 100, String.format(
                    "Автопарсинг завершен: импортировано %d, пропущено %d, ошибок %d",
                    task.getImportedSlugs().size(),
                    task.getSkippedSlugs().size(),
                    task.getFailedSlugs().size()));

        } catch (Exception e) {
            logger.error("Ошибка автопарсинга: {}", e.getMessage(), e);
            task.updateStatus("failed", 0, "Ошибка: " + e.getMessage());
        }
    }

    /**
     * Получает статус задачи автопарсинга
     */
    public Map<String, Object> getAutoParseTaskStatus(String taskId) {
        AutoParseTask task = taskStorage.getAutoParseTask(taskId);

        if (task == null) {
            return Map.of("error", "Задача не найдена");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("task_id", task.getTaskId());
        result.put("page", task.getPage());
        result.put("limit", task.getLimit());
        result.put("status", task.getStatus());
        result.put("progress", task.getProgress());
        result.put("message", task.getMessage());
        result.put("total_slugs", task.getTotalSlugs());
        result.put("processed_slugs", task.getProcessedSlugs());
        result.put("skipped_slugs", task.getSkippedSlugs());
        result.put("imported_slugs", task.getImportedSlugs());
        result.put("failed_slugs", task.getFailedSlugs());
        result.put("created_at", task.getCreatedAt());
        result.put("updated_at", task.getUpdatedAt());
        result.put("logs", task.getLogs());

        return result;
    }
}
