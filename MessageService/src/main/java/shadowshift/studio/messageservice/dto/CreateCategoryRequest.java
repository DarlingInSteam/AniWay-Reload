package shadowshift.studio.messageservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
        @NotBlank @Size(max = 80) String title,
        @Size(max = 80) String slug,
        @Size(max = 512) String description,
        Boolean isDefault
) {
}
