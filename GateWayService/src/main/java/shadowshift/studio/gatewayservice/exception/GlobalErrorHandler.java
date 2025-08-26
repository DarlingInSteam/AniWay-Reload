package shadowshift.studio.gatewayservice.exception;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.cloud.gateway.support.NotFoundException;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Глобальный обработчик ошибок для API Gateway.
 *
 * Перехватывает все ошибки, возникающие в Gateway, и возвращает
 * структурированные ответы в формате JSON.
 *
 * @author AniWay Development Team
 * @version 1.0.0
 */
@Component
@Order(-1)
public class GlobalErrorHandler implements ErrorWebExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalErrorHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();

        if (response.isCommitted()) {
            return Mono.error(ex);
        }

        HttpStatus status;
        String message;
        String error;

        // Определяем тип ошибки и соответствующий HTTP статус
        if (ex instanceof NotFoundException) {
            status = HttpStatus.NOT_FOUND;
            error = "Service Not Found";
            message = "Запрашиваемый сервис недоступен";
            logger.warn("🔴 Service not found: {}", ex.getMessage());
        } else if (ex instanceof ResponseStatusException) {
            ResponseStatusException responseStatusException = (ResponseStatusException) ex;
            status = HttpStatus.valueOf(responseStatusException.getStatusCode().value());
            error = status.getReasonPhrase();
            message = responseStatusException.getReason() != null ? responseStatusException.getReason() : "Внутренняя ошибка сервера";
            logger.error("🔴 Response status exception: {}", ex.getMessage());
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            error = "Internal Server Error";
            message = "Внутренняя ошибка сервера";
            logger.error("🔴 Unexpected error in Gateway: ", ex);
        }

        // Создаем структурированный ответ об ошибке
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", status.value());
        errorResponse.put("error", error);
        errorResponse.put("message", message);
        errorResponse.put("path", exchange.getRequest().getPath().value());

        // Настраиваем заголовки ответа
        response.setStatusCode(status);
        response.getHeaders().add("Content-Type", MediaType.APPLICATION_JSON_VALUE);

        // Сериализуем ответ в JSON
        String jsonResponse;
        try {
            jsonResponse = objectMapper.writeValueAsString(errorResponse);
        } catch (JsonProcessingException e) {
            logger.error("Error serializing error response", e);
            jsonResponse = "{\"error\":\"Internal Server Error\",\"message\":\"Ошибка сериализации ответа\"}";
        }

        DataBuffer buffer = response.bufferFactory().wrap(jsonResponse.getBytes());
        return response.writeWith(Mono.just(buffer));
    }
}
