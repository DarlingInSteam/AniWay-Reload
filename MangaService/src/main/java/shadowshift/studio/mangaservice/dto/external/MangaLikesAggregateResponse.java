package shadowshift.studio.mangaservice.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Projection of aggregated like counts as returned by ChapterService internal API.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MangaLikesAggregateResponse(Long mangaId, Long totalLikes) {
}
