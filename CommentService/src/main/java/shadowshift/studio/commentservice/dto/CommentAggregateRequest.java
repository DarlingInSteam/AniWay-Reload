package shadowshift.studio.commentservice.dto;

import java.util.List;

/**
 * Request payload for retrieving aggregated comment metrics.
 */
public record CommentAggregateRequest(String commentType, List<Long> targetIds) {
}
