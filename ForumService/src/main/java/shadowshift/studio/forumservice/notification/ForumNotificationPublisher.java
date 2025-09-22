package shadowshift.studio.forumservice.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
@Slf4j
public class ForumNotificationPublisher {

    private final WebClient.Builder builder;

    @Value("${notification.service.base-url:http://notification-service:8095}")
    private String notificationBaseUrl;

    private WebClient client() { return builder.baseUrl(notificationBaseUrl).build(); }

    public void publishThreadRootPost(Long targetUserId, Long threadId, Long postId, String title, String content) {
        if (targetUserId == null) return;
        send("/internal/events/forum-thread-post-created", targetUserId, threadId, postId, null, title, content);
    }

    public void publishReply(Long targetUserId, Long threadId, Long postId, Long parentPostId, String content) {
        if (targetUserId == null) return;
        send("/internal/events/forum-post-created", targetUserId, threadId, postId, parentPostId, null, content);
    }

    private void send(String path, Long targetUserId, Long threadId, Long postId, Long parentPostId, String title, String content) {
        try {
            java.util.Map<String,Object> body = new java.util.LinkedHashMap<>();
            body.put("targetUserId", targetUserId);
            body.put("threadId", threadId);
            body.put("postId", postId);
            body.put("parentPostId", parentPostId);
            body.put("title", title);
            body.put("content", content);
            client().post().uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .timeout(java.time.Duration.ofSeconds(2))
                    .doOnError(e -> log.warn("Forum notify send failed: {}", e.getMessage()))
                    .subscribe();
        } catch (Exception e) {
            log.warn("Forum notification publish error: {}", e.getMessage());
        }
    }
}