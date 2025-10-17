package shadowshift.studio.parserservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Краткая информация о ветви тайтла
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BranchSummary {
    private Integer id;
    private Integer chaptersCount;
}
