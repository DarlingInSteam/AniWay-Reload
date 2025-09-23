package shadowshift.studio.commentservice.review;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReviewAuthorClient {

    private final WebClient.Builder builder;

    @Value("${auth.service.base-url:http://auth-service:8082}")
    private String authServiceBaseUrl;

    private WebClient client() { return builder.baseUrl(authServiceBaseUrl).build(); }

    public Long findReviewAuthorId(Long reviewId) {
        if (reviewId == null) return null;
        try {
            // Предполагаемый эндпоинт: /internal/reviews/{id} возвращает JSON с userId
            ReviewDTO dto = client().get()
                    .uri("/internal/reviews/{id}", reviewId)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(ReviewDTO.class)
                    .block(java.time.Duration.ofSeconds(2));
            return dto != null ? dto.userId() : null;
        } catch (Exception e) {
            log.warn("Failed to fetch review author for review {}: {}", reviewId, e.getMessage());
            return null;
        }
    }

    public record ReviewDTO(Long id, Long userId, Long mangaId, Integer rating) {}
}