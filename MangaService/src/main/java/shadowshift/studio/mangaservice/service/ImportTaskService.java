package shadowshift.studio.mangaservice.service;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import shadowshift.studio.mangaservice.websocket.ProgressWebSocketHandler;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Collections;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;

/**
 * Сервис для управления задачами импорта манги.
 * Предоставляет функциональность для создания, обновления и отслеживания прогресса задач импорта.
 *
 * @author ShadowShiftStudio
 */
@Service
public class ImportTaskService {

    @Autowired
    private ProgressWebSocketHandler webSocketHandler;

    /**
     * Перечисление статусов задачи импорта.
     */
    public enum TaskStatus {
        /**
         * Задача ожидает выполнения.
         */
        PENDING,
        /**
         * Задача выполняется (парсинг, билдинг и т.д.).
         */
        RUNNING,
        /**
         * Импорт манги.
         */
        IMPORTING_MANGA,
        /**
         * Импорт глав.
         */
        IMPORTING_CHAPTERS,
        /**
         * Импорт страниц.
         */
        IMPORTING_PAGES,
        /**
         * Задача завершена успешно.
         */
        COMPLETED,
        /**
         * Задача завершилась с ошибкой.
         */
        FAILED
    }

    /**
     * Класс, представляющий задачу импорта.
     */
    public static class ImportTask {
        private static final int MAX_LOG_ENTRIES = 200;

        private String taskId;
        private TaskStatus status;
        private int progress;
        private String message;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private Long mangaId;
        private String title;
        private int totalChapters;
        private int importedChapters;
        private int totalPages;
        private int importedPages;
        private String errorMessage;
    private Map<String, Object> metrics;
        private final List<LogEntry> logs = Collections.synchronizedList(new ArrayList<>());

        /**
         * Конструктор для создания задачи импорта.
         *
         * @param taskId уникальный идентификатор задачи
         */
        public ImportTask(String taskId) {
            this.taskId = taskId;
            this.status = TaskStatus.PENDING;
            this.progress = 0;
            this.message = "Импорт поставлен в очередь";
            this.createdAt = LocalDateTime.now();
            this.updatedAt = LocalDateTime.now();
            this.metrics = new HashMap<>();
        }

        /**
         * Возвращает идентификатор задачи.
         *
         * @return идентификатор задачи
         */
        public String getTaskId() { return taskId; }

        /**
         * Возвращает статус задачи.
         *
         * @return статус задачи
         */
        public TaskStatus getStatus() { return status; }

        /**
         * Устанавливает статус задачи.
         *
         * @param status новый статус задачи
         */
        public void setStatus(TaskStatus status) {
            this.status = status;
            this.updatedAt = LocalDateTime.now();
        }

        /**
         * Возвращает прогресс задачи в процентах.
         *
         * @return прогресс задачи
         */
        public int getProgress() { return progress; }

        /**
         * Устанавливает прогресс задачи.
         *
         * @param progress новый прогресс задачи
         */
        public void setProgress(int progress) {
            this.progress = progress;
            this.updatedAt = LocalDateTime.now();
        }

        /**
         * Возвращает сообщение о состоянии задачи.
         *
         * @return сообщение
         */
        public String getMessage() { return message; }

        /**
         * Устанавливает сообщение о состоянии задачи.
         *
         * @param message новое сообщение
         */
        public void setMessage(String message) {
            this.message = message;
            this.updatedAt = LocalDateTime.now();
        }

        /**
         * Возвращает дату создания задачи.
         *
         * @return дата создания
         */
        public LocalDateTime getCreatedAt() { return createdAt; }

        /**
         * Возвращает дату последнего обновления задачи.
         *
         * @return дата обновления
         */
        public LocalDateTime getUpdatedAt() { return updatedAt; }

        /**
         * Возвращает идентификатор манги.
         *
         * @return идентификатор манги
         */
        public Long getMangaId() { return mangaId; }

        /**
         * Устанавливает идентификатор манги.
         *
         * @param mangaId идентификатор манги
         */
        public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

        /**
         * Возвращает заголовок манги.
         *
         * @return заголовок манги
         */
        public String getTitle() { return title; }

        /**
         * Устанавливает заголовок манги.
         *
         * @param title заголовок манги
         */
        public void setTitle(String title) { this.title = title; }

        /**
         * Возвращает общее количество глав.
         *
         * @return общее количество глав
         */
        public int getTotalChapters() { return totalChapters; }

        /**
         * Устанавливает общее количество глав.
         *
         * @param totalChapters общее количество глав
         */
        public void setTotalChapters(int totalChapters) { this.totalChapters = totalChapters; }

        /**
         * Возвращает количество импортированных глав.
         *
         * @return количество импортированных глав
         */
        public int getImportedChapters() { return importedChapters; }

        /**
         * Устанавливает количество импортированных глав.
         *
         * @param importedChapters количество импортированных глав
         */
        public void setImportedChapters(int importedChapters) { this.importedChapters = importedChapters; }

        /**
         * Возвращает общее количество страниц.
         *
         * @return общее количество страниц
         */
        public int getTotalPages() { return totalPages; }

        /**
         * Устанавливает общее количество страниц.
         *
         * @param totalPages общее количество страниц
         */
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

        /**
         * Возвращает количество импортированных страниц.
         *
         * @return количество импортированных страниц
         */
        public int getImportedPages() { return importedPages; }

        /**
         * Устанавливает количество импортированных страниц.
         *
         * @param importedPages количество импортированных страниц
         */
        public void setImportedPages(int importedPages) { this.importedPages = importedPages; }

        /**
         * Возвращает сообщение об ошибке.
         *
         * @return сообщение об ошибке
         */
        public String getErrorMessage() { return errorMessage; }

        /**
         * Устанавливает сообщение об ошибке.
         *
         * @param errorMessage сообщение об ошибке
         */
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

        /**
         * Возвращает метрики выполнения задачи.
         *
         * @return карта метрик
         */
        public Map<String, Object> getMetrics() {
            return metrics != null ? Collections.unmodifiableMap(metrics) : Collections.emptyMap();
        }

        /**
         * Устанавливает метрики выполнения задачи.
         *
         * @param metrics карта метрик
         */
        public void setMetrics(Map<String, Object> metrics) {
            if (metrics != null) {
                this.metrics = new HashMap<>(metrics);
            }
        }

        /**
         * Обновляет прогресс задачи на основе импортированных глав.
         */
        public void updateProgress() {
            if (totalChapters > 0) {
                this.progress = Math.min(100, (importedChapters * 100) / totalChapters);
            }
            this.updatedAt = LocalDateTime.now();
        }

        /**
         * Преобразует задачу в карту для передачи данных.
         *
         * @return карта с данными задачи
         */
        public Map<String, Object> toMap() {
            Map<String, Object> result = new HashMap<>();
            result.put("taskId", taskId);
            result.put("status", status.toString());
            result.put("progress", progress);
            result.put("message", message);
            result.put("createdAt", createdAt.toString());
            result.put("updatedAt", updatedAt.toString());
            result.put("mangaId", mangaId != null ? mangaId : 0L);
            result.put("title", title != null ? title : "");
            result.put("totalChapters", totalChapters);
            result.put("importedChapters", importedChapters);
            result.put("totalPages", totalPages);
            result.put("importedPages", importedPages);
            result.put("errorMessage", errorMessage != null ? errorMessage : "");
            result.put("metrics", getMetrics());
            result.put("logs", getLogPayload());
            return result;
        }

        public void addLog(String level, String message) {
            if (level == null || level.isBlank()) {
                level = "INFO";
            }
            String sanitized = message != null ? message : "";
            LogEntry entry = new LogEntry(System.currentTimeMillis(), level.toUpperCase(), sanitized);
            synchronized (logs) {
                logs.add(entry);
                if (logs.size() > MAX_LOG_ENTRIES) {
                    logs.subList(0, logs.size() - MAX_LOG_ENTRIES).clear();
                }
            }
        }

        public List<LogEntry> getLogs() {
            synchronized (logs) {
                return new ArrayList<>(logs);
            }
        }

        private List<Map<String, Object>> getLogPayload() {
            List<LogEntry> snapshot = getLogs();
            List<Map<String, Object>> payload = new ArrayList<>(snapshot.size());
            for (LogEntry entry : snapshot) {
                Map<String, Object> item = new HashMap<>();
                item.put("timestamp", entry.timestamp());
                item.put("level", entry.level());
                item.put("message", entry.message());
                payload.add(item);
            }
            return payload;
        }
    }

    private final Map<String, ImportTask> tasks = new ConcurrentHashMap<>();

    private record LogEntry(long timestamp, String level, String message) {}

    /**
     * Создает новую задачу импорта.
     *
     * @param taskId уникальный идентификатор задачи
     * @return созданная задача
     */
    public ImportTask createTask(String taskId) {
        ImportTask task = new ImportTask(taskId);
        tasks.put(taskId, task);
        return task;
    }

    /**
     * Возвращает задачу по идентификатору.
     *
     * @param taskId идентификатор задачи
     * @return задача или null, если не найдена
     */
    public ImportTask getTask(String taskId) {
        return tasks.get(taskId);
    }

    /**
     * Обновляет статус, прогресс и сообщение задачи.
     *
     * @param taskId идентификатор задачи
     * @param status новый статус
     * @param progress новый прогресс
     * @param message новое сообщение
     */
    public void updateTask(String taskId, TaskStatus status, int progress, String message) {
        updateTask(taskId, status, progress, message, null);
    }

    /**
     * Обновляет статус, прогресс, сообщение и метрики задачи.
     *
     * @param taskId идентификатор задачи
     * @param status новый статус
     * @param progress новый прогресс
     * @param message новое сообщение
     * @param metrics метрики задачи (опционально)
     */
    public void updateTask(String taskId, TaskStatus status, int progress, String message, Map<String, Object> metrics) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setStatus(status);
            task.setProgress(progress);
            task.setMessage(message);
            if (metrics != null) {
                task.setMetrics(metrics);
            }

            // Отправляем обновление через WebSocket
            sendWebSocketUpdate(taskId, task);
        }
    }

    /**
     * Обновляет прогресс задачи на основе импортированных глав.
     *
     * @param taskId идентификатор задачи
     */
    public void updateTaskProgress(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.updateProgress();

            // Отправляем обновление через WebSocket
            sendWebSocketUpdate(taskId, task);
        }
    }

    /**
     * Помечает задачу как завершенную.
     *
     * @param taskId идентификатор задачи
     */
    public void markTaskCompleted(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setStatus(TaskStatus.COMPLETED);
            task.setProgress(100);
            task.setMessage("Импорт завершен успешно");

            LocalDateTime completedAt = task.getUpdatedAt();
            task.setMetrics(buildMetricsSnapshot(task, completedAt, "completed", null));

            // Отправляем обновление через WebSocket
            sendWebSocketUpdate(taskId, task);
        }
    }

    /**
     * Помечает задачу как завершившуюся с ошибкой.
     *
     * @param taskId идентификатор задачи
     * @param errorMessage сообщение об ошибке
     */
    public void markTaskFailed(String taskId, String errorMessage) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setStatus(TaskStatus.FAILED);
            task.setMessage("Ошибка импорта: " + errorMessage);
            task.setErrorMessage(errorMessage);

            LocalDateTime failedAt = task.getUpdatedAt();
            task.setMetrics(buildMetricsSnapshot(task, failedAt, "failed", errorMessage));

            // Отправляем обновление через WebSocket
            sendWebSocketUpdate(taskId, task);
        }
    }

    /**
     * Увеличивает счетчик импортированных глав.
     *
     * @param taskId идентификатор задачи
     */
    public void incrementImportedChapters(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setImportedChapters(task.getImportedChapters() + 1);
            task.updateProgress();
            task.setMessage("Импортировано глав: " + task.getImportedChapters() + "/" + task.getTotalChapters());

            // Отправляем обновление через WebSocket
            sendWebSocketUpdate(taskId, task);
        }
    }

    /**
     * Увеличивает счетчик импортированных страниц.
     *
     * @param taskId идентификатор задачи
     */
    public void incrementImportedPages(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setImportedPages(task.getImportedPages() + 1);

            // Отправляем обновление через WebSocket только каждые 10 страниц для производительности
            if (task.getImportedPages() % 10 == 0 || task.getImportedPages() == task.getTotalPages()) {
                task.setMessage("Импортировано страниц: " + task.getImportedPages() + "/" + task.getTotalPages());
                sendWebSocketUpdate(taskId, task);
            }
        }
    }

    /**
     * Добавляет лог к задаче и отправляет его подписчикам.
     *
     * @param taskId идентификатор задачи
     * @param level уровень логирования (INFO, WARN, ERROR)
     * @param message текст сообщения
     */
    public void appendLog(String taskId, String level, String message) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.addLog(level, message);
            if (webSocketHandler != null) {
                webSocketHandler.sendLogMessage(taskId, level != null ? level : "INFO", message != null ? message : "");
            }
        }
    }

    /**
     * Отправляет обновление прогресса через WebSocket
     */
    private void sendWebSocketUpdate(String taskId, ImportTask task) {
        if (webSocketHandler != null && task != null) {
            Map<String, Object> progressData = task.toMap();
            // Приводим поля к ожидаемым фронтом
            progressData.put("task_id", task.getTaskId());
            progressData.put("status", task.getStatus().toString().toLowerCase());
            progressData.put("progress", task.getProgress());
            progressData.put("message", task.getMessage());
            progressData.put("updated_at", task.getUpdatedAt().toString());
            progressData.put("metrics", task.getMetrics());
            // Отправляем прогресс
            webSocketHandler.sendProgressUpdate(taskId, progressData);
            // Можно добавить лог-сообщение при завершении или ошибке
            if (task.getStatus() == TaskStatus.COMPLETED) {
                appendLog(taskId, "INFO", "Импорт завершён успешно");
            } else if (task.getStatus() == TaskStatus.FAILED) {
                appendLog(taskId, "ERROR", task.getErrorMessage());
            }
        }
    }

    private Map<String, Object> buildMetricsSnapshot(ImportTask task, LocalDateTime finishedAt, String status, String errorMessage) {
        Map<String, Object> metrics = new HashMap<>();
        LocalDateTime startedAt = task.getCreatedAt();
        Duration duration = Duration.between(startedAt, finishedAt != null ? finishedAt : LocalDateTime.now());

        metrics.put("status", status);
        metrics.put("started_at", startedAt.toString());
        metrics.put("finished_at", (finishedAt != null ? finishedAt : LocalDateTime.now()).toString());
        metrics.put("duration_ms", duration.toMillis());
        metrics.put("duration_seconds", duration.getSeconds());
        metrics.put("duration_formatted", formatDuration(duration));
        metrics.put("total_chapters", task.getTotalChapters());
        metrics.put("imported_chapters", task.getImportedChapters());
        metrics.put("total_pages", task.getTotalPages());
        metrics.put("imported_pages", task.getImportedPages());

        if (task.getMangaId() != null) {
            metrics.put("manga_id", task.getMangaId());
        }
        if (task.getTitle() != null) {
            metrics.put("title", task.getTitle());
        }
        if (errorMessage != null && !errorMessage.isBlank()) {
            metrics.put("error_message", errorMessage);
        }

        return metrics;
    }

    private String formatDuration(Duration duration) {
        long seconds = duration.getSeconds();
        long absSeconds = Math.abs(seconds);
        long hours = absSeconds / 3600;
        long minutes = (absSeconds % 3600) / 60;
        long secs = absSeconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }
}
