package shadowshift.studio.forumservice.dto.response;

import lombok.Builder;
import lombok.Value;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class ForumPostResponse {
    Long id;
    Long threadId;
    String content;
    Long authorId;
    String authorName; // Заглушка (AuthService)
    String authorAvatar; // Заглушка (AuthService)
    Long parentPostId;
    List<ForumPostResponse> replies; // Для будущей вложенности
    Boolean isDeleted;
    Boolean isEdited;
    Integer likesCount;
    Integer dislikesCount;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String userReaction; // LIKE / DISLIKE / null
    Boolean canEdit;
    Boolean canDelete;
}