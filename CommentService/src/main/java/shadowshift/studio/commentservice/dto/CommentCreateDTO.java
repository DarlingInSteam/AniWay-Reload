package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.CommentType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * DTO для создания нового комментария.
 * Содержит все необходимые поля для создания комментария с валидацией данных.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentCreateDTO {

    /** Содержимое комментария */
    @NotBlank(message = "Содержимое комментария не может быть пустым")
    @Size(min = 1, max = 5000, message = "Комментарий должен содержать от 1 до 5000 символов")
    private String content;

    /** Тип комментария (определяет к какому объекту относится) */
    @NotNull(message = "Тип комментария обязателен")
    private CommentType commentType;

    /** Идентификатор целевого объекта (манга, глава и т.д.) */
    @NotNull(message = "ID целевого объекта обязателен")
    private Long targetId;

    /** Идентификатор родительского комментария для ответов (опционально) */
    private Long parentCommentId;

    /**
     * Получить тип комментария.
     * Метод для совместимости с внешними сервисами.
     *
     * @return тип комментария
     */
    public CommentType getType() {
        return this.commentType;
    }
}
