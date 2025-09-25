package shadowshift.studio.forumservice.dto.tops;

import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;

/**
 * Lightweight DTO for forum thread leaderboards.
 */
@Value
@Builder
public class ForumThreadTopDTO {
    Long id;
    String title;
    String content; // full content
    String contentExcerpt; // trimmed content
    Long authorId;
    String authorName; // optional, can be null until enriched
    String authorAvatar; // optional
    Integer repliesCount;
    Integer likesCount;
    Integer viewsCount;
    // aliases for frontend consistency if it expects likeCount
    Integer likeCount;
    LocalDateTime createdAt;
}
