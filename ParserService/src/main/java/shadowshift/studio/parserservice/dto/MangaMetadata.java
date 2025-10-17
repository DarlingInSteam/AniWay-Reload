package shadowshift.studio.parserservice.dto;

import lombok.Data;
import java.util.List;

/**
 * Метаданные манги
 */
@Data
public class MangaMetadata {
    private Integer id;
    private String slug;
    private String title;
    private String englishTitle;
    private String localizedName;
    private String summary;
    private String status;
    private String statusCode;
    private String type;
    private String typeCode;
    private Integer releaseYear;
    private String coverUrl;
    private List<MangaCover> covers;
    private List<String> genres;
    private List<String> tags;
    private List<String> authors;
    private List<String> otherNames;
    private List<String> franchises;
    private Boolean licensed;
    private Integer ageLimit;
    private String site;
    private String contentLanguage;
}
