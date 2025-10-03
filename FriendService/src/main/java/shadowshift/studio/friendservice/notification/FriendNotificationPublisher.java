package shadowshift.studio.friendservice.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class FriendNotificationPublisher {

    private static final Duration TIMEOUT = Duration.ofSeconds(2);

    private final WebClient.Builder builder;

    @Value("${notification.service.base-url:http://notification-service:8095}")
    private String notificationBaseUrl;

    private WebClient client() {
        return builder.baseUrl(notificationBaseUrl).build();
    }

    public void publishFriendRequestReceived(Long targetUserId, Long requesterId, UUID requestId, String message) {
        if (targetUserId == null || targetUserId <= 0) {
            return;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("targetUserId", targetUserId);
        payload.put("requestId", requestId);
        payload.put("requesterId", requesterId);
        payload.put("message", message);
        sendAsync("/internal/events/friend-request", payload);
    }

    public void publishFriendRequestAccepted(Long requesterId, Long accepterId, UUID requestId) {
        if (requesterId == null || requesterId <= 0) {
            return;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("targetUserId", requesterId);
        payload.put("requestId", requestId);
        payload.put("accepterId", accepterId);
        sendAsync("/internal/events/friend-accepted", payload);
    }

    private void sendAsync(String uri, Map<String, Object> body) {
        client().post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .timeout(TIMEOUT)
                .doOnError(throwable -> log.warn("Не удалось отправить уведомление {}: {}", uri, throwable.getMessage()))
                .onErrorResume(e -> Mono.empty())
                .subscribe();
    }
}
