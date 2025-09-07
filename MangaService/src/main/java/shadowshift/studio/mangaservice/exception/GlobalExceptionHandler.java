package shadowshift.studio.mangaservice.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Глобальный обработчик исключений для MangaService.
 *
 * Централизует обработку всех исключений в приложении,
 * обеспечивая единообразные ответы об ошибках и логирование.
 * Следует принципу единственной ответственности.
 *
 * @author ShadowShiftStudio
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Обрабатывает исключения валидации данных.
     *
     * @param ex исключение валидации
     * @return ответ с информацией об ошибках валидации
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex) {
        logger.warn("Ошибка валидации: {}", ex.getMessage());

        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                    FieldError::getField,
                    FieldError::getDefaultMessage,
                    (existing, replacement) -> existing + "; " + replacement
                ));

        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorCode("VALIDATION_ERROR")
                .message("Ошибка валидации входных данных")
                .timestamp(LocalDateTime.now())
                .details(fieldErrors)
                .build();

        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * Обрабатывает исключения валидации при связывании параметров.
     *
     * @param ex исключение связывания
     * @return ответ с информацией об ошибках валидации
     */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ErrorResponse> handleBindException(BindException ex) {
        logger.warn("Ошибка связывания параметров: {}", ex.getMessage());

        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                    FieldError::getField,
                    FieldError::getDefaultMessage,
                    (existing, replacement) -> existing + "; " + replacement
                ));

        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorCode("BIND_ERROR")
                .message("Ошибка связывания параметров запроса")
                .timestamp(LocalDateTime.now())
                .details(fieldErrors)
                .build();

        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * Обрабатывает кастомные исключения MangaService.
     *
     * @param ex кастомное исключение
     * @return ответ с информацией об ошибке
     */
    @ExceptionHandler(MangaServiceException.class)
    public ResponseEntity<ErrorResponse> handleMangaServiceException(MangaServiceException ex) {
        HttpStatus status = determineHttpStatus(ex.getErrorCode());

        if (status.is5xxServerError()) {
            logger.error("Серверная ошибка: {}", ex.getMessage(), ex);
        } else {
            logger.warn("Клиентская ошибка: {}", ex.getMessage());
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorCode(ex.getErrorCode())
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(status).body(errorResponse);
    }

    /**
     * Обрабатывает исключения недопустимых аргументов.
     *
     * @param ex исключение недопустимого аргумента
     * @return ответ с информацией об ошибке
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        logger.warn("Недопустимый аргумент: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorCode("INVALID_ARGUMENT")
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * Обрабатывает все непредвиденные исключения.
     *
     * @param ex непредвиденное исключение
     * @return ответ с общей информацией об ошибке
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        logger.error("Непредвиденная ошибка: {}", ex.getMessage(), ex);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .errorCode("INTERNAL_SERVER_ERROR")
                .message("Произошла внутренняя ошибка сервера")
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    /**
     * Определяет HTTP-статус на основе кода ошибки.
     *
     * @param errorCode код ошибки
     * @return соответствующий HTTP-статус
     */
    private HttpStatus determineHttpStatus(String errorCode) {
        return switch (errorCode) {
            case "MANGA_NOT_FOUND" -> HttpStatus.NOT_FOUND;
            case "MANGA_VALIDATION_ERROR", "INVALID_ARGUMENT" -> HttpStatus.BAD_REQUEST;
            case "EXTERNAL_SERVICE_ERROR" -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.INTERNAL_SERVER_ERROR;
        };
    }

    /**
     * Класс для стандартизированных ответов об ошибках.
     */
    public static class ErrorResponse {
        private String errorCode;
        private String message;
        private LocalDateTime timestamp;
        private Map<String, Object> details;

        /**
         * Создает новый билдер для ErrorResponse.
         *
         * @return билдер
         */
        public static Builder builder() {
            return new Builder();
        }

        /**
         * Возвращает код ошибки.
         *
         * @return код ошибки
         */
        public String getErrorCode() { return errorCode; }

        /**
         * Устанавливает код ошибки.
         *
         * @param errorCode код ошибки
         */
        public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

        /**
         * Возвращает сообщение об ошибке.
         *
         * @return сообщение об ошибке
         */
        public String getMessage() { return message; }

        /**
         * Устанавливает сообщение об ошибке.
         *
         * @param message сообщение об ошибке
         */
        public void setMessage(String message) { this.message = message; }

        /**
         * Возвращает временную метку ошибки.
         *
         * @return временная метка
         */
        public LocalDateTime getTimestamp() { return timestamp; }

        /**
         * Устанавливает временную метку ошибки.
         *
         * @param timestamp временная метка
         */
        public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

        /**
         * Возвращает детали ошибки.
         *
         * @return детали ошибки
         */
        public Map<String, Object> getDetails() { return details; }

        /**
         * Устанавливает детали ошибки.
         *
         * @param details детали ошибки
         */
        public void setDetails(Map<String, Object> details) { this.details = details; }

        /**
         * Билдер для создания экземпляров ErrorResponse.
         */
        public static class Builder {
            private final ErrorResponse response = new ErrorResponse();

            /**
             * Устанавливает код ошибки.
             *
             * @param errorCode код ошибки
             * @return билдер
             */
            public Builder errorCode(String errorCode) {
                response.errorCode = errorCode;
                return this;
            }

            /**
             * Устанавливает сообщение об ошибке.
             *
             * @param message сообщение об ошибке
             * @return билдер
             */
            public Builder message(String message) {
                response.message = message;
                return this;
            }

            /**
             * Устанавливает временную метку ошибки.
             *
             * @param timestamp временная метка
             * @return билдер
             */
            public Builder timestamp(LocalDateTime timestamp) {
                response.timestamp = timestamp;
                return this;
            }

            /**
             * Устанавливает детали ошибки.
             *
             * @param details детали ошибки
             * @return билдер
             */
            public Builder details(Map<String, ?> details) {
                response.details = new HashMap<>(details);
                return this;
            }

            /**
             * Создает экземпляр ErrorResponse.
             *
             * @return экземпляр ErrorResponse
             */
            public ErrorResponse build() {
                return response;
            }
        }
    }
}
