package shadowshift.studio.mangaservice.dto;

/**
 * DTO для передачи данных о теге.
 *
 * @author ShadowShiftStudio
 */
public class TagDto {

    private Long id;
    private String name;
    private String description;
    private String slug;
    private String color;
    private Integer mangaCount;
    private Integer popularityScore;
    private Boolean isActive;

    /**
     * Конструктор по умолчанию.
     */
    public TagDto() {}

    /**
     * Конструктор с основными полями.
     *
     * @param id идентификатор тега
     * @param name название тега
     * @param slug slug тега
     * @param color цвет тега
     * @param mangaCount количество манг
     */
    public TagDto(Long id, String name, String slug, String color, Integer mangaCount) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.color = color;
        this.mangaCount = mangaCount;
        this.isActive = true;
    }

    /**
     * Конструктор с полным набором полей.
     *
     * @param id идентификатор тега
     * @param name название тега
     * @param description описание тега
     * @param slug slug тега
     * @param color цвет тега
     * @param mangaCount количество манг
     * @param popularityScore рейтинг популярности
     * @param isActive статус активности
     */
    public TagDto(Long id, String name, String description, String slug, String color, 
                  Integer mangaCount, Integer popularityScore, Boolean isActive) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.slug = slug;
        this.color = color;
        this.mangaCount = mangaCount;
        this.popularityScore = popularityScore;
        this.isActive = isActive;
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

    public String getColor() { return color; }

    public void setColor(String color) { this.color = color; }

    public Integer getMangaCount() { return mangaCount; }

    public void setMangaCount(Integer mangaCount) { this.mangaCount = mangaCount; }

    public Integer getPopularityScore() { return popularityScore; }

    public void setPopularityScore(Integer popularityScore) { this.popularityScore = popularityScore; }

    public Boolean getIsActive() { return isActive; }

    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    @Override
    public String toString() {
        return "TagDto{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", slug='" + slug + '\'' +
                ", color='" + color + '\'' +
                ", mangaCount=" + mangaCount +
                ", popularityScore=" + popularityScore +
                ", isActive=" + isActive +
                '}';
    }
}