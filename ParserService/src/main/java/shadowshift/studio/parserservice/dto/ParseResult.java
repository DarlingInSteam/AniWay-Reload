package shadowshift.studio.parserservice.dto;

import lombok.Data;

/**
 * Результат парсинга манги
 */
@Data
public class ParseResult {
    private Boolean success;
    private String slug;
    private String title;
    private Integer chaptersCount;
    private String outputPath;
    private String error;
    private MangaMetadata metadata;
    private java.util.List<ChapterInfo> chapters;
}
