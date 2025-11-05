package shadowshift.studio.mangaservice.dto.external;

import java.util.List;

/**
 * Represents an external response mapping a manga to its chapter identifiers.
 */
public record MangaChapterIdsResponse(Long mangaId, List<Long> chapterIds) {
}
