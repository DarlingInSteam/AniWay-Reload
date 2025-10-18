package shadowshift.studio.chapterservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Collections;
import java.util.List;

/**
 * DTO результата очистки пустых глав.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChapterCleanupResultDTO {

    private final int totalChecked;
    private final int emptyDetected;
    private final int deletedCount;
    private final List<Long> deletedChapterIds;
    private final List<Long> deletionFailedIds;
    private final List<Long> pageCheckFailedIds;

    public ChapterCleanupResultDTO(
            int totalChecked,
            int emptyDetected,
            int deletedCount,
            List<Long> deletedChapterIds,
            List<Long> deletionFailedIds,
            List<Long> pageCheckFailedIds
    ) {
        this.totalChecked = Math.max(0, totalChecked);
        this.emptyDetected = Math.max(0, emptyDetected);
        this.deletedCount = Math.max(0, deletedCount);
        this.deletedChapterIds = deletedChapterIds == null ? List.of() : Collections.unmodifiableList(deletedChapterIds);
        this.deletionFailedIds = deletionFailedIds == null ? List.of() : Collections.unmodifiableList(deletionFailedIds);
        this.pageCheckFailedIds = pageCheckFailedIds == null ? List.of() : Collections.unmodifiableList(pageCheckFailedIds);
    }

    public int getTotalChecked() {
        return totalChecked;
    }

    public int getEmptyDetected() {
        return emptyDetected;
    }

    public int getDeletedCount() {
        return deletedCount;
    }

    public List<Long> getDeletedChapterIds() {
        return deletedChapterIds;
    }

    public List<Long> getDeletionFailedIds() {
        return deletionFailedIds;
    }

    public List<Long> getPageCheckFailedIds() {
        return pageCheckFailedIds;
    }
}
