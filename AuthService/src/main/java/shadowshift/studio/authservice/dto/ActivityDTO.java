package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO для отображения активности пользователя.
 * Содержит информацию о действиях пользователя, таких как завершение глав,
 * создание отзывов или комментариев, с метаданными для навигации.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityDTO {

    /** Идентификатор активности. */
    private Long id;

    /** Идентификатор пользователя. */
    private Long userId;

    /** Тип активности (строка, например: "CHAPTER_COMPLETED", "REVIEW_CREATED"). */
    private String activityType;

    /** Сообщение активности, например: "Прочитана глава 15.5 манги 'Attack on Titan'". */
    private String message;

    /** Время активности. */
    private LocalDateTime timestamp;

    // Дополнительная информация для навигации

    /** Идентификатор манги. */
    private Long mangaId;

    /** Название манги. */
    private String mangaTitle;

    /** Идентификатор главы. */
    private Long chapterId;

    /** Номер главы. */
    private Double chapterNumber;

    /** Название главы. */
    private String chapterTitle;

    /** Идентификатор отзыва. */
    private Long reviewId;

    /** Идентификатор комментария. */
    private Long commentId;

    // Метаданные

    /** URL для перехода к контенту. */
    private String actionUrl;
}
