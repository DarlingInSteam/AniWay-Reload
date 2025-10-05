package shadowshift.studio.messageservice.dto;

import jakarta.validation.constraints.Size;

public record UpdateCategoryRequest(
        @Size(max = 80) String title,
        @Size(max = 512) String description,
        Boolean isArchived,
        Boolean isDefault
) {
}
