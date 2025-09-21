package shadowshift.studio.forumservice.dto.response;

import lombok.Data;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ForumPostResponse {
    private Long id;
    private Long threadId;
    private String content;
    private Long authorId;
    private String authorName; // Получается из AuthService
    private String authorAvatar; // Получается из AuthService
    
    // Иерархия
    private Long parentPostId;
    private List<ForumPostResponse> replies; // Ответы на пост
    
    // Модерация
    private Boolean isDeleted;
    private Boolean isEdited;
    
    // Реакции
    private Integer likesCount;
    private Integer dislikesCount;
    
    // Временные метки
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Пользователь-специфичная информация
    private String userReaction; // LIKE/DISLIKE/null
    private Boolean canEdit; // Может ли текущий пользователь редактировать
    private Boolean canDelete; // Может ли текущий пользователь удалить
}