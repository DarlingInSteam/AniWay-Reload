package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reading_progress")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingProgress {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "manga_id", nullable = false)
    private Long mangaId;
    
    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;
    
    @Column(name = "chapter_number", nullable = false)
    private Double chapterNumber;
    
    @Column(name = "page_number")
    @Builder.Default
    private Integer pageNumber = 1;
    
    @Column(name = "is_completed")
    @Builder.Default
    private Boolean isCompleted = false;
    
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
