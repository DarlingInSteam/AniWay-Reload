package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookmarks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bookmark {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "manga_id", nullable = false)
    private Long mangaId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookmarkStatus status;
    
    @Column(name = "is_favorite")
    @Builder.Default
    private Boolean isFavorite = false;
    
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
