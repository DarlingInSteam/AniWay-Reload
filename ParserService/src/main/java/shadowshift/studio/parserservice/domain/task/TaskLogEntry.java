package shadowshift.studio.parserservice.domain.task;

import java.time.Instant;

/**
 * Единичная запись лога задачи. Используется для отдачи /logs и SSE-потока.
 */
public record TaskLogEntry(
        long sequence,
        Instant timestamp,
        String level,
        String message
) {
}
