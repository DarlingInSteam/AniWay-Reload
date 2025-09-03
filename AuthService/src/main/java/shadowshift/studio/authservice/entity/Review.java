package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "manga_id", nullable = false)
    private Long mangaId;
    
    @Column(nullable = false)
    private Integer rating; // 1-10
    
    @Column(columnDefinition = "TEXT")
    private String comment;
    
    @Column(name = "likes_count", nullable = false)
    @Builder.Default
    private Integer likesCount = 0;
    
    @Column(name = "dislikes_count", nullable = false)
    @Builder.Default
    private Integer dislikesCount = 0;
    
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "is_edited", nullable = false)
    @Builder.Default
    private Boolean isEdited = false;
    
    // Calculated field for trust factor
    public Integer getTrustFactor() {
        return likesCount - dislikesCount;
    }
    
    public String getTrustFactorColor() {
        int factor = getTrustFactor();
        if (factor > 0) return "green";
        if (factor == 0) return "gray";
        return "red";
    }
    
    // Check if review can still be edited (7 days limit)
    public boolean canBeEdited() {
        return LocalDateTime.now().isBefore(createdAt.plusDays(7));
    }
}
