package shadowshift.studio.commentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.CommentType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Сущность комментария с поддержкой древовидной структуры
 */
@Entity
@Table(name = "comments", indexes = {
    @Index(name = "idx_comments_type_target", columnList = "commentType,targetId"),
    @Index(name = "idx_comments_user_id", columnList = "userId"),
    @Index(name = "idx_comments_parent_id", columnList = "parentComment"),
    @Index(name = "idx_comments_created_at", columnList = "createdAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "comment_type", nullable = false)
    private CommentType commentType;
    
    @Column(name = "target_id", nullable = false)
    private Long targetId;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    // Самоссылающаяся связь для ответов на комментарии
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private Comment parentComment;
    
    @OneToMany(mappedBy = "parentComment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Comment> replies = new ArrayList<>();
    
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CommentReaction> reactions = new ArrayList<>();
    
    @Column(name = "likes_count")
    @Builder.Default
    private Integer likesCount = 0;
    
    @Column(name = "dislikes_count")
    @Builder.Default
    private Integer dislikesCount = 0;
    
    @Column(name = "is_edited")
    @Builder.Default
    private Boolean isEdited = false;
    
    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    /**
     * Проверяет, можно ли редактировать комментарий (в течение 7 дней)
     */
    public boolean canBeEdited() {
        return !isDeleted && createdAt.isAfter(LocalDateTime.now().minusDays(7));
    }
    
    /**
     * Проверяет, является ли комментарий корневым (не ответом)
     */
    public boolean isRootComment() {
        return parentComment == null;
    }
    
    /**
     * Получает уровень вложенности комментария
     */
    public int getDepthLevel() {
        int depth = 0;
        Comment current = this.parentComment;
        while (current != null) {
            depth++;
            current = current.getParentComment();
        }
        return depth;
    }
    
    /**
     * Методы для совместимости с сервисом
     */
    public CommentType getType() {
        return this.commentType;
    }
    
    public Long getParentCommentId() {
        return this.parentComment != null ? this.parentComment.getId() : null;
    }
    
    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
        this.isDeleted = (deletedAt != null);
    }
    
    /**
     * Класс-строитель для совместимости
     */
    public static class CommentBuilder {
        public CommentBuilder type(CommentType type) {
            this.commentType = type;
            return this;
        }
    }
}
