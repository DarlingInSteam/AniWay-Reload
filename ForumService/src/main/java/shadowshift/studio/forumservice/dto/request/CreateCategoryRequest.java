package shadowshift.studio.forumservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCategoryRequest {
    
    @NotBlank(message = "Название категории обязательно")
    @Size(max = 100, message = "Название категории не должно превышать 100 символов")
    private String name;
    
    @Size(max = 500, message = "Описание не должно превышать 500 символов")
    private String description;
    
    @Size(max = 50, message = "Название иконки не должно превышать 50 символов")
    private String icon;
    
    @Size(min = 7, max = 7, message = "Цвет должен быть в формате #RRGGBB")
    private String color;
    
    private Integer displayOrder = 0;
}