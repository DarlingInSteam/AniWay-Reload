package shadowshift.studio.mangaservice.dto;

import java.util.Collections;
import java.util.List;

/**
 * Запрос для пакетной загрузки манги по идентификаторам.
 */
public class MangaBatchRequest {

    private List<Long> mangaIds;

    public MangaBatchRequest() {
    }

    public MangaBatchRequest(List<Long> mangaIds) {
        this.mangaIds = mangaIds;
    }

    public List<Long> getMangaIds() {
        return mangaIds != null ? mangaIds : Collections.emptyList();
    }

    public void setMangaIds(List<Long> mangaIds) {
        this.mangaIds = mangaIds;
    }
}
