package shadowshift.studio.forumservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "forum_threads")
@EqualsAndHashCode(of = "id")
public class ForumThread {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "category_id", nullable = false)
    private Long categoryId;
    
    @Column(name = "author_id", nullable = false)
    private Long authorId;
    
    // Статистика
    @Column(name = "views_count")
    @Builder.Default
    private Integer viewsCount = 0;
    
    @Column(name = "replies_count")
    @Builder.Default
    private Integer repliesCount = 0;
    
    @Column(name = "likes_count")
    @Builder.Default
    private Integer likesCount = 0;
    
    // Модерация
    @Column(name = "is_pinned")
    @Builder.Default
    private Boolean isPinned = false;
    
    @Column(name = "is_locked")
    @Builder.Default
    private Boolean isLocked = false;
    
    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;
    
    @Column(name = "is_edited")
    @Builder.Default
    private Boolean isEdited = false;
    
    // Связанная манга (опционально)
    @Column(name = "manga_id")
    private Long mangaId;
    
    // Временные метки
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @Column(name = "last_activity_at")
    @Builder.Default
    private LocalDateTime lastActivityAt = LocalDateTime.now();
    
    @Column(name = "last_reply_at")
    private LocalDateTime lastReplyAt;
    
    @Column(name = "last_reply_user_id")
    private Long lastReplyUserId;
    
    // Связи
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", insertable = false, updatable = false)
    private ForumCategory category;
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}