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
 * DTO для создания нового комментария
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentCreateDTO {
    
    @NotBlank(message = "Содержимое комментария не может быть пустым")
    @Size(min = 1, max = 5000, message = "Комментарий должен содержать от 1 до 5000 символов")
    private String content;
    
    @NotNull(message = "Тип комментария обязателен")
    private CommentType commentType;
    
    @NotNull(message = "ID целевого объекта обязателен")
    private Long targetId;
    
    /**
     * ID родительского комментария для ответов (опционально)
     */
    private Long parentCommentId;
    
    /**
     * Метод для совместимости с сервисом
     */
    public CommentType getType() {
        return this.commentType;
    }
}
