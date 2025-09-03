package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_likes", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "review_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewLike {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "review_id", nullable = false)
    private Long reviewId;
    
    @Column(name = "is_like", nullable = false)
    private Boolean isLike; // true for like, false for dislike
    
    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
