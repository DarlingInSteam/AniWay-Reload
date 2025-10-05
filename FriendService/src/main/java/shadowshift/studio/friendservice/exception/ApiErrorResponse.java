package shadowshift.studio.friendservice.exception;

import java.time.Instant;
import java.util.Map;

public record ApiErrorResponse(int status,
                               String error,
                               String message,
                               Instant timestamp,
                               Map<String, Object> details) {

    public static ApiErrorResponse of(int status, String error, String message) {
        return new ApiErrorResponse(status, error, message, Instant.now(), Map.of());
    }

    public static ApiErrorResponse of(int status, String error, String message, Map<String, Object> details) {
        return new ApiErrorResponse(status, error, message, Instant.now(), details == null ? Map.of() : details);
    }
}
