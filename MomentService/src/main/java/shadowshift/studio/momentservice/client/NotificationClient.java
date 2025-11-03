package shadowshift.studio.momentservice.client;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);

    private final WebClient webClient;

    public NotificationClient(WebClient.Builder builder,
                              @Value("${notification.service.base-url:http://notification-service:8095}") String baseUrl) {
        this.webClient = builder.baseUrl(baseUrl).build();
    }

    public void publishMomentLiked(Long uploaderId, Long momentId, Long mangaId, Long actorUserId) {
        if (uploaderId == null || actorUserId == null || uploaderId.equals(actorUserId)) {
            return;
        }
        Map<String, Object> body = new HashMap<>();
        body.put("momentId", momentId);
        body.put("mangaId", mangaId);
        body.put("uploaderId", uploaderId);
        body.put("actorUserId", actorUserId);
        webClient.post()
            .uri("/internal/events/moment-liked")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(body)
            .retrieve()
            .toBodilessEntity()
            .timeout(Duration.ofSeconds(2))
            .doOnError(ex -> log.warn("Failed to publish moment-liked notification: {}", ex.getMessage()))
            .onErrorResume(ex -> Mono.empty())
            .subscribe();
    }
}
