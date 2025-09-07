package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.authservice.entity.BookmarkStatus;

import java.time.LocalDateTime;

/**
 * DTO для закладок пользователя.
 * Содержит информацию о закладке, включая статус, избранное,
 * информацию о манге и прогресс чтения.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookmarkDTO {
    
    /** Идентификатор закладки. */
    private Long id;
    
    /** Идентификатор пользователя. */
    private Long userId;
    
    /** Идентификатор манги. */
    private Long mangaId;
    
    /** Статус закладки. */
    private BookmarkStatus status;
    
    /** Флаг избранного. */
    private Boolean isFavorite;
    
    /** Дата создания. */
    private LocalDateTime createdAt;
    
    /** Дата обновления. */
    private LocalDateTime updatedAt;
    
    // Manga info for display
    /** Название манги. */
    private String mangaTitle;
    
    /** URL обложки манги. */
    private String mangaCoverUrl;
    
    // Reading progress info
    /** Текущая глава. */
    private Integer currentChapter;
    
    /** Общее количество глав. */
    private Integer totalChapters;
    
    /** Текущая страница. */
    private Integer currentPage;
    
    /** Флаг завершения. */
    private Boolean isCompleted;
}
