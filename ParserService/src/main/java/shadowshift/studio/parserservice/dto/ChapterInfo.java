package shadowshift.studio.parserservice.dto;

import lombok.Data;
import java.util.List;

/**
 * Информация о главе
 */
@Data
public class ChapterInfo {
    private String chapterId;
    private Double number;
    private Integer volume;
    private String title;
    private Boolean isPaid;
    private Integer pagesCount;
    private List<SlideInfo> slides; // Список изображений главы
}
