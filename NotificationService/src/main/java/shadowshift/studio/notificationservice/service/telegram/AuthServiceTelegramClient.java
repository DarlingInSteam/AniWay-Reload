package shadowshift.studio.notificationservice.service.telegram;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.notificationservice.dto.TelegramConsumeResponse;
import shadowshift.studio.notificationservice.dto.TelegramRecipient;

import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthServiceTelegramClient {

    @Value("${services.auth.base-url:http://auth-service:8085}")
    private String authServiceBaseUrl;

    private final RestTemplate restTemplate;

    public Optional<TelegramRecipient> getRecipientForUser(Long userId) {
        try {
            ResponseEntity<TelegramRecipient> response = restTemplate.getForEntity(
                    authServiceBaseUrl + "/internal/telegram/user/{id}",
                    TelegramRecipient.class,
                    userId
            );
            return Optional.ofNullable(response.getBody());
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to fetch telegram info for user {}: {}", userId, ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<TelegramRecipient> getRecipientByChatId(Long chatId) {
        try {
            ResponseEntity<TelegramRecipient> response = restTemplate.getForEntity(
                    authServiceBaseUrl + "/internal/telegram/chat/{chatId}",
                    TelegramRecipient.class,
                    chatId
            );
            return Optional.ofNullable(response.getBody());
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to fetch telegram info by chat {}: {}", chatId, ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<TelegramConsumeResponse> consumeToken(String token, Long chatId, String username, String firstName, String lastName, String languageCode) {
        Map<String, Object> payload = Map.of(
                "token", token,
                "chatId", chatId,
                "chatUsername", username,
                "firstName", firstName,
                "lastName", lastName,
                "languageCode", languageCode
        );
        try {
            ResponseEntity<TelegramConsumeResponse> response = restTemplate.postForEntity(
                    authServiceBaseUrl + "/internal/telegram/consume",
                    payload,
                    TelegramConsumeResponse.class
            );
            return Optional.ofNullable(response.getBody());
        } catch (Exception ex) {
            log.warn("Failed to consume telegram token for chat {}: {}", chatId, ex.getMessage());
            return Optional.empty();
        }
    }

    public void unlinkByChat(Long chatId, String reason) {
        if (chatId == null) {
            return;
        }
        Map<String, Object> payload = Map.of(
                "chatId", chatId,
                "userId", null,
                "reason", reason,
                "disableOnly", false
        );
        try {
            restTemplate.postForEntity(authServiceBaseUrl + "/internal/telegram/unlink", payload, Void.class);
        } catch (Exception ex) {
            log.warn("Failed to unlink telegram chat {}: {}", chatId, ex.getMessage());
        }
    }

    public void disableNotifications(Long userId, String reason) {
        if (userId == null) {
            return;
        }
        Map<String, Object> payload = Map.of(
                "chatId", null,
                "userId", userId,
                "reason", reason,
                "disableOnly", true
        );
        try {
            restTemplate.postForEntity(authServiceBaseUrl + "/internal/telegram/unlink", payload, Void.class);
        } catch (Exception ex) {
            log.warn("Failed to disable telegram notifications for user {}: {}", userId, ex.getMessage());
        }
    }
}
