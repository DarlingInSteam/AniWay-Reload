package shadowshift.studio.parserservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Информация об изображении страницы манги
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SlideInfo {
    private Integer index;
    private String link;
    private Integer width;
    private Integer height;
}
