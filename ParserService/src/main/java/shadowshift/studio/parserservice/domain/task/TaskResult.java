package shadowshift.studio.parserservice.domain.task;

import java.time.Instant;
import java.util.Map;

/**
 * Итог выполнения задачи по конкретному slug (для batch) либо глобальный результат.
 */
public class TaskResult {

    private final String slug;
    private final String step;
    private final TaskStatus status;
    private final Instant completedAt;
    private final Map<String, Object> metrics;
    private final String error;
    private final boolean imported;

    public TaskResult(String slug,
                      String step,
                      TaskStatus status,
                      Instant completedAt,
                      Map<String, Object> metrics,
                      String error,
                      boolean imported) {
        this.slug = slug;
        this.step = step;
        this.status = status;
        this.completedAt = completedAt;
        this.metrics = metrics;
        this.error = error;
        this.imported = imported;
    }

    public String getSlug() {
        return slug;
    }

    public String getStep() {
        return step;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Map<String, Object> getMetrics() {
        return metrics;
    }

    public String getError() {
        return error;
    }

    public boolean isImported() {
        return imported;
    }
}
