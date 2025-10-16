package shadowshift.studio.parserservice.dto;

import lombok.Data;

/**
 * Элемент каталога
 */
@Data
public class CatalogItem {
    private String slug;
    private String title;
    private Integer chaptersCount;
    private String type;
}
