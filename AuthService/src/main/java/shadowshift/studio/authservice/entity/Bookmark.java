package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Сущность закладки пользователя.
 * Представляет закладку на мангу с статусом и флагом избранного.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Entity
@Table(name = "bookmarks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bookmark {
    
    /** Идентификатор закладки. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /** Идентификатор пользователя. */
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    /** Идентификатор манги. */
    @Column(name = "manga_id", nullable = false)
    private Long mangaId;
    
    /** Статус закладки. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookmarkStatus status;
    
    /** Флаг избранного. */
    @Column(name = "is_favorite")
    @Builder.Default
    private Boolean isFavorite = false;
    
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
