package shadowshift.studio.parserservice.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class TaskStatusResponse {

    private final UUID taskId;
    private final String type;
    private final String status;
    private final int progress;
    private final String message;
    private final List<String> slugs;
    private final String currentSlug;
    private final int totalSlugs;
    private final int completedSlugs;
    private final int failedSlugs;
    private final Instant createdAt;
    private final Instant startedAt;
    private final Instant updatedAt;
    private final Instant completedAt;
    private final List<TaskResultDto> results;
    private final Map<String, Object> metrics;
    private final String buildState;

    public TaskStatusResponse(UUID taskId,
                              String type,
                              String status,
                              int progress,
                              String message,
                              List<String> slugs,
                              String currentSlug,
                              int totalSlugs,
                              int completedSlugs,
                              int failedSlugs,
                              Instant createdAt,
                              Instant startedAt,
                              Instant updatedAt,
                              Instant completedAt,
                              List<TaskResultDto> results,
                              Map<String, Object> metrics,
                              String buildState) {
        this.taskId = taskId;
        this.type = type;
        this.status = status;
        this.progress = progress;
        this.message = message;
        this.slugs = slugs;
        this.currentSlug = currentSlug;
        this.totalSlugs = totalSlugs;
        this.completedSlugs = completedSlugs;
        this.failedSlugs = failedSlugs;
        this.createdAt = createdAt;
        this.startedAt = startedAt;
        this.updatedAt = updatedAt;
        this.completedAt = completedAt;
        this.results = results;
        this.metrics = metrics;
        this.buildState = buildState;
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

    public List<String> getSlugs() {
        return slugs;
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

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public List<TaskResultDto> getResults() {
        return results;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public String getBuildState() {
        return buildState;
    }
}
