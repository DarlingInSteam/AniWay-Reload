package shadowshift.studio.parserservice.dto;

import lombok.Data;
import java.util.List;

/**
 * Метаданные манги
 */
@Data
public class MangaMetadata {
    private String slug;
    private String title;
    private String englishTitle;
    private String summary;
    private String status;
    private String type;
    private Integer releaseYear;
    private String coverUrl;
    private List<String> genres;
    private List<String> tags;
    private List<String> authors;
}
