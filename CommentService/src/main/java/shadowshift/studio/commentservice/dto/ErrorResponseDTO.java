package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для структурированного ответа с информацией об ошибке.
 * Используется для возврата клиентам стандартизированной информации об ошибках.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponseDTO {

    /** Сообщение об ошибке */
    private String message;

    /** HTTP статус код ошибки */
    private int status;

    /** Временная метка возникновения ошибки (в миллисекундах) */
    private long timestamp;

    /**
     * Фабричный метод для создания экземпляра ErrorResponseDTO.
     * Автоматически устанавливает текущую временную метку.
     *
     * @param message сообщение об ошибке
     * @param status HTTP статус код
     * @return новый экземпляр ErrorResponseDTO
     */
    public static ErrorResponseDTO of(String message, int status) {
        return ErrorResponseDTO.builder()
                .message(message)
                .status(status)
                .timestamp(System.currentTimeMillis())
                .build();
    }
}
