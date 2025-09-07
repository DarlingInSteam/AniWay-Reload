package shadowshift.studio.imagestorageservice.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * JPA сущность для хранения изображений глав манги.
 * Представляет изображение страницы в главе манги с метаданными,
 * ссылками на хранилище и временными метками.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "chapter_images")
public class ChapterImage {

    /** Уникальный идентификатор изображения */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Идентификатор манги, к которой относится изображение */
    @Column(name = "manga_id")
    private Long mangaId;

    /** Идентификатор главы, к которой относится изображение */
    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    /** Номер страницы в главе (начиная с 1) */
    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    /** Публичный URL для доступа к изображению */
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    /** Ключ объекта в системе хранения MinIO */
    @Column(name = "minio_object_name", nullable = false)
    private String imageKey;

    /** Размер файла изображения в байтах */
    @Column(name = "file_size")
    private Long fileSize;

    /** MIME-тип изображения (например, "image/jpeg", "image/png") */
    @Column(name = "content_type")
    private String mimeType;

    /** Ширина изображения в пикселях */
    @Column(name = "width")
    private Integer width;

    /** Высота изображения в пикселях */
    @Column(name = "height")
    private Integer height;

    /** Дата и время создания записи */
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /** Дата и время последнего обновления записи */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Конструктор по умолчанию для JPA.
     */
    public ChapterImage() {}

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
     * Получить ключ объекта в системе хранения MinIO.
     *
     * @return ключ объекта MinIO
     */
    public String getImageKey() {
        return imageKey;
    }

    /**
     * Установить ключ объекта в системе хранения MinIO.
     *
     * @param imageKey ключ объекта MinIO
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
     * Получить дату и время создания записи.
     *
     * @return дата и время создания
     */
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    /**
     * Установить дату и время создания записи.
     *
     * @param createdAt дата и время создания
     */
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    /**
     * Получить дату и время последнего обновления записи.
     *
     * @return дата и время обновления
     */
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Установить дату и время последнего обновления записи.
     *
     * @param updatedAt дата и время обновления
     */
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    /**
     * Метод жизненного цикла JPA, вызываемый перед сохранением новой сущности.
     * Автоматически устанавливает временные метки создания и обновления.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    /**
     * Метод жизненного цикла JPA, вызываемый перед обновлением существующей сущности.
     * Автоматически обновляет временную метку последнего изменения.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
