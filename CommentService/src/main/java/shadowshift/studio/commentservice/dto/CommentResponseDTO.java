package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.CommentType;
import shadowshift.studio.commentservice.enums.ReactionType;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO для ответа с информацией о комментарии
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponseDTO {
    
    private Long id;
    private String content;
    private CommentType commentType;
    private Long targetId;
    private Long userId;
    private String username; // Получается из AuthService
    private String userAvatarUrl; // Получается из AuthService
    
    // Информация о родительском комментарии
    private Long parentCommentId;
    private String parentCommentAuthor;
    
    // Статистика реакций
    private Long likesCount;
    private Long dislikesCount;
    private ReactionType userReaction; // Реакция текущего пользователя
    
    // Метаданные
    private Boolean isEdited;
    private Boolean isDeleted;
    private Boolean canEdit; // Может ли текущий пользователь редактировать
    private Boolean canDelete; // Может ли текущий пользователь удалить
    private Integer depthLevel; // Уровень вложенности
    
    // Временные метки
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Ответы на комментарий (для древовидной структуры)
    private List<CommentResponseDTO> replies;
    
    // Количество ответов (для пагинации)
    private Integer repliesCount;
    
    /**
     * Методы для совместимости с сервисом
     */
    public static class CommentResponseDTOBuilder {
        public CommentResponseDTOBuilder userAvatar(String userAvatar) {
            this.userAvatarUrl = userAvatar;
            return this;
        }
        
        public CommentResponseDTOBuilder type(CommentType type) {
            this.commentType = type;
            return this;
        }
    }
}
