package shadowshift.studio.forumservice.dto.tops;

import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;

/**
 * Lightweight DTO for forum post leaderboards.
 */
@Value
@Builder
public class ForumPostTopDTO {
    Long id;
    Long threadId;
    String contentExcerpt;
    Long authorId;
    String authorName;
    String authorAvatar;
    Integer likesCount;
    Integer dislikesCount;
    Integer likeCount;      // alias
    Integer dislikeCount;   // alias
    Integer trustFactor;    // derived = likes - dislikes
    LocalDateTime createdAt;
}
