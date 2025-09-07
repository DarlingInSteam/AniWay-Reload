package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.ReactionType;

import jakarta.validation.constraints.NotNull;

/**
 * DTO для работы с реакциями на комментарий.
 * Содержит информацию о типе реакции и статистике лайков/дизлайков для комментария.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentReactionDTO {

    /** Идентификатор комментария */
    private Long commentId;

    /** Тип реакции пользователя */
    @NotNull(message = "Тип реакции обязателен")
    private ReactionType reactionType;

    /** Количество лайков на комментарий */
    private long likesCount;

    /** Количество дизлайков на комментарий */
    private long dislikesCount;

    /**
     * Получить количество лайков.
     * Метод для совместимости с внешними сервисами.
     *
     * @return количество лайков
     */
    public long getLikesCount() {
        return this.likesCount;
    }

    /**
     * Получить количество дизлайков.
     * Метод для совместимости с внешними сервисами.
     *
     * @return количество дизлайков
     */
    public long getDislikesCount() {
        return this.dislikesCount;
    }

    /**
     * Статический класс билдера для создания экземпляров CommentReactionDTO.
     * Предоставляет fluent API для удобного создания объектов.
     */
    public static class CommentReactionDTOBuilder {
        /**
         * Установить идентификатор комментария.
         *
         * @param commentId идентификатор комментария
         * @return билдер для цепочки вызовов
         */
        public CommentReactionDTOBuilder commentId(Long commentId) {
            this.commentId = commentId;
            return this;
        }
    }
}
