package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Сущность прогресса чтения.
 * Представляет прогресс пользователя по чтению глав манги.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Entity
@Table(name = "reading_progress")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingProgress {
    
    /** Идентификатор прогресса. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /** Идентификатор пользователя. */
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    /** Идентификатор манги. */
    @Column(name = "manga_id", nullable = false)
    private Long mangaId;
    
    /** Идентификатор главы. */
    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;
    
    /** Номер главы. */
    @Column(name = "chapter_number", nullable = false)
    private Double chapterNumber;
    
    /** Номер страницы. */
    @Column(name = "page_number")
    @Builder.Default
    private Integer pageNumber = 1;
    
    /** Флаг завершения. */
    @Column(name = "is_completed")
    @Builder.Default
    private Boolean isCompleted = false;
    
    /** Дата создания. */
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    /** Дата обновления. */
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
