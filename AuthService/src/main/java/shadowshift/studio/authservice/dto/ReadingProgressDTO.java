package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO для прогресса чтения.
 * Содержит информацию о прогрессе пользователя по главам манги,
 * включая дополнительные данные для отображения.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingProgressDTO {
    
    /** Идентификатор прогресса. */
    private Long id;
    
    /** Идентификатор пользователя. */
    private Long userId;
    
    /** Идентификатор манги. */
    private Long mangaId;
    
    /** Идентификатор главы. */
    private Long chapterId;
    
    /** Номер главы. */
    private Double chapterNumber;
    
    /** Номер страницы. */
    private Integer pageNumber;
    
    /** Флаг завершения. */
    private Boolean isCompleted;
    
    /** Дата создания. */
    private LocalDateTime createdAt;
    
    /** Дата обновления. */
    private LocalDateTime updatedAt;
    
    /** Название манги. */
    private String mangaTitle;
    
    /** Название главы. */
    private String chapterTitle;
}
