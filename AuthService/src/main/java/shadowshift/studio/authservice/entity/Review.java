package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Сущность отзыва.
 * Представляет отзыв пользователя на мангу с рейтингом и комментарием.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {
    
    /** Идентификатор отзыва. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /** Идентификатор пользователя. */
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    /** Идентификатор манги. */
    @Column(name = "manga_id", nullable = false)
    private Long mangaId;
    
    /** Рейтинг (1-10). */
    @Column(nullable = false)
    private Integer rating;
    
    /** Комментарий. */
    @Column(columnDefinition = "TEXT")
    private String comment;
    
    /** Количество лайков. */
    @Column(name = "likes_count", nullable = false)
    @Builder.Default
    private Integer likesCount = 0;
    
    /** Количество дизлайков. */
    @Column(name = "dislikes_count", nullable = false)
    @Builder.Default
    private Integer dislikesCount = 0;
    
    /** Дата создания. */
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    /** Дата обновления. */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    /** Флаг редактирования. */
    @Column(name = "is_edited", nullable = false)
    @Builder.Default
    private Boolean isEdited = false;
    
    /**
     * Возвращает фактор доверия (лайки минус дизлайки).
     *
     * @return фактор доверия
     */
    public Integer getTrustFactor() {
        return likesCount - dislikesCount;
    }
    
    /**
     * Возвращает цвет фактора доверия.
     *
     * @return цвет ("green", "gray" или "red")
     */
    public String getTrustFactorColor() {
        int factor = getTrustFactor();
        if (factor > 0) return "green";
        if (factor == 0) return "gray";
        return "red";
    }
    
    /**
     * Проверяет, можно ли редактировать отзыв (лимит 7 дней).
     *
     * @return true, если можно редактировать
     */
    public boolean canBeEdited() {
        return LocalDateTime.now().isBefore(createdAt.plusDays(7));
    }
}
