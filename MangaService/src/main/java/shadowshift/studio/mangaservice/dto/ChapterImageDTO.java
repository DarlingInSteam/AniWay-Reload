package shadowshift.studio.mangaservice.dto;

import java.time.LocalDateTime;

/**
 * DTO для представления изображения главы манги в системе MangaService.
 * Содержит информацию об изображении, такую как URL, размер файла, тип MIME и метаданные.
 *
 * @author ShadowShiftStudio
 */
public class ChapterImageDTO {

    /**
     * Уникальный идентификатор изображения.
     */
    private Long id;

    /**
     * Идентификатор главы, к которой относится изображение.
     */
    private Long chapterId;

    /**
     * Номер страницы изображения в главе.
     */
    private Integer pageNumber;

    /**
     * URL изображения.
     */
    private String imageUrl;

    /**
     * Ключ изображения в хранилище.
     */
    private String imageKey;

    /**
     * Размер файла изображения в байтах.
     */
    private Long fileSize;

    /**
     * Тип MIME изображения.
     */
    private String mimeType;

    /**
     * Ширина изображения в пикселях.
     */
    private Integer width;

    /**
     * Высота изображения в пикселях.
     */
    private Integer height;

    /**
     * Дата создания записи об изображении.
     */
    private LocalDateTime createdAt;

    /**
     * Конструктор по умолчанию.
     */
    public ChapterImageDTO() {}

    /**
     * Возвращает уникальный идентификатор изображения.
     *
     * @return уникальный идентификатор
     */
    public Long getId() { return id; }

    /**
     * Устанавливает уникальный идентификатор изображения.
     *
     * @param id уникальный идентификатор
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Возвращает идентификатор главы.
     *
     * @return идентификатор главы
     */
    public Long getChapterId() { return chapterId; }

    /**
     * Устанавливает идентификатор главы.
     *
     * @param chapterId идентификатор главы
     */
    public void setChapterId(Long chapterId) { this.chapterId = chapterId; }

    /**
     * Возвращает номер страницы изображения.
     *
     * @return номер страницы
     */
    public Integer getPageNumber() { return pageNumber; }

    /**
     * Устанавливает номер страницы изображения.
     *
     * @param pageNumber номер страницы
     */
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }

    /**
     * Возвращает URL изображения.
     *
     * @return URL изображения
     */
    public String getImageUrl() { return imageUrl; }

    /**
     * Устанавливает URL изображения.
     *
     * @param imageUrl URL изображения
     */
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    /**
     * Возвращает ключ изображения в хранилище.
     *
     * @return ключ изображения
     */
    public String getImageKey() { return imageKey; }

    /**
     * Устанавливает ключ изображения в хранилище.
     *
     * @param imageKey ключ изображения
     */
    public void setImageKey(String imageKey) { this.imageKey = imageKey; }

    /**
     * Возвращает размер файла изображения в байтах.
     *
     * @return размер файла
     */
    public Long getFileSize() { return fileSize; }

    /**
     * Устанавливает размер файла изображения в байтах.
     *
     * @param fileSize размер файла
     */
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    /**
     * Возвращает тип MIME изображения.
     *
     * @return тип MIME
     */
    public String getMimeType() { return mimeType; }

    /**
     * Устанавливает тип MIME изображения.
     *
     * @param mimeType тип MIME
     */
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    /**
     * Возвращает ширину изображения в пикселях.
     *
     * @return ширина
     */
    public Integer getWidth() { return width; }

    /**
     * Устанавливает ширину изображения в пикселях.
     *
     * @param width ширина
     */
    public void setWidth(Integer width) { this.width = width; }

    /**
     * Возвращает высоту изображения в пикселях.
     *
     * @return высота
     */
    public Integer getHeight() { return height; }

    /**
     * Устанавливает высоту изображения в пикселях.
     *
     * @param height высота
     */
    public void setHeight(Integer height) { this.height = height; }

    /**
     * Возвращает дату создания записи об изображении.
     *
     * @return дата создания
     */
    public LocalDateTime getCreatedAt() { return createdAt; }

    /**
     * Устанавливает дату создания записи об изображении.
     *
     * @param createdAt дата создания
     */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
