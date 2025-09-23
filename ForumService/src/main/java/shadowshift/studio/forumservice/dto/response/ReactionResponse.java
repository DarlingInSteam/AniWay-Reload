package shadowshift.studio.forumservice.dto.response;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class ReactionResponse {
    private String status; // "added", "updated", "removed"
    private String reactionType; // "LIKE", "DISLIKE"
    private Integer likesCount;
    private Integer dislikesCount;
}