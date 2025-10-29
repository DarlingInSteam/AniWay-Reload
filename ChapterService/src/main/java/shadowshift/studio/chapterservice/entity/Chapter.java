package shadowshift.studio.chapterservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * Сущность, представляющая главу манги в системе.
 * Содержит всю необходимую информацию о главе, включая метаданные и временные отметки.
 * Таблица: chapter с уникальным ограничением на комбинацию manga_id и chapter_number.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "chapter", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"manga_id", "chapter_number"}),
    @UniqueConstraint(columnNames = {"manga_id", "melon_chapter_id"})
})
public class Chapter {

    /** Уникальный идентификатор главы */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Идентификатор манги, к которой относится глава */
    @NotNull(message = "Manga ID is required")
    @Column(name = "manga_id", nullable = false)
    private Long mangaId;

    /** Номер главы в системе */
    @NotNull(message = "Chapter number is required")
    @Min(value = 1, message = "Chapter number must be positive")
    @Column(name = "chapter_number", nullable = false)
    private Double chapterNumber;

    /** Номер тома (опционально) */
    @Column(name = "volume_number")
    private Integer volumeNumber;

    /** Оригинальный номер главы в источнике */
    @Column(name = "original_chapter_number")
    private Double originalChapterNumber;

    /** Идентификатор главы во внешней системе MangaLib */
    @Size(max = 191, message = "External chapter id must not exceed 191 characters")
    @Column(name = "melon_chapter_id")
    private String melonChapterId;

    /** Название главы */
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /** Количество страниц в главе */
    @Column(name = "page_count")
    private Integer pageCount = 0;

    /** Количество лайков к главе */
    @Column(name = "like_count")
    private Integer likeCount = 0;

    /** Дата публикации главы */
    @Column(name = "published_date")
    private LocalDateTime publishedDate;

    /** Дата создания записи */
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** Дата последнего обновления записи */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Метод, вызываемый перед сохранением сущности в базу данных.
     * Устанавливает временные отметки создания и обновления.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (publishedDate == null) {
            publishedDate = LocalDateTime.now();
        }
    }

    /**
     * Метод, вызываемый перед обновлением сущности в базе данных.
     * Обновляет временную отметку последнего изменения.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Конструктор по умолчанию.
     */
    public Chapter() {}

    /**
     * Конструктор с основными параметрами.
     *
     * @param mangaId идентификатор манги
     * @param chapterNumber номер главы
     * @param title название главы
     */
    public Chapter(Long mangaId, Double chapterNumber, String title) {
        this.mangaId = mangaId;
        this.chapterNumber = chapterNumber;
        this.title = title;
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
