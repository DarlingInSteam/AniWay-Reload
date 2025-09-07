package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Сущность лайка отзыва.
 * Представляет лайк или дизлайк пользователя на отзыв.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Entity
@Table(name = "review_likes", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "review_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewLike {
    
    /** Идентификатор лайка. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /** Идентификатор пользователя. */
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    /** Идентификатор отзыва. */
    @Column(name = "review_id", nullable = false)
    private Long reviewId;
    
    /** Флаг лайка: true для лайка, false для дизлайка. */
    @Column(name = "is_like", nullable = false)
    private Boolean isLike;
    
    /** Дата создания. */
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
