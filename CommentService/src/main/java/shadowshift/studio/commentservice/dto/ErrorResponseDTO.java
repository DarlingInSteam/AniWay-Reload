package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для ответа с ошибкой
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponseDTO {
    private String message;
    private int status;
    private long timestamp;

    public static ErrorResponseDTO of(String message, int status) {
        return ErrorResponseDTO.builder()
                .message(message)
                .status(status)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
