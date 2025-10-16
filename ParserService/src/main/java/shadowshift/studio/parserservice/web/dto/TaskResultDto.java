package shadowshift.studio.parserservice.web.dto;

import java.time.Instant;
import java.util.Map;

public class TaskResultDto {

    private final String slug;
    private final String step;
    private final String status;
    private final Instant completedAt;
    private final Map<String, Object> metrics;
    private final String error;
    private final Boolean imported;

    public TaskResultDto(String slug,
                         String step,
                         String status,
                         Instant completedAt,
                         Map<String, Object> metrics,
                         String error,
                         Boolean imported) {
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

    public String getStatus() {
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

    public Boolean getImported() {
        return imported;
    }
}
