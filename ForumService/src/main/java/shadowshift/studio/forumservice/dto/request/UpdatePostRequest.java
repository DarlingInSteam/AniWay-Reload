package shadowshift.studio.forumservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdatePostRequest {
    
    @NotBlank(message = "Содержимое поста обязательно")
    @Size(max = 5000, message = "Содержимое поста не должно превышать 5000 символов")
    private String content;
}