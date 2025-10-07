package shadowshift.studio.mangaservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

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
     * Теги манги (строковое представление для обратной совместимости).
     */
    @Size(max = 1000, message = "Tags must not exceed 1000 characters")
    private String tagsString;

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
     * Оригинальный slug из MelonService.
     */
    @Column(name = "melon_slug", length = 255, unique = true)
    private String melonSlug;

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
     * Количество просмотров манги.
     */
    @Column(name = "views", nullable = false)
    private Long views = 0L;

    /**
     * Средний рейтинг манги (от 0.0 до 10.0).
     */
    @Column(name = "rating", columnDefinition = "DECIMAL(3,2)")
    private Double rating = 0.0;

    /**
     * Количество оценок манги.
     */
    @Column(name = "rating_count")
    private Integer ratingCount = 0;

    /**
     * Общее количество лайков к главам манги.
     */
    @Column(name = "likes", nullable = false)
    private Long likes = 0L;

    /**
     * Количество отзывов о манге.
     */
    @Column(name = "reviews")
    private Integer reviews = 0;

    /**
     * Количество комментариев к манге.
     */
    @Column(name = "comments")
    private Integer comments = 0;

    /**
     * Связь Many-to-Many с жанрами.
     * Жанры управляются отдельно через GenreService, поэтому не каскадируем операции.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "manga_genres",
        joinColumns = @JoinColumn(name = "manga_id"),
        inverseJoinColumns = @JoinColumn(name = "genre_id")
    )
    private Set<Genre> genres = new HashSet<>();

    /**
     * Связь Many-to-Many с тегами.
     * Теги управляются отдельно через TagService, поэтому не каскадируем операции.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "manga_tags",
        joinColumns = @JoinColumn(name = "manga_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();

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
     * Возвращает количество просмотров манги.
     *
     * @return количество просмотров
     */
    public Long getViews() { return views; }

    /**
     * Устанавливает количество просмотров манги.
     *
     * @param views количество просмотров
     */
    public void setViews(Long views) { this.views = views; }

    /**
     * Возвращает средний рейтинг манги.
     *
     * @return средний рейтинг
     */
    public Double getRating() { return rating; }

    /**
     * Устанавливает средний рейтинг манги.
     *
     * @param rating средний рейтинг
     */
    public void setRating(Double rating) { this.rating = rating; }

    /**
     * Возвращает количество оценок манги.
     *
     * @return количество оценок
     */
    public Integer getRatingCount() { return ratingCount; }

    /**
     * Устанавливает количество оценок манги.
     *
     * @param ratingCount количество оценок
     */
    public void setRatingCount(Integer ratingCount) { this.ratingCount = ratingCount; }

    /**
     * Возвращает общее количество лайков к главам манги.
     *
     * @return количество лайков
     */
    public Long getLikes() { return likes; }

    /**
     * Устанавливает общее количество лайков к главам манги.
     *
     * @param likes количество лайков
     */
    public void setLikes(Long likes) { this.likes = likes; }

    /**
     * Возвращает количество отзывов о манге.
     *
     * @return количество отзывов
     */
    public Integer getReviews() { return reviews; }

    /**
     * Устанавливает количество отзывов о манге.
     *
     * @param reviews количество отзывов
     */
    public void setReviews(Integer reviews) { this.reviews = reviews; }

    /**
     * Возвращает количество комментариев к манге.
     *
     * @return количество комментариев
     */
    public Integer getComments() { return comments; }

    /**
     * Устанавливает количество комментариев к манге.
     *
     * @param comments количество комментариев
     */
    public void setComments(Integer comments) { this.comments = comments; }

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
     * Возвращает теги манги (строковое представление).
     *
     * @return теги манги
     */
    public String getTagsString() { return tagsString; }

    /**
     * Устанавливает теги манги (строковое представление).
     *
     * @param tagsString теги манги
     */
    public void setTagsString(String tagsString) { this.tagsString = tagsString; }

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
     * Возвращает slug манги в MelonService.
     *
     * @return slug манги
     */
    public String getMelonSlug() { return melonSlug; }

    /**
     * Устанавливает slug манги в MelonService.
     *
     * @param melonSlug slug манги
     */
    public void setMelonSlug(String melonSlug) { this.melonSlug = melonSlug; }

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
     * Возвращает набор жанров манги.
     *
     * @return набор жанров
     */
    public Set<Genre> getGenres() { return genres; }

    /**
     * Устанавливает набор жанров манги.
     *
     * @param genres набор жанров
     */
    public void setGenres(Set<Genre> genres) { this.genres = genres; }

    /**
     * Добавляет жанр к манге.
     * ВАЖНО: Не обращаемся к genre.getMangas() — это LAZY-коллекция, которая может вызвать LazyInitializationException.
     * Двунаправленную связь управляет Hibernate через @ManyToMany.
     *
     * @param genre жанр для добавления
     */
    public void addGenre(Genre genre) {
        this.genres.add(genre);
        // НЕ обращаемся к genre.getMangas() здесь — это вызовет LazyInitializationException
        // genre.getMangas().add(this);  // УБРАНО
        genre.incrementMangaCount();
    }

    /**
     * Удаляет жанр из манги.
     * ВАЖНО: Не обращаемся к genre.getMangas() — это LAZY-коллекция.
     *
     * @param genre жанр для удаления
     */
    public void removeGenre(Genre genre) {
        this.genres.remove(genre);
        // НЕ обращаемся к genre.getMangas() здесь
        // genre.getMangas().remove(this);  // УБРАНО
        genre.decrementMangaCount();
    }

    /**
     * Возвращает набор тегов манги.
     *
     * @return набор тегов
     */
    public Set<Tag> getTags() { return tags; }

    /**
     * Устанавливает набор тегов манги.
     *
     * @param tags набор тегов
     */
    public void setTags(Set<Tag> tags) { this.tags = tags; }

    /**
     * Добавляет тег к манге.
     * ВАЖНО: Не обращаемся к tag.getMangas() — это LAZY-коллекция, которая может вызвать LazyInitializationException.
     * Двунаправленную связь управляет Hibernate через @ManyToMany.
     *
     * @param tag тег для добавления
     */
    public void addTag(Tag tag) {
        this.tags.add(tag);
        // НЕ обращаемся к tag.getMangas() здесь — это вызовет LazyInitializationException
        // tag.getMangas().add(this);  // УБРАНО
        tag.incrementMangaCount();
        tag.incrementPopularity();
    }

    /**
     * Удаляет тег из манги.
     * ВАЖНО: Не обращаемся к tag.getMangas() — это LAZY-коллекция.
     *
     * @param tag тег для удаления
     */
    public void removeTag(Tag tag) {
        this.tags.remove(tag);
        // НЕ обращаемся к tag.getMangas() здесь
        // tag.getMangas().remove(this);  // УБРАНО
        tag.decrementMangaCount();
    }

    /**
     * Перечисление статусов манги.
     */
    public enum MangaStatus {
        /**
         * Манга в процессе выпуска (онгоинг).
         */
        ONGOING,
        /**
         * Манга завершена.
         */
        COMPLETED,
        /**
         * Анонсирована, но еще не выпущена.
         */
        ANNOUNCED,
        /**
         * Выпуск манги приостановлен.
         */
        HIATUS,
        /**
         * Выпуск манги прекращён.
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
