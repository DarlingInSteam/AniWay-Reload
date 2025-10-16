package shadowshift.studio.parserservice.web.dto;

import java.time.Instant;
import java.util.UUID;

public class TaskSummaryResponse {

    private final UUID taskId;
    private final String type;
    private final String status;
    private final int progress;
    private final String message;
    private final String slug;
    private final String currentSlug;
    private final int totalSlugs;
    private final int completedSlugs;
    private final int failedSlugs;
    private final Instant createdAt;
    private final Instant updatedAt;

    public TaskSummaryResponse(UUID taskId,
                               String type,
                               String status,
                               int progress,
                               String message,
                               String slug,
                               String currentSlug,
                               int totalSlugs,
                               int completedSlugs,
                               int failedSlugs,
                               Instant createdAt,
                               Instant updatedAt) {
        this.taskId = taskId;
        this.type = type;
        this.status = status;
        this.progress = progress;
        this.message = message;
        this.slug = slug;
        this.currentSlug = currentSlug;
        this.totalSlugs = totalSlugs;
        this.completedSlugs = completedSlugs;
        this.failedSlugs = failedSlugs;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public String getType() {
        return type;
    }

    public String getStatus() {
        return status;
    }

    public int getProgress() {
        return progress;
    }

    public String getMessage() {
        return message;
    }

    public String getSlug() {
        return slug;
    }

    public String getCurrentSlug() {
        return currentSlug;
    }

    public int getTotalSlugs() {
        return totalSlugs;
    }

    public int getCompletedSlugs() {
        return completedSlugs;
    }

    public int getFailedSlugs() {
        return failedSlugs;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
