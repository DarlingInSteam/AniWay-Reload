package shadowshift.studio.mangaservice.dto;

/**
 * DTO для параметров сортировки.
 *
 * @author ShadowShiftStudio
 */
public class SortParamsDTO {

    /**
     * Поле для сортировки.
     */
    private String sortBy;

    /**
     * Направление сортировки.
     */
    private String sortOrder;

    /**
     * Конструктор по умолчанию.
     */
    public SortParamsDTO() {}

    /**
     * Конструктор с параметрами.
     *
     * @param sortBy поле для сортировки
     * @param sortOrder направление сортировки
     */
    public SortParamsDTO(String sortBy, String sortOrder) {
        this.sortBy = sortBy;
        this.sortOrder = sortOrder;
    }

    // Геттеры и сеттеры

    public String getSortBy() {
        return sortBy;
    }

    public void setSortBy(String sortBy) {
        this.sortBy = sortBy;
    }

    public String getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(String sortOrder) {
        this.sortOrder = sortOrder;
    }
}