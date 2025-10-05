package shadowshift.studio.messageservice.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class NotificationPublisher {

    private final WebClient webClient;

    public NotificationPublisher(WebClient.Builder builder,
                                 @Value("${notifications.base-url}") String notificationsBaseUrl) {
        this.webClient = builder.baseUrl(notificationsBaseUrl).build();
    }

    public void publishDirectMessage(Long recipientUserId, UUID conversationId, UUID messageId, String preview) {
        Map<String, Object> payload = Map.of(
                "recipientUserId", recipientUserId,
                "conversationId", conversationId,
                "messageId", messageId,
                "preview", preview
        );
        post("/internal/events/direct-message", payload);
    }

    public void publishDirectReply(Long recipientUserId, UUID conversationId, UUID messageId, UUID replyToMessageId) {
        Map<String, Object> payload = Map.of(
                "recipientUserId", recipientUserId,
                "conversationId", conversationId,
                "messageId", messageId,
                "replyToMessageId", replyToMessageId
        );
        post("/internal/events/direct-message-reply", payload);
    }

    public void publishChannelReply(Long recipientUserId, Long categoryId, UUID messageId, UUID replyToMessageId) {
        Map<String, Object> payload = Map.of(
                "recipientUserId", recipientUserId,
                "categoryId", categoryId,
                "messageId", messageId,
                "replyToMessageId", replyToMessageId
        );
        post("/internal/events/channel-message-reply", payload);
    }

    private void post(String path, Map<String, Object> payload) {
        try {
            webClient.post()
                    .uri(path)
                    .bodyValue(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception ex) {
            log.warn("Failed to send notification to {}: {}", path, ex.getMessage());
        }
    }
}
