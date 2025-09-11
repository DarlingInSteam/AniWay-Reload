package shadowshift.studio.mangaservice.dto;

import shadowshift.studio.mangaservice.entity.Manga;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO для представления данных о манге в ответе системы MangaService.
 * Содержит полную информацию о манге, включая метаданные и даты.
 *
 * @author ShadowShiftStudio
 */
public class MangaResponseDTO {

    /**
     * Уникальный идентификатор манги.
     */
    private Long id;

    /**
     * Заголовок манги.
     */
    private String title;

    /**
     * Описание манги.
     */
    private String description;

    /**
     * Автор манги.
     */
    private String author;

    /**
     * Художник манги.
     */
    private String artist;

    /**
     * Дата выпуска манги.
     */
    private LocalDate releaseDate;

    /**
     * Статус манги.
     */
    private Manga.MangaStatus status;

    /**
     * Жанр манги.
     */
    private String genre;

    /**
     * Теги манги.
     */
    private String tags;

    /**
     * Английское название манги.
     */
    private String engName;

    /**
     * Альтернативные названия манги.
     */
    private String alternativeNames;

    /**
     * Тип манги.
     */
    private Manga.MangaType type;

    /**
     * Возрастное ограничение манги.
     */
    private Integer ageLimit;

    /**
     * Флаг лицензированности манги.
     */
    private Boolean isLicensed;

    /**
     * URL обложки манги.
     */
    private String coverImageUrl;

    /**
     * Общее количество глав манги.
     */
    private Integer totalChapters;

    /**
     * Общее количество просмотров манги.
     */
    private Long views;

    /**
     * Количество уникальных просмотров манги.
     */
    private Long uniqueViews;

    /**
     * Дата создания записи о манге.
     */
    private LocalDateTime createdAt;

    /**
     * Дата последнего обновления записи о манге.
     */
    private LocalDateTime updatedAt;

    /**
     * Конструктор по умолчанию.
     */
    public MangaResponseDTO() {}

    /**
     * Конструктор для инициализации DTO из сущности Manga.
     *
     * @param manga сущность Manga для копирования данных
     */
    public MangaResponseDTO(Manga manga) {
        this.id = manga.getId();
        this.title = manga.getTitle();
        this.description = manga.getDescription();
        this.author = manga.getAuthor();
        this.artist = manga.getArtist();
        this.releaseDate = manga.getReleaseDate();
        this.status = manga.getStatus();
        this.genre = manga.getGenre();
        this.tags = manga.getTags();
        this.engName = manga.getEngName();
        this.alternativeNames = manga.getAlternativeNames();
        this.type = manga.getType();
        this.ageLimit = manga.getAgeLimit();
        this.isLicensed = manga.getIsLicensed();
        this.coverImageUrl = manga.getCoverImageUrl();
        this.totalChapters = manga.getTotalChapters();
        this.views = manga.getViews();
        this.uniqueViews = manga.getUniqueViews();
        this.createdAt = manga.getCreatedAt();
        this.updatedAt = manga.getUpdatedAt();
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
    public Manga.MangaStatus getStatus() { return status; }

    /**
     * Устанавливает статус манги.
     *
     * @param status статус манги
     */
    public void setStatus(Manga.MangaStatus status) { this.status = status; }

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
    public Manga.MangaType getType() { return type; }

    /**
     * Устанавливает тип манги.
     *
     * @param type тип манги
     */
    public void setType(Manga.MangaType type) { this.type = type; }

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
}
