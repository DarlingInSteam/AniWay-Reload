package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.ReactionType;

import jakarta.validation.constraints.NotNull;

/**
 * DTO для реакции на комментарий
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentReactionDTO {
    
    private Long commentId;
    
    @NotNull(message = "Тип реакции обязателен")
    private ReactionType reactionType;
    
    private long likesCount;
    
    private long dislikesCount;
    
    /**
     * Методы для совместимости с сервисом
     */
    public long getLikesCount() {
        return this.likesCount;
    }
    
    public long getDislikesCount() {
        return this.dislikesCount;
    }
    
    public static class CommentReactionDTOBuilder {
        public CommentReactionDTOBuilder commentId(Long commentId) {
            this.commentId = commentId;
            return this;
        }
    }
}
