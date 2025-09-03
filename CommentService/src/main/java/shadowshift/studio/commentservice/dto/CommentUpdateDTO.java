package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO для обновления комментария
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentUpdateDTO {
    
    @NotBlank(message = "Содержимое комментария не может быть пустым")
    @Size(min = 1, max = 5000, message = "Комментарий должен содержать от 1 до 5000 символов")
    private String content;
}
