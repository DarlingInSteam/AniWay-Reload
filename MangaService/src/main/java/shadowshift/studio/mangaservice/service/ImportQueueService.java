package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Сервис управления очередью асинхронного импорта манги
 * Обеспечивает неблокирующий импорт с приоритизацией и статусами выполнения
 */
@Service
public class ImportQueueService {
    private static final Logger logger = LoggerFactory.getLogger(ImportQueueService.class);
    private static final int MAX_ACTIVE_IMPORTS = 1;

    private final ReentrantLock importLock = new ReentrantLock(true);

    private final Map<String, ImportQueueItem> activeImports = new ConcurrentHashMap<>();
    private final Map<String, ImportQueueItem> completedImports = new ConcurrentHashMap<>();
    private final AtomicReference<ImportQueueItem> currentImport = new AtomicReference<>();
    
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
        private final Runnable completionCallback;
        
        public enum Priority {
            HIGH(1), NORMAL(2), LOW(3);
            private final int value;
            Priority(int value) { this.value = value; }
            public int getValue() { return value; }
        }
        
        public enum Status {
            QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
        }
        
        public ImportQueueItem(String importTaskId, String slug, String filename, Priority priority, Runnable completionCallback) {
            this.importTaskId = importTaskId;
            this.slug = slug;
            this.filename = filename;
            this.priority = priority;
            this.queuedAt = LocalDateTime.now();
            this.status = Status.QUEUED;
            this.completionCallback = completionCallback;
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
        public Runnable getCompletionCallback() { return completionCallback; }
        
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
        logger.info("=== ИНИЦИАЛИЗАЦИЯ ИМПОРТА В ОДНОМ ПОТОКЕ ===");
    }
    
    /**
     * Добавить импорт в очередь
     */
    public String queueImport(String importTaskId, String slug, String filename, ImportQueueItem.Priority priority, Runnable completionCallback) {
        if (!importLock.tryLock()) {
            ImportQueueItem active = currentImport.get();
            throw new ImportInProgressException("Импорт уже выполняется", active);
        }

        ImportQueueItem item = new ImportQueueItem(importTaskId, slug, filename, priority, completionCallback);
        item.setStatus(ImportQueueItem.Status.PROCESSING);
        item.setStartedAt(LocalDateTime.now());
        currentImport.set(item);
        activeImports.put(importTaskId, item);

        logger.info("=== СТАРТ ОДНОГО ИМПОРТА === taskId={}, slug={}, priority={} ===", importTaskId, slug, priority);

        CompletableFuture<Void> importFuture;
        try {
            importFuture = melonIntegrationService.importMangaWithProgressAsync(importTaskId, slug, filename);
        } catch (Exception ex) {
            handleImmediateFailure(item, ex);
            throw ex;
        }

        importFuture.whenComplete((result, throwable) -> {
            try {
                if (throwable == null) {
                    item.setStatus(ImportQueueItem.Status.COMPLETED);
                    logger.info("Импорт завершен успешно: taskId={}", item.getImportTaskId());
                } else {
                    item.setStatus(ImportQueueItem.Status.FAILED);
                    item.setErrorMessage(throwable.getMessage());
                    logger.error("Ошибка импорта taskId={}: {}", item.getImportTaskId(), throwable.getMessage(), throwable);
                }
                item.setCompletedAt(LocalDateTime.now());

                if (item.getCompletionCallback() != null) {
                    try {
                        item.getCompletionCallback().run();
                    } catch (Exception callbackEx) {
                        logger.error("Ошибка completion callback taskId={}: {}", item.getImportTaskId(), callbackEx.getMessage(), callbackEx);
                    }
                }

                completedImports.put(item.getImportTaskId(), item);
                CompletableFuture.delayedExecutor(30, TimeUnit.MINUTES).execute(() -> {
                    completedImports.remove(item.getImportTaskId());
                    logger.debug("Удален завершенный импорт из кэша: {}", item.getImportTaskId());
                });
            } finally {
                activeImports.remove(item.getImportTaskId());
                currentImport.compareAndSet(item, null);
                importLock.unlock();
            }
        });

        return importTaskId;
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
        ImportQueueItem item = currentImport.get();
        if (item != null && item.getImportTaskId().equals(importTaskId)) {
            logger.warn("Невозможно отменить импорт {} — операция уже выполняется эксклюзивно", importTaskId);
        }
        return false;
    }
    
    /**
     * Получить статистику очереди
     */
    public Map<String, Object> getQueueStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("queueSize", currentImport.get() != null ? 1 : 0);
        stats.put("activeImports", activeImports.size());
        stats.put("maxActiveImports", MAX_ACTIVE_IMPORTS);
        stats.put("availableSlots", importLock.isLocked() ? 0 : 1);
        
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
        ImportQueueItem item = currentImport.get();
        if (item == null) {
            return List.of();
        }
        return List.of(item);
    }

    public boolean isLocked() {
        return importLock.isLocked();
    }

    public ImportQueueItem getCurrentImport() {
        return currentImport.get();
    }

    private void handleImmediateFailure(ImportQueueItem item, Exception ex) {
        try {
            item.setStatus(ImportQueueItem.Status.FAILED);
            item.setErrorMessage(ex.getMessage());
            item.setCompletedAt(LocalDateTime.now());
            completedImports.put(item.getImportTaskId(), item);
        } finally {
            activeImports.remove(item.getImportTaskId());
            currentImport.compareAndSet(item, null);
            importLock.unlock();
        }
    }

    public static class ImportInProgressException extends RuntimeException {
        private final ImportQueueItem currentImport;

        public ImportInProgressException(String message, ImportQueueItem currentImport) {
            super(message);
            this.currentImport = currentImport;
        }

        public ImportQueueItem getCurrentImport() {
            return currentImport;
        }
    }
}