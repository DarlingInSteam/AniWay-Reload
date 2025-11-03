package shadowshift.studio.commentservice.service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
@Slf4j
public class MomentServiceWebhookClient {

    private final WebClient.Builder builder;

    @Value("${moment.service.base-url:http://moment-service:8099}")
    private String momentServiceBaseUrl;

    private WebClient client() {
        return builder.baseUrl(momentServiceBaseUrl).build();
    }

    public void publishCommentCreated(Long momentId, int commentsCount, Instant lastActivityAt) {
        if (momentId == null) {
            return;
        }
        Map<String, Object> payload = new HashMap<>();
        payload.put("count", commentsCount);
        payload.put("lastActivityAt", lastActivityAt != null ? lastActivityAt.toString() : null);
        client().post()
            .uri("/internal/moments/{id}/comments", momentId)
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(payload)
            .retrieve()
            .toBodilessEntity()
            .timeout(Duration.ofSeconds(2))
            .doOnError(ex -> log.warn("Failed to send comment count update for moment {}: {}", momentId, ex.getMessage()))
            .onErrorResume(ex -> Mono.empty())
            .subscribe();
    }

    public void publishCommentDeleted(Long momentId) {
        if (momentId == null) {
            return;
        }
        client().post()
            .uri("/internal/moments/{id}/comments/decrement", momentId)
            .retrieve()
            .toBodilessEntity()
            .timeout(Duration.ofSeconds(2))
            .doOnError(ex -> log.warn("Failed to send comment decrement for moment {}: {}", momentId, ex.getMessage()))
            .onErrorResume(ex -> Mono.empty())
            .subscribe();
    }

    public Map<Long, Integer> fetchCommentsCountBatch(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        try {
            return client().get()
                .uri(uriBuilder -> uriBuilder.path("/internal/moments/comments/count")
                    .queryParam("ids", String.join(",", ids.stream().map(String::valueOf).toList()))
                    .build())
                .retrieve()
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<Long, Integer>>() {})
                .block(Duration.ofSeconds(2));
        } catch (Exception ex) {
            log.warn("Failed to fetch comment counts batch: {}", ex.getMessage());
            return Map.of();
        }
    }
}