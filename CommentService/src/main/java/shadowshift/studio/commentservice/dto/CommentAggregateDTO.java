package shadowshift.studio.commentservice.dto;

/**
 * Represents aggregated comment statistics for a specific target.
 */
public record CommentAggregateDTO(Long targetId, Long totalComments) {
}
