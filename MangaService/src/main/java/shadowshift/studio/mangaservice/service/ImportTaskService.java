package shadowshift.studio.mangaservice.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.Map;
import java.util.HashMap;

@Service
public class ImportTaskService {

    public enum TaskStatus {
        PENDING, IMPORTING_MANGA, IMPORTING_CHAPTERS, IMPORTING_PAGES, COMPLETED, FAILED
    }

    public static class ImportTask {
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

        public ImportTask(String taskId) {
            this.taskId = taskId;
            this.status = TaskStatus.PENDING;
            this.progress = 0;
            this.message = "Импорт поставлен в очередь";
            this.createdAt = LocalDateTime.now();
            this.updatedAt = LocalDateTime.now();
        }

        // Getters and setters
        public String getTaskId() { return taskId; }

        public TaskStatus getStatus() { return status; }
        public void setStatus(TaskStatus status) {
            this.status = status;
            this.updatedAt = LocalDateTime.now();
        }

        public int getProgress() { return progress; }
        public void setProgress(int progress) {
            this.progress = progress;
            this.updatedAt = LocalDateTime.now();
        }

        public String getMessage() { return message; }
        public void setMessage(String message) {
            this.message = message;
            this.updatedAt = LocalDateTime.now();
        }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public LocalDateTime getUpdatedAt() { return updatedAt; }

        public Long getMangaId() { return mangaId; }
        public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public int getTotalChapters() { return totalChapters; }
        public void setTotalChapters(int totalChapters) { this.totalChapters = totalChapters; }

        public int getImportedChapters() { return importedChapters; }
        public void setImportedChapters(int importedChapters) { this.importedChapters = importedChapters; }

        public int getTotalPages() { return totalPages; }
        public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

        public int getImportedPages() { return importedPages; }
        public void setImportedPages(int importedPages) { this.importedPages = importedPages; }

        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

        public void updateProgress() {
            if (totalChapters > 0) {
                this.progress = Math.min(100, (importedChapters * 100) / totalChapters);
            }
            this.updatedAt = LocalDateTime.now();
        }

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
            return result;
        }
    }

    private final Map<String, ImportTask> tasks = new ConcurrentHashMap<>();

    public ImportTask createTask(String taskId) {
        ImportTask task = new ImportTask(taskId);
        tasks.put(taskId, task);
        return task;
    }

    public ImportTask getTask(String taskId) {
        return tasks.get(taskId);
    }

    public void updateTask(String taskId, TaskStatus status, int progress, String message) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setStatus(status);
            task.setProgress(progress);
            task.setMessage(message);
        }
    }

    public void updateTaskProgress(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.updateProgress();
        }
    }

    public void markTaskCompleted(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setStatus(TaskStatus.COMPLETED);
            task.setProgress(100);
            task.setMessage("Импорт завершен успешно");
        }
    }

    public void markTaskFailed(String taskId, String errorMessage) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setStatus(TaskStatus.FAILED);
            task.setMessage("Ошибка импорта: " + errorMessage);
            task.setErrorMessage(errorMessage);
        }
    }

    public void incrementImportedChapters(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setImportedChapters(task.getImportedChapters() + 1);
            task.updateProgress();
            task.setMessage("Импортировано глав: " + task.getImportedChapters() + "/" + task.getTotalChapters());
        }
    }

    public void incrementImportedPages(String taskId) {
        ImportTask task = tasks.get(taskId);
        if (task != null) {
            task.setImportedPages(task.getImportedPages() + 1);
        }
    }
}
