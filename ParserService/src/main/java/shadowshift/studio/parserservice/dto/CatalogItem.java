package shadowshift.studio.parserservice.dto;

import lombok.Data;

/**
 * Элемент каталога
 */
@Data
public class CatalogItem {
    private String slug;        // Чистый slug без ID (например: "sweet-home-kim-carnby-")
    private String slugUrl;     // Полный slug_url с ID (например: "3754--sweet-home-kim-carnby-")
    private String title;
    private Integer chaptersCount;
    private String type;
}
