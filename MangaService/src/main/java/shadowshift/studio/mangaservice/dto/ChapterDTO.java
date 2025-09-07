package shadowshift.studio.mangaservice.dto;

import java.time.LocalDateTime;

/**
 * DTO для представления главы манги в системе MangaService.
 * Содержит информацию о главе, такую как номер, заголовок, количество страниц и даты.
 *
 * @author ShadowShiftStudio
 */
public class ChapterDTO {

    /**
     * Уникальный идентификатор главы.
     */
    private Long id;

    /**
     * Идентификатор манги, к которой относится глава.
     */
    private Long mangaId;

    /**
     * Номер главы.
     */
    private Integer chapterNumber;

    /**
     * Заголовок главы.
     */
    private String title;

    /**
     * Количество страниц в главе.
     */
    private Integer pageCount;

    /**
     * Дата публикации главы.
     */
    private LocalDateTime publishedDate;

    /**
     * Дата создания записи о главе.
     */
    private LocalDateTime createdAt;

    /**
     * Дата последнего обновления записи о главе.
     */
    private LocalDateTime updatedAt;

    /**
     * Конструктор по умолчанию.
     */
    public ChapterDTO() {}

    /**
     * Возвращает уникальный идентификатор главы.
     *
     * @return уникальный идентификатор
     */
    public Long getId() { return id; }

    /**
     * Устанавливает уникальный идентификатор главы.
     *
     * @param id уникальный идентификатор
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Возвращает идентификатор манги.
     *
     * @return идентификатор манги
     */
    public Long getMangaId() { return mangaId; }

    /**
     * Устанавливает идентификатор манги.
     *
     * @param mangaId идентификатор манги
     */
    public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

    /**
     * Возвращает номер главы.
     *
     * @return номер главы
     */
    public Integer getChapterNumber() { return chapterNumber; }

    /**
     * Устанавливает номер главы.
     *
     * @param chapterNumber номер главы
     */
    public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

    /**
     * Возвращает заголовок главы.
     *
     * @return заголовок главы
     */
    public String getTitle() { return title; }

    /**
     * Устанавливает заголовок главы.
     *
     * @param title заголовок главы
     */
    public void setTitle(String title) { this.title = title; }

    /**
     * Возвращает количество страниц в главе.
     *
     * @return количество страниц
     */
    public Integer getPageCount() { return pageCount; }

    /**
     * Устанавливает количество страниц в главе.
     *
     * @param pageCount количество страниц
     */
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }

    /**
     * Возвращает дату публикации главы.
     *
     * @return дата публикации
     */
    public LocalDateTime getPublishedDate() { return publishedDate; }

    /**
     * Устанавливает дату публикации главы.
     *
     * @param publishedDate дата публикации
     */
    public void setPublishedDate(LocalDateTime publishedDate) { this.publishedDate = publishedDate; }

    /**
     * Возвращает дату создания записи.
     *
     * @return дата создания
     */
    public LocalDateTime getCreatedAt() { return createdAt; }

    /**
     * Устанавливает дату создания записи.
     *
     * @param createdAt дата создания
     */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    /**
     * Возвращает дату последнего обновления записи.
     *
     * @return дата обновления
     */
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    /**
     * Устанавливает дату последнего обновления записи.
     *
     * @param updatedAt дата обновления
     */
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
