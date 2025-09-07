package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для ответа с количеством комментариев.
 * Используется для возврата информации о количестве комментариев для определенного объекта.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentCountResponseDTO {

    /**
     * Количество комментариев для указанного объекта.
     */
    private Long count;
}
