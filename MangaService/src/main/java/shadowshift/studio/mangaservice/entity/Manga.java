package shadowshift.studio.mangaservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Сущность, представляющая мангу в системе MangaService.
 * Содержит всю информацию о манге, включая метаданные, статус и даты.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "manga")
public class Manga {

    /**
     * Уникальный идентификатор манги.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Заголовок манги. Обязательное поле.
     */
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    @Column(nullable = false)
    private String title;

    /**
     * Описание манги.
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Автор манги.
     */
    @Size(max = 255, message = "Author name must not exceed 255 characters")
    private String author;

    /**
     * Художник манги.
     */
    @Size(max = 255, message = "Artist name must not exceed 255 characters")
    private String artist;

    /**
     * Дата выпуска манги.
     */
    @Column(name = "release_date")
    private LocalDate releaseDate;

    /**
     * Статус манги.
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private MangaStatus status;

    /**
     * Жанр манги.
     */
    @Size(max = 500, message = "Genre must not exceed 500 characters")
    private String genre;

    /**
     * Теги манги.
     */
    @Size(max = 1000, message = "Tags must not exceed 1000 characters")
    private String tags;

    /**
     * Английское название манги.
     */
    @Column(name = "eng_name", length = 255)
    private String engName;

    /**
     * Альтернативные названия манги.
     */
    @Column(name = "alternative_names", length = 1000)
    private String alternativeNames;

    /**
     * Тип манги.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "manga_type", length = 50)
    private MangaType type;

    /**
     * Возрастное ограничение манги.
     */
    @Column(name = "age_limit")
    private Integer ageLimit;

    /**
     * Флаг лицензированности манги.
     */
    @Column(name = "is_licensed")
    private Boolean isLicensed = false;

    /**
     * URL обложки манги.
     */
    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    /**
     * Общее количество глав манги.
     */
    @Column(name = "total_chapters")
    private Integer totalChapters = 0;

    /**
     * Дата создания записи о манге.
     */
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Дата последнего обновления записи о манге.
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Общее количество просмотров манги.
     */
    @Column(name = "views")
    private Long views = 0L;

    /**
     * Количество уникальных просмотров манги (с rate limiting).
     */
    @Column(name = "unique_views")
    private Long uniqueViews = 0L;

    /**
     * Метод, вызываемый перед сохранением сущности.
     * Устанавливает даты создания и обновления.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    /**
     * Метод, вызываемый перед обновлением сущности.
     * Обновляет дату последнего изменения.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Конструктор по умолчанию.
     */
    public Manga() {}

    /**
     * Конструктор для создания манги с основными полями.
     *
     * @param title заголовок манги
     * @param description описание манги
     * @param author автор манги
     */
    public Manga(String title, String description, String author) {
        this.title = title;
        this.description = description;
        this.author = author;
    }

    /**
     * Возвращает уникальный идентификатор манги.
     *
     * @return уникальный идентификатор
     */
    public Long getId() { return id; }

    /**
     * Устанавливает уникальный идентификатор манги.
     *
     * @param id уникальный идентификатор
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Возвращает заголовок манги.
     *
     * @return заголовок манги
     */
    public String getTitle() { return title; }

    /**
     * Устанавливает заголовок манги.
     *
     * @param title заголовок манги
     */
    public void setTitle(String title) { this.title = title; }

    /**
     * Возвращает описание манги.
     *
     * @return описание манги
     */
    public String getDescription() { return description; }

    /**
     * Устанавливает описание манги.
     *
     * @param description описание манги
     */
    public void setDescription(String description) { this.description = description; }

    /**
     * Возвращает автора манги.
     *
     * @return автор манги
     */
    public String getAuthor() { return author; }

    /**
     * Устанавливает автора манги.
     *
     * @param author автор манги
     */
    public void setAuthor(String author) { this.author = author; }

    /**
     * Возвращает художника манги.
     *
     * @return художник манги
     */
    public String getArtist() { return artist; }

    /**
     * Устанавливает художника манги.
     *
     * @param artist художник манги
     */
    public void setArtist(String artist) { this.artist = artist; }

    /**
     * Возвращает дату выпуска манги.
     *
     * @return дата выпуска
     */
    public LocalDate getReleaseDate() { return releaseDate; }

    /**
     * Устанавливает дату выпуска манги.
     *
     * @param releaseDate дата выпуска
     */
    public void setReleaseDate(LocalDate releaseDate) { this.releaseDate = releaseDate; }

    /**
     * Возвращает статус манги.
     *
     * @return статус манги
     */
    public MangaStatus getStatus() { return status; }

    /**
     * Устанавливает статус манги.
     *
     * @param status статус манги
     */
    public void setStatus(MangaStatus status) { this.status = status; }

    /**
     * Возвращает жанр манги.
     *
     * @return жанр манги
     */
    public String getGenre() { return genre; }

    /**
     * Устанавливает жанр манги.
     *
     * @param genre жанр манги
     */
    public void setGenre(String genre) { this.genre = genre; }

    /**
     * Возвращает URL обложки манги.
     *
     * @return URL обложки
     */
    public String getCoverImageUrl() { return coverImageUrl; }

    /**
     * Устанавливает URL обложки манги.
     *
     * @param coverImageUrl URL обложки
     */
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    /**
     * Возвращает общее количество глав манги.
     *
     * @return общее количество глав
     */
    public Integer getTotalChapters() { return totalChapters; }

    /**
     * Устанавливает общее количество глав манги.
     *
     * @param totalChapters общее количество глав
     */
    public void setTotalChapters(Integer totalChapters) { this.totalChapters = totalChapters; }

    /**
     * Возвращает дату создания записи о манге.
     *
     * @return дата создания
     */
    public LocalDateTime getCreatedAt() { return createdAt; }

    /**
     * Устанавливает дату создания записи о манге.
     *
     * @param createdAt дата создания
     */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    /**
     * Возвращает дату последнего обновления записи о манге.
     *
     * @return дата обновления
     */
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    /**
     * Устанавливает дату последнего обновления записи о манге.
     *
     * @param updatedAt дата обновления
     */
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    /**
     * Возвращает теги манги.
     *
     * @return теги манги
     */
    public String getTags() { return tags; }

    /**
     * Устанавливает теги манги.
     *
     * @param tags теги манги
     */
    public void setTags(String tags) { this.tags = tags; }

    /**
     * Возвращает английское название манги.
     *
     * @return английское название
     */
    public String getEngName() { return engName; }

    /**
     * Устанавливает английское название манги.
     *
     * @param engName английское название
     */
    public void setEngName(String engName) { this.engName = engName; }

    /**
     * Возвращает альтернативные названия манги.
     *
     * @return альтернативные названия
     */
    public String getAlternativeNames() { return alternativeNames; }

    /**
     * Устанавливает альтернативные названия манги.
     *
     * @param alternativeNames альтернативные названия
     */
    public void setAlternativeNames(String alternativeNames) { this.alternativeNames = alternativeNames; }

    /**
     * Возвращает тип манги.
     *
     * @return тип манги
     */
    public MangaType getType() { return type; }

    /**
     * Устанавливает тип манги.
     *
     * @param type тип манги
     */
    public void setType(MangaType type) { this.type = type; }

    /**
     * Возвращает возрастное ограничение манги.
     *
     * @return возрастное ограничение
     */
    public Integer getAgeLimit() { return ageLimit; }

    /**
     * Устанавливает возрастное ограничение манги.
     *
     * @param ageLimit возрастное ограничение
     */
    public void setAgeLimit(Integer ageLimit) { this.ageLimit = ageLimit; }

    /**
     * Возвращает флаг лицензированности манги.
     *
     * @return true, если манга лицензирована, иначе false
     */
    public Boolean getIsLicensed() { return isLicensed; }

    /**
     * Устанавливает флаг лицензированности манги.
     *
     * @param isLicensed флаг лицензированности
     */
    public void setIsLicensed(Boolean isLicensed) { this.isLicensed = isLicensed; }

    /**
     * Возвращает общее количество просмотров манги.
     *
     * @return количество просмотров
     */
    public Long getViews() { return views; }

    /**
     * Устанавливает общее количество просмотров манги.
     *
     * @param views количество просмотров
     */
    public void setViews(Long views) { this.views = views; }

    /**
     * Возвращает количество уникальных просмотров манги.
     *
     * @return количество уникальных просмотров
     */
    public Long getUniqueViews() { return uniqueViews; }

    /**
     * Устанавливает количество уникальных просмотров манги.
     *
     * @param uniqueViews количество уникальных просмотров
     */
    public void setUniqueViews(Long uniqueViews) { this.uniqueViews = uniqueViews; }

    /**
     * Перечисление статусов манги.
     */
    public enum MangaStatus {
        /**
         * Манга в процессе выпуска.
         */
        ONGOING,
        /**
         * Манга завершена.
         */
        COMPLETED,
        /**
         * Выпуск манги приостановлен.
         */
        HIATUS,
        /**
         * Выпуск манги отменен.
         */
        CANCELLED
    }

    /**
     * Перечисление типов манги.
     */
    public enum MangaType {
        /**
         * Японская манга.
         */
        MANGA,
        /**
         * Корейская манхва.
         */
        MANHWA,
        /**
         * Китайская манхуа.
         */
        MANHUA,
        /**
         * Западный комикс.
         */
        WESTERN_COMIC,
        /**
         * Русский комикс.
         */
        RUSSIAN_COMIC,
        /**
         * Оригинальная английская манга.
         */
        OEL,
        /**
         * Другой тип.
         */
        OTHER
    }
}
