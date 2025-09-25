package shadowshift.studio.chapterservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Entity representing a unique read action of a user for a chapter.
 * Ensures a user gains XP for reading a chapter only once.
 */
@Entity
@Table(name = "chapter_read", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "chapter_id"})
})
public class ChapterRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull
    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public ChapterRead() {}

    public ChapterRead(Long userId, Long chapterId) {
        this.userId = userId;
        this.chapterId = chapterId;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Long getChapterId() { return chapterId; }
    public void setChapterId(Long chapterId) { this.chapterId = chapterId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
