package shadowshift.studio.parserservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Данные об обложке тайтла
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MangaCover {
    private String link;
    private String filename;
    private Integer width;
    private Integer height;
}
