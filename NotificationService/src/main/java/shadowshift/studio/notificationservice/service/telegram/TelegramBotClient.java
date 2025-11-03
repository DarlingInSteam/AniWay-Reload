package shadowshift.studio.notificationservice.service.telegram;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramBotClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${telegram.api-base:https://api.telegram.org}")
    private String apiBase;

    public TelegramSendResult sendMessage(Long chatId, String text) {
        if (chatId == null) {
            return TelegramSendResult.failure("NO_CHAT", "Empty chat id", 0, false);
        }
        if (botToken == null || botToken.isBlank()) {
            log.warn("Telegram bot token is not configured");
            return TelegramSendResult.failure("NO_TOKEN", "Bot token not configured", 0, false);
        }
        String base = apiBase;
        if (base == null || base.isBlank()) {
            base = "https://api.telegram.org";
        }
        if (!base.endsWith("/")) {
            base += "/";
        }
        String url = base + "bot" + botToken + "/sendMessage";
        Map<String, Object> body = Map.of(
                "chat_id", chatId,
                "text", text,
                "disable_web_page_preview", true
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        try {
            ResponseEntity<TelegramApiResponse> response = restTemplate.postForEntity(url, entity, TelegramApiResponse.class);
            TelegramApiResponse apiResponse = response.getBody();
            if (apiResponse != null && apiResponse.ok) {
                return TelegramSendResult.ok();
            }
            Integer errorCode = apiResponse != null ? apiResponse.errorCode : response.getStatusCode().value();
            String description = apiResponse != null ? apiResponse.description : response.getStatusCode().toString();
            int retryAfter = apiResponse != null && apiResponse.parameters != null && apiResponse.parameters.retryAfter != null
                    ? apiResponse.parameters.retryAfter
                    : 0;
            boolean retryable = errorCode != null && errorCode == 429;
            return TelegramSendResult.failure(String.valueOf(errorCode), description, retryAfter, retryable);
        } catch (HttpStatusCodeException ex) {
            TelegramApiResponse apiResponse = readError(ex.getResponseBodyAsByteArray());
            Integer errorCode = apiResponse != null ? apiResponse.errorCode : ex.getStatusCode().value();
            String description = apiResponse != null ? apiResponse.description : ex.getResponseBodyAsString(StandardCharsets.UTF_8);
            int retryAfter = apiResponse != null && apiResponse.parameters != null && apiResponse.parameters.retryAfter != null
                    ? apiResponse.parameters.retryAfter
                    : parseRetryAfter(ex);
            boolean retryable = errorCode != null && errorCode == 429;
            return TelegramSendResult.failure(String.valueOf(errorCode), description, retryAfter, retryable);
        } catch (Exception ex) {
            log.warn("Failed to send telegram message: {}", ex.getMessage());
            return TelegramSendResult.failure("EXCEPTION", ex.getMessage(), 0, false);
        }
    }

    private TelegramApiResponse readError(byte[] body) {
        if (body == null || body.length == 0) {
            return null;
        }
        try {
            return objectMapper.readValue(body, TelegramApiResponse.class);
        } catch (Exception e) {
            return null;
        }
    }

    private int parseRetryAfter(HttpStatusCodeException ex) {
        String header = ex.getResponseHeaders() != null ? ex.getResponseHeaders().getFirst("Retry-After") : null;
        if (header == null) {
            return 0;
        }
        try {
            return Integer.parseInt(header.trim());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class TelegramApiResponse {
        @JsonProperty("ok")
        boolean ok;
        @JsonProperty("error_code")
        Integer errorCode;
        @JsonProperty("description")
        String description;
        @JsonProperty("parameters")
        ResponseParameters parameters;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ResponseParameters {
        @JsonProperty("retry_after")
        Integer retryAfter;
    }
}
