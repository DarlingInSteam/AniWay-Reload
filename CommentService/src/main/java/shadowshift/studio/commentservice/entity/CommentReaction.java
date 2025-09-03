package shadowshift.studio.commentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.ReactionType;

import java.time.LocalDateTime;

/**
 * Сущность реакции на комментарий (лайк/дизлайк)
 */
@Entity
@Table(name = "comment_reactions", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "user_id"}),
       indexes = {
           @Index(name = "idx_comment_reactions_comment_id", columnList = "comment_id"),
           @Index(name = "idx_comment_reactions_user_id", columnList = "user_id")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentReaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private Comment comment;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false)
    private ReactionType reactionType;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    /**
     * Методы для совместимости с сервисом
     */
    public static class CommentReactionBuilder {
        public CommentReactionBuilder commentId(Long commentId) {
            // В данном контексте commentId используется для связи с Comment
            // Настройка происходит в сервисе через setComment()
            return this;
        }
    }
}
