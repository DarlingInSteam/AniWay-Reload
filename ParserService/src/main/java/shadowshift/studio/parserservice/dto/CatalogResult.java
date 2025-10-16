package shadowshift.studio.parserservice.dto;

import lombok.Data;
import java.util.List;

/**
 * Результат каталога
 */
@Data
public class CatalogResult {
    private List<CatalogItem> items;
    private Integer page;
    private Integer total;
}
