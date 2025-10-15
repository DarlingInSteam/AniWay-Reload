package shadowshift.studio.chapterservice.dto;

import shadowshift.studio.chapterservice.entity.Chapter;
import java.time.LocalDateTime;

/**
 * DTO для ответа с данными главы манги.
 * Содержит полную информацию о главе, включая метаданные и временные отметки.
 *
 * @author ShadowShiftStudio
 */
public class ChapterResponseDTO {

    /** Уникальный идентификатор главы */
    private Long id;

    /** Идентификатор манги, к которой относится глава */
    private Long mangaId;

    /** Номер главы в системе */
    private Double chapterNumber;

    /** Номер тома (опционально) */
    private Integer volumeNumber;

    /** Оригинальный номер главы в источнике */
    private Double originalChapterNumber;

    /** Идентификатор главы во внешней системе MangaLib */
    private String melonChapterId;

    /** Название главы */
    private String title;

    /** Количество страниц в главе */
    private Integer pageCount;

    /** Количество лайков к главе */
    private Integer likeCount;

    /** Дата публикации главы */
    private LocalDateTime publishedDate;

    /** Дата создания записи */
    private LocalDateTime createdAt;

    /** Дата последнего обновления записи */
    private LocalDateTime updatedAt;

    /**
     * Конструктор по умолчанию.
     */
    public ChapterResponseDTO() {}

    /**
     * Конструктор на основе сущности Chapter.
     * Заполняет DTO данными из переданной сущности.
     *
     * @param chapter сущность главы для преобразования в DTO
     */
    public ChapterResponseDTO(Chapter chapter) {
        this.id = chapter.getId();
        this.mangaId = chapter.getMangaId();
        this.chapterNumber = chapter.getChapterNumber();
        this.volumeNumber = chapter.getVolumeNumber();
        this.originalChapterNumber = chapter.getOriginalChapterNumber();
    this.melonChapterId = chapter.getMelonChapterId();
        this.title = chapter.getTitle();
        this.pageCount = chapter.getPageCount();
        // Ensure likeCount is never null
        this.likeCount = chapter.getLikeCount() != null ? chapter.getLikeCount() : 0;
        this.publishedDate = chapter.getPublishedDate();
        this.createdAt = chapter.getCreatedAt();
        this.updatedAt = chapter.getUpdatedAt();
    }

    /**
     * Получить уникальный идентификатор главы.
     *
     * @return идентификатор главы
     */
    public Long getId() { return id; }

    /**
     * Установить уникальный идентификатор главы.
     *
     * @param id идентификатор главы
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Получить идентификатор манги.
     *
     * @return идентификатор манги
     */
    public Long getMangaId() { return mangaId; }

    /**
     * Установить идентификатор манги.
     *
     * @param mangaId идентификатор манги
     */
    public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

    /**
     * Получить номер главы.
     *
     * @return номер главы
     */
    public Double getChapterNumber() { return chapterNumber; }

    /**
     * Установить номер главы.
     *
     * @param chapterNumber номер главы
     */
    public void setChapterNumber(Double chapterNumber) { this.chapterNumber = chapterNumber; }

    /**
     * Получить номер тома.
     *
     * @return номер тома
     */
    public Integer getVolumeNumber() { return volumeNumber; }

    /**
     * Установить номер тома.
     *
     * @param volumeNumber номер тома
     */
    public void setVolumeNumber(Integer volumeNumber) { this.volumeNumber = volumeNumber; }

    /**
     * Получить оригинальный номер главы.
     *
     * @return оригинальный номер главы
     */
    public Double getOriginalChapterNumber() { return originalChapterNumber; }

    /**
     * Установить оригинальный номер главы.
     *
     * @param originalChapterNumber оригинальный номер главы
     */
    public void setOriginalChapterNumber(Double originalChapterNumber) { this.originalChapterNumber = originalChapterNumber; }

    /**
     * Получить идентификатор главы во внешней системе MangaLib.
     *
     * @return внешний идентификатор главы
     */
    public String getMelonChapterId() { return melonChapterId; }

    /**
     * Установить идентификатор главы во внешней системе MangaLib.
     *
     * @param melonChapterId внешний идентификатор главы
     */
    public void setMelonChapterId(String melonChapterId) { this.melonChapterId = melonChapterId; }

    /**
     * Получить название главы.
     *
     * @return название главы
     */
    public String getTitle() { return title; }

    /**
     * Установить название главы.
     *
     * @param title название главы
     */
    public void setTitle(String title) { this.title = title; }

    /**
     * Получить количество страниц в главе.
     *
     * @return количество страниц
     */
    public Integer getPageCount() { return pageCount; }

    /**
     * Установить количество страниц в главе.
     *
     * @param pageCount количество страниц
     */
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }

    /**
     * Получить дату публикации.
     *
     * @return дата публикации
     */
    public LocalDateTime getPublishedDate() { return publishedDate; }

    /**
     * Установить дату публикации.
     *
     * @param publishedDate дата публикации
     */
    public void setPublishedDate(LocalDateTime publishedDate) { this.publishedDate = publishedDate; }

    /**
     * Получить дату создания записи.
     *
     * @return дата создания
     */
    public LocalDateTime getCreatedAt() { return createdAt; }

    /**
     * Установить дату создания записи.
     *
     * @param createdAt дата создания
     */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    /**
     * Получить дату последнего обновления.
     *
     * @return дата обновления
     */
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    /**
     * Установить дату последнего обновления.
     *
     * @param updatedAt дата обновления
     */
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    /**
     * Получить количество лайков к главе.
     *
     * @return количество лайков
     */
    public Integer getLikeCount() { return likeCount; }

    /**
     * Установить количество лайков к главе.
     *
     * @param likeCount количество лайков
     */
    public void setLikeCount(Integer likeCount) { this.likeCount = likeCount; }
}
