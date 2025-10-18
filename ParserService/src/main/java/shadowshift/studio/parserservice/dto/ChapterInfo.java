package shadowshift.studio.parserservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Информация о главе
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChapterInfo {
    @JsonProperty("id")
    private String chapterId;
    private Double number;
    private Integer volume;
    @JsonProperty("name")
    private String title;
    @JsonProperty("is_paid")
    private Boolean isPaid;
    @JsonProperty("pages_count")
    private Integer pagesCount;
    private List<SlideInfo> slides; // Список изображений главы
    @JsonProperty("branch_id")
    private Integer branchId;
    private String slug;
    private List<String> workers;
    private Boolean moderated;
    @JsonProperty("free_publication_date")
    private String freePublicationDate;
    @JsonProperty("empty_reason")
    private String emptyReason;
    @JsonProperty("folder_name")
    private String folderName; // Имя папки главы на диске (например ch_1.0)
}
