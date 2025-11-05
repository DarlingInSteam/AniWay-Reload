package shadowshift.studio.mangaservice.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Aggregated review metrics returned by AuthService internal API.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MangaReviewAggregateResponse(Long mangaId, Double averageRating, Long totalReviews) {
}
