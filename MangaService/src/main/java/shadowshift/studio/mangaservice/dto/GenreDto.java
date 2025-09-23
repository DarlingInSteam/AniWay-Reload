package shadowshift.studio.mangaservice.dto;

/**
 * DTO для передачи данных о жанре.
 *
 * @author ShadowShiftStudio
 */
public class GenreDto {

    private Long id;
    private String name;
    private String description;
    private String slug;
    private Integer mangaCount;

    /**
     * Конструктор по умолчанию.
     */
    public GenreDto() {}

    /**
     * Конструктор с основными полями.
     *
     * @param id идентификатор жанра
     * @param name название жанра
     * @param slug slug жанра
     * @param mangaCount количество манг
     */
    public GenreDto(Long id, String name, String slug, Integer mangaCount) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.mangaCount = mangaCount;
    }

    /**
     * Конструктор с полным набором полей.
     *
     * @param id идентификатор жанра
     * @param name название жанра
     * @param description описание жанра
     * @param slug slug жанра
     * @param mangaCount количество манг
     */
    public GenreDto(Long id, String name, String description, String slug, Integer mangaCount) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.slug = slug;
        this.mangaCount = mangaCount;
    }

    // Геттеры и сеттеры

    public Long getId() { return id; }

    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }

    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

    public String getSlug() { return slug; }

    public void setSlug(String slug) { this.slug = slug; }

    public Integer getMangaCount() { return mangaCount; }

    public void setMangaCount(Integer mangaCount) { this.mangaCount = mangaCount; }

    @Override
    public String toString() {
        return "GenreDto{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", slug='" + slug + '\'' +
                ", mangaCount=" + mangaCount +
                '}';
    }
}