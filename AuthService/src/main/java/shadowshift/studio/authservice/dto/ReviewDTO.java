package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewDTO {
    
    private Long id;
    private Long userId;
    private String username;
    private String userDisplayName;
    private String userAvatar;
    private Long mangaId;
    private String mangaTitle;
    private Integer rating;
    private String comment;
    private Integer likesCount;
    private Integer dislikesCount;
    private Integer trustFactor;
    private String trustFactorColor;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isEdited;
    private Boolean canEdit;
    private Boolean canDelete;
    private Boolean userLiked; // null if not voted, true if liked, false if disliked
}
