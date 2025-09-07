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
 * DTO для ответа с полной информацией о комментарии.
 * Содержит все данные комментария, включая информацию о пользователе, реакциях,
 * метаданные и древовидную структуру ответов.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentResponseDTO {

    /** Уникальный идентификатор комментария */
    private Long id;

    /** Содержимое комментария */
    private String content;

    /** Тип комментария (определяет к какому объекту относится) */
    private CommentType commentType;

    /** Идентификатор целевого объекта (манга, глава и т.д.) */
    private Long targetId;

    /** Идентификатор автора комментария */
    private Long userId;

    /** Имя пользователя автора комментария */
    private String username;

    /** URL аватара пользователя автора комментария */
    private String userAvatarUrl;

    /** Идентификатор родительского комментария (для ответов) */
    private Long parentCommentId;

    /** Имя автора родительского комментария */
    private String parentCommentAuthor;

    /** Количество лайков на комментарий */
    private Long likesCount;

    /** Количество дизлайков на комментарий */
    private Long dislikesCount;

    /** Реакция текущего пользователя на комментарий */
    private ReactionType userReaction;

    /** Флаг, указывающий, был ли комментарий отредактирован */
    private Boolean isEdited;

    /** Флаг, указывающий, был ли комментарий удален */
    private Boolean isDeleted;

    /** Флаг, указывающий, может ли текущий пользователь редактировать комментарий */
    private Boolean canEdit;

    /** Флаг, указывающий, может ли текущий пользователь удалить комментарий */
    private Boolean canDelete;

    /** Уровень вложенности комментария в древовидной структуре */
    private Integer depthLevel;

    /** Дата и время создания комментария */
    private LocalDateTime createdAt;

    /** Дата и время последнего обновления комментария */
    private LocalDateTime updatedAt;

    /** Список ответов на комментарий (для древовидной структуры) */
    private List<CommentResponseDTO> replies;

    /** Общее количество ответов на комментарий */
    private Integer repliesCount;

    /**
     * Статический класс билдера для создания экземпляров CommentResponseDTO.
     * Предоставляет fluent API для удобного создания объектов с дополнительными методами.
     */
    public static class CommentResponseDTOBuilder {
        /**
         * Установить URL аватара пользователя.
         * Метод для совместимости с внешними сервисами.
         *
         * @param userAvatar URL аватара пользователя
         * @return билдер для цепочки вызовов
         */
        public CommentResponseDTOBuilder userAvatar(String userAvatar) {
            this.userAvatarUrl = userAvatar;
            return this;
        }

        /**
         * Установить тип комментария.
         * Метод для совместимости с внешними сервисами.
         *
         * @param type тип комментария
         * @return билдер для цепочки вызовов
         */
        public CommentResponseDTOBuilder type(CommentType type) {
            this.commentType = type;
            return this;
        }
    }
}
