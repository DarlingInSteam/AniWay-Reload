package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/**
 * Сервис управления очередью асинхронного импорта манги
 * Обеспечивает неблокирующий импорт с приоритизацией и статусами выполнения
 */
@Service
public class ImportQueueService {
    private static final Logger logger = LoggerFactory.getLogger(ImportQueueService.class);
    
    // Очередь импорта с приоритетами
    private final PriorityBlockingQueue<ImportQueueItem> importQueue = new PriorityBlockingQueue<>();
    
    // Карта активных импортов для отслеживания статуса
    private final Map<String, ImportQueueItem> activeImports = new ConcurrentHashMap<>();
    
    // Карта завершенных импортов (хранятся 10 минут для получения статуса)
    private final Map<String, ImportQueueItem> completedImports = new ConcurrentHashMap<>();
    
    // ExecutorService для обработки очереди
    private final ExecutorService queueProcessor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "ImportQueueProcessor");
        t.setDaemon(true);
        return t;
    });
    
    @Autowired
    @Lazy
    private MelonIntegrationService melonIntegrationService;
    
    /**
     * Элемент очереди импорта
     */
    public static class ImportQueueItem implements Comparable<ImportQueueItem> {
        private final String importTaskId;
        private final String slug;
        private final String filename;
        private final Priority priority;
        private final LocalDateTime queuedAt;
        private volatile Status status;
        private volatile String errorMessage;
        private volatile LocalDateTime startedAt;
        private volatile LocalDateTime completedAt;
        
        public enum Priority {
            HIGH(1), NORMAL(2), LOW(3);
            private final int value;
            Priority(int value) { this.value = value; }
            public int getValue() { return value; }
        }
        
        public enum Status {
            QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
        }
        
        public ImportQueueItem(String importTaskId, String slug, String filename, Priority priority) {
            this.importTaskId = importTaskId;
            this.slug = slug;
            this.filename = filename;
            this.priority = priority;
            this.queuedAt = LocalDateTime.now();
            this.status = Status.QUEUED;
        }
        
        @Override
        public int compareTo(ImportQueueItem other) {
            // Сначала по приоритету, потом по времени добавления в очередь
            int priorityCompare = Integer.compare(this.priority.getValue(), other.priority.getValue());
            if (priorityCompare != 0) {
                return priorityCompare;
            }
            return this.queuedAt.compareTo(other.queuedAt);
        }
        
        // Геттеры
        public String getImportTaskId() { return importTaskId; }
        public String getSlug() { return slug; }
        public String getFilename() { return filename; }
        public Priority getPriority() { return priority; }
        public LocalDateTime getQueuedAt() { return queuedAt; }
        public Status getStatus() { return status; }
        public String getErrorMessage() { return errorMessage; }
        public LocalDateTime getStartedAt() { return startedAt; }
        public LocalDateTime getCompletedAt() { return completedAt; }
        
        // Сеттеры для изменения статуса
        public void setStatus(Status status) { this.status = status; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
        public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    }
    
    /**
     * Инициализация сервиса - запуск обработчика очереди
     */
    public void init() {
        logger.info("=== ИНИЦИАЛИЗАЦИЯ ОЧЕРЕДИ ИМПОРТА ===");
        queueProcessor.submit(this::processQueue);
        logger.info("Обработчик очереди импорта запущен");
    }
    
    /**
     * Добавить импорт в очередь
     */
    public String queueImport(String importTaskId, String slug, String filename, ImportQueueItem.Priority priority) {
        ImportQueueItem item = new ImportQueueItem(importTaskId, slug, filename, priority);
        
        importQueue.offer(item);
        activeImports.put(importTaskId, item);
        
        logger.info("Импорт добавлен в очередь: taskId={}, slug={}, priority={}, позиция в очереди={}", 
            importTaskId, slug, priority, importQueue.size());
        
        return importTaskId;
    }
    
    /**
     * Основной цикл обработки очереди
     */
    private void processQueue() {
        logger.info("Обработчик очереди импорта запущен");
        
        while (!Thread.currentThread().isInterrupted()) {
            try {
                // Ждем следующий элемент в очереди (блокирующий вызов)
                ImportQueueItem item = importQueue.take();
                
                if (item.getStatus() == ImportQueueItem.Status.CANCELLED) {
                    logger.info("Пропускаем отмененный импорт: {}", item.getImportTaskId());
                    activeImports.remove(item.getImportTaskId());
                    continue;
                }
                
                // Начинаем обработку
                item.setStatus(ImportQueueItem.Status.PROCESSING);
                item.setStartedAt(LocalDateTime.now());
                
                logger.info("=== НАЧАЛО ОБРАБОТКИ ИМПОРТА ===");
                logger.info("Task ID: {}, Slug: {}, Priority: {}", 
                    item.getImportTaskId(), item.getSlug(), item.getPriority());
                
                try {
                    // Вызываем основной метод импорта (уже асинхронный)
                    CompletableFuture<Void> importFuture = melonIntegrationService
                        .importMangaWithProgressAsync(item.getImportTaskId(), item.getSlug(), item.getFilename());
                    
                    // Ждем завершения импорта
                    importFuture.get(30, TimeUnit.MINUTES); // таймаут 30 минут
                    
                    // Успешно завершено
                    item.setStatus(ImportQueueItem.Status.COMPLETED);
                    item.setCompletedAt(LocalDateTime.now());
                    
                    logger.info("Импорт успешно завершен: taskId={}, время выполнения={} мин", 
                        item.getImportTaskId(), 
                        java.time.Duration.between(item.getStartedAt(), item.getCompletedAt()).toMinutes());
                        
                } catch (TimeoutException e) {
                    item.setStatus(ImportQueueItem.Status.FAILED);
                    item.setErrorMessage("Превышен таймаут импорта (30 минут)");
                    item.setCompletedAt(LocalDateTime.now());
                    logger.error("Таймаут импорта для taskId={}: {}", item.getImportTaskId(), e.getMessage());
                    
                } catch (Exception e) {
                    item.setStatus(ImportQueueItem.Status.FAILED);
                    item.setErrorMessage(e.getMessage());
                    item.setCompletedAt(LocalDateTime.now());
                    logger.error("Ошибка импорта для taskId={}: {}", item.getImportTaskId(), e.getMessage());
                }
                
                // Перемещаем из активных в завершенные
                activeImports.remove(item.getImportTaskId());
                
                // Сохраняем завершенные задачи для получения статуса
                if (item.getStatus() == ImportQueueItem.Status.COMPLETED || 
                    item.getStatus() == ImportQueueItem.Status.FAILED) {
                    completedImports.put(item.getImportTaskId(), item);
                    
                    // Планируем удаление через 10 минут
                    CompletableFuture.delayedExecutor(10, TimeUnit.MINUTES).execute(() -> {
                        completedImports.remove(item.getImportTaskId());
                        logger.debug("Удален завершенный импорт из кэша: {}", item.getImportTaskId());
                    });
                }
                
            } catch (InterruptedException e) {
                logger.info("Обработчик очереди импорта остановлен");
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
    
    /**
     * Получить статус импорта
     */
    public ImportQueueItem getImportStatus(String importTaskId) {
        // Сначала проверяем активные импорты
        ImportQueueItem activeItem = activeImports.get(importTaskId);
        if (activeItem != null) {
            return activeItem;
        }
        
        // Если не найден в активных, проверяем завершенные
        return completedImports.get(importTaskId);
    }
    
    /**
     * Отменить импорт
     */
    public boolean cancelImport(String importTaskId) {
        ImportQueueItem item = activeImports.get(importTaskId);
        if (item != null && item.getStatus() == ImportQueueItem.Status.QUEUED) {
            item.setStatus(ImportQueueItem.Status.CANCELLED);
            activeImports.remove(importTaskId);
            logger.info("Импорт отменен: {}", importTaskId);
            return true;
        }
        return false;
    }
    
    /**
     * Получить статистику очереди
     */
    public Map<String, Object> getQueueStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("queueSize", importQueue.size());
        stats.put("activeImports", activeImports.size());
        
        // Статистика по статусам
        Map<ImportQueueItem.Status, Integer> statusCounts = new HashMap<>();
        for (ImportQueueItem item : activeImports.values()) {
            statusCounts.merge(item.getStatus(), 1, Integer::sum);
        }
        stats.put("statusCounts", statusCounts);
        
        return stats;
    }
    
    /**
     * Получить список всех активных импортов
     */
    public List<ImportQueueItem> getActiveImports() {
        return new ArrayList<>(activeImports.values());
    }
}