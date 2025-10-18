package shadowshift.studio.parserservice.web.dto;

import java.time.Instant;

public class TaskLogDto {

    private final long sequence;
    private final Instant timestamp;
    private final String level;
    private final String message;

    public TaskLogDto(long sequence, Instant timestamp, String level, String message) {
        this.sequence = sequence;
        this.timestamp = timestamp;
        this.level = level;
        this.message = message;
    }

    public long getSequence() {
        return sequence;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public String getLevel() {
        return level;
    }

    public String getMessage() {
        return message;
    }
}
