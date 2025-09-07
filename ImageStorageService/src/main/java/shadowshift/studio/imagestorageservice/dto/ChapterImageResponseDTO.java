package shadowshift.studio.imagestorageservice.dto;

import shadowshift.studio.imagestorageservice.entity.ChapterImage;
import java.time.LocalDateTime;

/**
 * DTO для передачи данных об изображении главы манги.
 * Содержит всю необходимую информацию об изображении, включая метаданные,
 * размеры, URL для доступа и временные метки.
 *
 * @author ShadowShiftStudio
 */
public class ChapterImageResponseDTO {

    /** Уникальный идентификатор изображения */
    private Long id;

    /** Идентификатор манги, к которой относится изображение */
    private Long mangaId;

    /** Идентификатор главы, к которой относится изображение */
    private Long chapterId;

    /** Номер страницы в главе */
    private Integer pageNumber;

    /** Публичный URL для доступа к изображению */
    private String imageUrl;

    /** Ключ изображения в системе хранения */
    private String imageKey;

    /** Размер файла изображения в байтах */
    private Long fileSize;

    /** MIME-тип изображения (например, "image/jpeg", "image/png") */
    private String mimeType;

    /** Ширина изображения в пикселях */
    private Integer width;

    /** Высота изображения в пикселях */
    private Integer height;

    /** Дата и время создания изображения */
    private LocalDateTime createdAt;

    /** Дата и время последнего обновления изображения */
    private LocalDateTime updatedAt;

    /**
     * Конструктор по умолчанию.
     */
    public ChapterImageResponseDTO() {}

    /**
     * Конструктор для создания DTO из сущности ChapterImage.
     *
     * @param chapterImage сущность изображения главы для преобразования
     */
    public ChapterImageResponseDTO(ChapterImage chapterImage) {
        this.id = chapterImage.getId();
        this.mangaId = chapterImage.getMangaId();
        this.chapterId = chapterImage.getChapterId();
        this.pageNumber = chapterImage.getPageNumber();
        this.imageUrl = chapterImage.getImageUrl();
        this.imageKey = chapterImage.getImageKey();
        this.fileSize = chapterImage.getFileSize();
        this.mimeType = chapterImage.getMimeType();
        this.width = chapterImage.getWidth();
        this.height = chapterImage.getHeight();
        this.createdAt = chapterImage.getCreatedAt();
        this.updatedAt = chapterImage.getUpdatedAt();
    }

    /**
     * Получить уникальный идентификатор изображения.
     *
     * @return идентификатор изображения
     */
    public Long getId() {
        return id;
    }

    /**
     * Установить уникальный идентификатор изображения.
     *
     * @param id идентификатор изображения
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Получить идентификатор манги.
     *
     * @return идентификатор манги
     */
    public Long getMangaId() {
        return mangaId;
    }

    /**
     * Установить идентификатор манги.
     *
     * @param mangaId идентификатор манги
     */
    public void setMangaId(Long mangaId) {
        this.mangaId = mangaId;
    }

    /**
     * Получить идентификатор главы.
     *
     * @return идентификатор главы
     */
    public Long getChapterId() {
        return chapterId;
    }

    /**
     * Установить идентификатор главы.
     *
     * @param chapterId идентификатор главы
     */
    public void setChapterId(Long chapterId) {
        this.chapterId = chapterId;
    }

    /**
     * Получить номер страницы в главе.
     *
     * @return номер страницы
     */
    public Integer getPageNumber() {
        return pageNumber;
    }

    /**
     * Установить номер страницы в главе.
     *
     * @param pageNumber номер страницы
     */
    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }

    /**
     * Получить публичный URL для доступа к изображению.
     *
     * @return URL изображения
     */
    public String getImageUrl() {
        return imageUrl;
    }

    /**
     * Установить публичный URL для доступа к изображению.
     *
     * @param imageUrl URL изображения
     */
    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    /**
     * Получить ключ изображения в системе хранения.
     *
     * @return ключ изображения
     */
    public String getImageKey() {
        return imageKey;
    }

    /**
     * Установить ключ изображения в системе хранения.
     *
     * @param imageKey ключ изображения
     */
    public void setImageKey(String imageKey) {
        this.imageKey = imageKey;
    }

    /**
     * Получить размер файла изображения в байтах.
     *
     * @return размер файла в байтах
     */
    public Long getFileSize() {
        return fileSize;
    }

    /**
     * Установить размер файла изображения в байтах.
     *
     * @param fileSize размер файла в байтах
     */
    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    /**
     * Получить MIME-тип изображения.
     *
     * @return MIME-тип изображения
     */
    public String getMimeType() {
        return mimeType;
    }

    /**
     * Установить MIME-тип изображения.
     *
     * @param mimeType MIME-тип изображения
     */
    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    /**
     * Получить ширину изображения в пикселях.
     *
     * @return ширина изображения
     */
    public Integer getWidth() {
        return width;
    }

    /**
     * Установить ширину изображения в пикселях.
     *
     * @param width ширина изображения
     */
    public void setWidth(Integer width) {
        this.width = width;
    }

    /**
     * Получить высоту изображения в пикселях.
     *
     * @return высота изображения
     */
    public Integer getHeight() {
        return height;
    }

    /**
     * Установить высоту изображения в пикселях.
     *
     * @param height высота изображения
     */
    public void setHeight(Integer height) {
        this.height = height;
    }

    /**
     * Получить дату и время создания изображения.
     *
     * @return дата и время создания
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Установить дату и время создания изображения.
     *
     * @param createdAt дата и время создания
     */
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Получить дату и время последнего обновления изображения.
     *
     * @return дата и время обновления
     */
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Установить дату и время последнего обновления изображения.
     *
     * @param updatedAt дата и время обновления
     */
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
