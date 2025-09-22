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
@Table(name = "forum_posts")
@EqualsAndHashCode(of = "id")
public class ForumPost {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "thread_id", nullable = false)
    private Long threadId;
    
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;
    
    @Column(name = "author_id", nullable = false)
    private Long authorId;
    
    // Иерархия (для ответов на посты)
    @Column(name = "parent_post_id")
    private Long parentPostId;
    
    // Модерация
    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;
    
    @Column(name = "is_edited")
    @Builder.Default
    private Boolean isEdited = false;
    
    // Реакции
    @Column(name = "likes_count")
    @Builder.Default
    private Integer likesCount = 0;
    
    @Column(name = "dislikes_count")
    @Builder.Default
    private Integer dislikesCount = 0;
    
    // Временные метки
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    // Связи
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thread_id", insertable = false, updatable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private ForumThread thread;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_post_id", insertable = false, updatable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private ForumPost parentPost;
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}