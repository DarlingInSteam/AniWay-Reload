package shadowshift.studio.commentservice.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventPublisher {

    private final WebClient.Builder builder;

    @Value("${notification.service.base-url:http://notification-service:8095}")
    private String notificationBaseUrl;

    private WebClient client() { return builder.baseUrl(notificationBaseUrl).build(); }

    public void publishCommentCreated(Long targetUserId, Long commentId, Long mangaId, Long chapterId, Long replyToCommentId, String content) {
        if (targetUserId == null || targetUserId <= 0) return; // no target
        Map<String,Object> body = new HashMap<>();
        body.put("targetUserId", targetUserId);
        body.put("commentId", commentId);
        body.put("mangaId", mangaId);
        body.put("chapterId", chapterId);
        body.put("replyToCommentId", replyToCommentId);
        body.put("content", content);
        client().post()
                .uri("/internal/events/comment-created")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .timeout(java.time.Duration.ofSeconds(2))
                .doOnError(e -> log.warn("Failed to publish comment-created event: {}", e.getMessage()))
                .onErrorResume(e -> Mono.empty())
                .subscribe();
    }
}
