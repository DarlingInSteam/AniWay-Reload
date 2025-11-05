package shadowshift.studio.chapterservice.dto;

/**
 * Represents the total number of likes for a particular manga aggregated across all its chapters.
 */
public record MangaLikesAggregateDTO(Long mangaId, Long totalLikes) {
}
