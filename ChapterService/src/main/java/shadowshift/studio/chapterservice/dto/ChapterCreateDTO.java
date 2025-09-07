package shadowshift.studio.chapterservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

/**
 * DTO для создания новой главы манги.
 * Содержит все необходимые поля для создания главы с валидацией данных.
 *
 * @author ShadowShiftStudio
 */
public class ChapterCreateDTO {

    /** Идентификатор манги, к которой относится глава */
    @NotNull(message = "Manga ID is required")
    private Long mangaId;

    /** Номер главы в системе */
    @NotNull(message = "Chapter number is required")
    @Min(value = 1, message = "Chapter number must be positive")
    private Double chapterNumber;

    /** Номер тома (опционально) */
    private Integer volumeNumber;

    /** Оригинальный номер главы в источнике */
    private Double originalChapterNumber;

    /** Название главы */
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /** Дата публикации главы */
    private LocalDateTime publishedDate;

    /**
     * Конструктор по умолчанию.
     */
    public ChapterCreateDTO() {}

    /**
     * Конструктор с основными параметрами.
     *
     * @param mangaId идентификатор манги
     * @param chapterNumber номер главы
     * @param title название главы
     */
    public ChapterCreateDTO(Long mangaId, Double chapterNumber, String title) {
        this.mangaId = mangaId;
        this.chapterNumber = chapterNumber;
        this.title = title;
    }

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
}
