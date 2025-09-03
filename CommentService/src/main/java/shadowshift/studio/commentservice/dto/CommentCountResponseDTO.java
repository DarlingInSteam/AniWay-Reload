package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для ответа с количеством комментариев
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentCountResponseDTO {
    
    /**
     * Количество комментариев
     */
    private Long count;
}
