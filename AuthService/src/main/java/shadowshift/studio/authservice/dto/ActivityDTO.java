package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO для отображения активности пользователя
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityDTO {
    
    private Long id;
    private Long userId;
    private String activityType; // "CHAPTER_COMPLETED", "REVIEW_CREATED", "COMMENT_CREATED"
    private String message; // "Прочитана глава 15.5 манги 'Attack on Titan'"
    private LocalDateTime timestamp;
    
    // Дополнительная информация для навигации
    private Long mangaId;
    private String mangaTitle;
    private Long chapterId;
    private Double chapterNumber;
    private String chapterTitle;
    private Long reviewId;
    private Long commentId;
    
    // Метаданные
    private String actionUrl; // URL для перехода к контенту
}
