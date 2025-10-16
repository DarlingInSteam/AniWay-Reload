package shadowshift.studio.parserservice.domain.task;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Представление задачи парсинга/билда. Изначально хранится в памяти, позднее будет вынесено в БД.
 */
public class ParserTask {

    private final UUID id;
    private final TaskType type;
    private final List<String> slugs;

    private volatile TaskStatus status;
    private volatile int progress;
    private volatile String message;
    private volatile String currentSlug;
    private volatile int totalSlugs;
    private volatile int completedSlugs;
    private volatile int failedSlugs;
    private volatile Instant startedAt;
    private volatile Instant completedAt;
    private final Instant createdAt;
    private volatile Instant updatedAt;

    private final Map<String, TaskResult> results = new ConcurrentHashMap<>();
    private final List<TaskLogEntry> logs = new CopyOnWriteArrayList<>();
    private final Map<String, Object> metrics = new ConcurrentHashMap<>();

    public ParserTask(UUID id, TaskType type, List<String> slugs) {
        this.id = Objects.requireNonNull(id, "id");
        this.type = Objects.requireNonNull(type, "type");
        this.slugs = slugs == null ? new ArrayList<>() : new ArrayList<>(slugs);
        this.status = TaskStatus.PENDING;
        this.progress = 0;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
        this.totalSlugs = this.slugs.size();
        this.message = "Task created";
    }

    public UUID getId() {
        return id;
    }

    public TaskType getType() {
        return type;
    }

    public List<String> getSlugs() {
        return Collections.unmodifiableList(slugs);
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
        touch();
    }

    public int getProgress() {
        return progress;
    }

    public void setProgress(int progress) {
        this.progress = Math.max(0, Math.min(100, progress));
        touch();
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
        touch();
    }

    public String getCurrentSlug() {
        return currentSlug;
    }

    public void setCurrentSlug(String currentSlug) {
        this.currentSlug = currentSlug;
        touch();
    }

    public int getTotalSlugs() {
        return totalSlugs;
    }

    public void setTotalSlugs(int totalSlugs) {
        this.totalSlugs = totalSlugs;
        touch();
    }

    public int getCompletedSlugs() {
        return completedSlugs;
    }

    public void setCompletedSlugs(int completedSlugs) {
        this.completedSlugs = completedSlugs;
        touch();
    }

    public int getFailedSlugs() {
        return failedSlugs;
    }

    public void setFailedSlugs(int failedSlugs) {
        this.failedSlugs = failedSlugs;
        touch();
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
        touch();
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
        touch();
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Map<String, TaskResult> getResults() {
        return Collections.unmodifiableMap(results);
    }

    public void putResult(String slug, TaskResult result) {
        if (slug != null && result != null) {
            results.put(slug, result);
            touch();
        }
    }

    public List<TaskLogEntry> getLogs() {
        return Collections.unmodifiableList(logs);
    }

    public void appendLog(TaskLogEntry entry) {
        if (entry != null) {
            logs.add(entry);
            touch();
        }
    }

    public Map<String, Object> getMetrics() {
        return Collections.unmodifiableMap(metrics);
    }

    public void putMetric(String key, Object value) {
        if (key != null && value != null) {
            metrics.put(key, value);
            touch();
        }
    }

    private void touch() {
        this.updatedAt = Instant.now();
    }
}
