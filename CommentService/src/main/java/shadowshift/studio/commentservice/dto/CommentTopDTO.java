package shadowshift.studio.commentservice.dto;

import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;
import shadowshift.studio.commentservice.enums.CommentType;

@Value
@Builder
public class CommentTopDTO {
    Long id;
    String content; // full
    String contentExcerpt;
    Long userId;
    // Author enrichment (name/avatar) could be added later by calling AuthService.
    Integer likesCount;
    Integer dislikesCount;
    Integer likeCount;      // alias
    Integer dislikeCount;   // alias
    Integer trustFactor;    // likes - dislikes
    CommentType commentType;
    Long targetId;
    LocalDateTime createdAt;
}
