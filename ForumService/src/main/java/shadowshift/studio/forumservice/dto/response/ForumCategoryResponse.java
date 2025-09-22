package shadowshift.studio.forumservice.dto.response;

import lombok.Data;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@Builder
public class ForumCategoryResponse {
    private Long id;
    private String name;
    private String description;
    private String icon;
    private String color;
    private Integer displayOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Статистика (опционально)
    private Long threadsCount;
    private Long postsCount;
}