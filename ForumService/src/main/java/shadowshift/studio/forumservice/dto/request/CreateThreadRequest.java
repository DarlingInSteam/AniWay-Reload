package shadowshift.studio.forumservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateThreadRequest {
    
    @NotBlank(message = "Заголовок темы обязателен")
    @Size(max = 200, message = "Заголовок не должен превышать 200 символов")
    private String title;
    
    @NotBlank(message = "Содержимое темы обязательно")
    @Size(max = 10000, message = "Содержимое не должно превышать 10000 символов")
    private String content;
    
    @NotNull(message = "ID категории обязателен")
    private Long categoryId;
    
    private Long mangaId; // Опционально - для связи с мангой
}