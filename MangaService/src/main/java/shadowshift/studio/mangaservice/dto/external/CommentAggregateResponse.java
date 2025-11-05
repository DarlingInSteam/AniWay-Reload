package shadowshift.studio.mangaservice.dto.external;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Aggregated comment totals returned by CommentService internal endpoint.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommentAggregateResponse(Long targetId, Long totalComments) {
}
