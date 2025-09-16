package shadowshift.studio.mangaservice.dto;

import java.util.List;

/**
 * DTO для пагинированного ответа с данными.
 * Содержит список элементов, информацию о пагинации и метаданные.
 *
 * @param <T> тип элементов в списке
 * @author ShadowShiftStudio
 */
public class PageResponseDTO<T> {

    /**
     * Список элементов на текущей странице.
     */
    private List<T> content;

    /**
     * Номер текущей страницы (начиная с 0).
     */
    private int page;

    /**
     * Размер страницы (количество элементов на странице).
     */
    private int size;

    /**
     * Общее количество элементов.
     */
    private long totalElements;

    /**
     * Общее количество страниц.
     */
    private int totalPages;

    /**
     * Флаг, является ли текущая страница первой.
     */
    private boolean first;

    /**
     * Флаг, является ли текущая страница последней.
     */
    private boolean last;

    /**
     * Количество элементов на текущей странице.
     */
    private int numberOfElements;

    /**
     * Конструктор по умолчанию.
     */
    public PageResponseDTO() {}

    /**
     * Конструктор с параметрами.
     *
     * @param content список элементов
     * @param page номер страницы
     * @param size размер страницы
     * @param totalElements общее количество элементов
     */
    public PageResponseDTO(List<T> content, int page, int size, long totalElements) {
        this.content = content;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = (int) Math.ceil((double) totalElements / size);
        this.first = page == 0;
        this.last = page >= totalPages - 1;
        this.numberOfElements = content.size();
    }

    // Геттеры и сеттеры

    public List<T> getContent() {
        return content;
    }

    public void setContent(List<T> content) {
        this.content = content;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public boolean isFirst() {
        return first;
    }

    public void setFirst(boolean first) {
        this.first = first;
    }

    public boolean isLast() {
        return last;
    }

    public void setLast(boolean last) {
        this.last = last;
    }

    public int getNumberOfElements() {
        return numberOfElements;
    }

    public void setNumberOfElements(int numberOfElements) {
        this.numberOfElements = numberOfElements;
    }
}