package shadowshift.studio.chapterservice.dto;

import java.util.List;

/**
 * Represents a mapping between a manga and the chapter identifiers it owns.
 */
public record MangaChapterIdsDTO(Long mangaId, List<Long> chapterIds) {
}
