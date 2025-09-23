package shadowshift.studio.mangaservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import shadowshift.studio.mangaservice.entity.Manga;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO для создания новой манги в системе MangaService.
 * Содержит поля для ввода данных о манге с валидацией.
 *
 * @author ShadowShiftStudio
 */
public class MangaCreateDTO {

    /**
     * Заголовок манги. Обязательное поле.
     */
    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    /**
     * Описание манги.
     */
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
    private LocalDate releaseDate;

    /**
     * Статус манги.
     */
    private Manga.MangaStatus status;

    /**
     * Жанр манги (строковое представление для обратной совместимости).
     */
    @Size(max = 500, message = "Genre must not exceed 500 characters")
    private String genre;

    /**
     * Список названий жанров манги.
     */
    private List<String> genreNames;

    /**
     * Список названий тегов манги.
     */
    private List<String> tagNames;

    /**
     * URL обложки манги.
     */
    @Size(max = 500, message = "Cover image URL must not exceed 500 characters")
    private String coverImageUrl;

    /**
     * Конструктор по умолчанию.
     */
    public MangaCreateDTO() {}

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
     * Возвращает список названий жанров манги.
     *
     * @return список названий жанров
     */
    public List<String> getGenreNames() { return genreNames; }

    /**
     * Устанавливает список названий жанров манги.
     *
     * @param genreNames список названий жанров
     */
    public void setGenreNames(List<String> genreNames) { this.genreNames = genreNames; }

    /**
     * Возвращает список названий тегов манги.
     *
     * @return список названий тегов
     */
    public List<String> getTagNames() { return tagNames; }

    /**
     * Устанавливает список названий тегов манги.
     *
     * @param tagNames список названий тегов
     */
    public void setTagNames(List<String> tagNames) { this.tagNames = tagNames; }
}
