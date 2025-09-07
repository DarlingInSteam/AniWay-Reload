package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO для отзыва пользователя.
 * Содержит информацию об отзыве, включая рейтинг, комментарий,
 * лайки/дизлайки и данные пользователя.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewDTO {
    
    /** Идентификатор отзыва. */
    private Long id;
    
    /** Идентификатор пользователя. */
    private Long userId;
    
    /** Имя пользователя. */
    private String username;
    
    /** Отображаемое имя пользователя. */
    private String userDisplayName;
    
    /** Аватар пользователя. */
    private String userAvatar;
    
    /** Идентификатор манги. */
    private Long mangaId;
    
    /** Название манги. */
    private String mangaTitle;
    
    /** Рейтинг (1-10). */
    private Integer rating;
    
    /** Комментарий. */
    private String comment;
    
    /** Количество лайков. */
    private Integer likesCount;
    
    /** Количество дизлайков. */
    private Integer dislikesCount;
    
    /** Фактор доверия. */
    private Integer trustFactor;
    
    /** Цвет фактора доверия. */
    private String trustFactorColor;
    
    /** Дата создания. */
    private LocalDateTime createdAt;
    
    /** Дата обновления. */
    private LocalDateTime updatedAt;
    
    /** Флаг редактирования. */
    private Boolean isEdited;
    
    /** Флаг возможности редактирования. */
    private Boolean canEdit;
    
    /** Флаг возможности удаления. */
    private Boolean canDelete;
    
    /** Флаг лайка пользователя: null если не голосовал, true если лайкнул, false если дизлайкнул. */
    private Boolean userLiked;
}
