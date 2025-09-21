package shadowshift.studio.forumservice.dto.response;

import lombok.Data;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@Builder
public class ForumThreadResponse {
    private Long id;
    private String title;
    private String content;
    private Long categoryId;
    private String categoryName;
    private Long authorId;
    private String authorName; // Получается из AuthService
    private String authorAvatar; // Получается из AuthService
    
    // Статистика
    private Integer viewsCount;
    private Integer repliesCount;
    private Integer likesCount;
    
    // Модерация
    private Boolean isPinned;
    private Boolean isLocked;
    private Boolean isDeleted;
    private Boolean isEdited;
    
    // Связанная манга
    private Long mangaId;
    private String mangaTitle; // Получается из MangaService
    
    // Временные метки
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastActivityAt;
    private LocalDateTime lastReplyAt;
    private Long lastReplyUserId;
    private String lastReplyUserName; // Получается из AuthService
    
    // Пользователь-специфичная информация
    private Boolean isSubscribed; // Подписан ли текущий пользователь
    private String userReaction; // LIKE/DISLIKE/null
}