package shadowshift.studio.mangaservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Сущность тега манги.
 * Содержит информацию о теге и связанных с ним мангах.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "tags")
public class Tag {

    /**
     * Уникальный идентификатор тега.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Название тега.
     */
    @Column(unique = true, nullable = false)
    @NotBlank(message = "Tag name cannot be empty")
    @Size(max = 100, message = "Tag name must not exceed 100 characters")
    private String name;

    /**
     * Описание тега.
     */
    @Column(length = 500)
    @Size(max = 500, message = "Tag description must not exceed 500 characters")
    private String description;

    /**
     * Slug для URL (нормализованное название).
     */
    @Column(unique = true, nullable = false)
    @NotBlank(message = "Tag slug cannot be empty")
    @Size(max = 100, message = "Tag slug must not exceed 100 characters")
    private String slug;

    /**
     * Цвет тега для отображения в UI.
     */
    @Column(name = "color", length = 7)
    @Size(max = 7, message = "Tag color must be a valid hex color")
    private String color;

    /**
     * Количество манг с этим тегом.
     */
    @Column(name = "manga_count", nullable = false)
    private Integer mangaCount = 0;

    /**
     * Популярность тега (используется для сортировки).
     */
    @Column(name = "popularity_score", nullable = false)
    private Integer popularityScore = 0;

    /**
     * Флаг активности тега.
     */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /**
     * Дата создания тега.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Дата последнего обновления.
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Связь Many-to-Many с мангами.
     */
    @ManyToMany(mappedBy = "tags", fetch = FetchType.LAZY)
    private Set<Manga> mangas = new HashSet<>();

    /**
     * Конструктор по умолчанию.
     */
    public Tag() {}

    /**
     * Конструктор с названием тега.
     *
     * @param name название тега
     */
    public Tag(String name) {
        this.name = name;
        this.slug = generateSlug(name);
        this.color = generateRandomColor();
    }

    /**
     * Конструктор с названием и описанием.
     *
     * @param name название тега
     * @param description описание тега
     */
    public Tag(String name, String description) {
        this.name = name;
        this.description = description;
        this.slug = generateSlug(name);
        this.color = generateRandomColor();
    }

    /**
     * Конструктор с полным набором параметров.
     *
     * @param name название тега
     * @param description описание тега
     * @param color цвет тега
     */
    public Tag(String name, String description, String color) {
        this.name = name;
        this.description = description;
        this.color = color;
        this.slug = generateSlug(name);
    }

    /**
     * Инициализация полей перед сохранением.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (slug == null || slug.isEmpty()) {
            slug = generateSlug(name);
        }
        if (color == null || color.isEmpty()) {
            color = generateRandomColor();
        }
    }

    /**
     * Обновление полей перед изменением.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Генерирует slug из названия тега.
     *
     * @param name название тега
     * @return slug
     */
    private String generateSlug(String name) {
        if (name == null) return null;
        return name.toLowerCase()
                .replaceAll("[^а-яёa-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    /**
     * Генерирует случайный цвет для тега.
     *
     * @return hex-код цвета
     */
    private String generateRandomColor() {
        String[] colors = {
            "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
            "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
            "#14B8A6", "#F43F5E", "#8B5CF6", "#EAB308", "#22C55E"
        };
        return colors[(int) (Math.random() * colors.length)];
    }

    // Геттеры и сеттеры

    /**
     * Возвращает уникальный идентификатор тега.
     *
     * @return уникальный идентификатор
     */
    public Long getId() { return id; }

    /**
     * Устанавливает уникальный идентификатор тега.
     *
     * @param id уникальный идентификатор
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Возвращает название тега.
     *
     * @return название тега
     */
    public String getName() { return name; }

    /**
     * Устанавливает название тега.
     *
     * @param name название тега
     */
    public void setName(String name) {
        this.name = name;
        this.slug = generateSlug(name);
    }

    /**
     * Возвращает описание тега.
     *
     * @return описание тега
     */
    public String getDescription() { return description; }

    /**
     * Устанавливает описание тега.
     *
     * @param description описание тега
     */
    public void setDescription(String description) { this.description = description; }

    /**
     * Возвращает slug тега.
     *
     * @return slug тега
     */
    public String getSlug() { return slug; }

    /**
     * Устанавливает slug тега.
     *
     * @param slug slug тега
     */
    public void setSlug(String slug) { this.slug = slug; }

    /**
     * Возвращает цвет тега.
     *
     * @return цвет тега
     */
    public String getColor() { return color; }

    /**
     * Устанавливает цвет тега.
     *
     * @param color цвет тега
     */
    public void setColor(String color) { this.color = color; }

    /**
     * Возвращает количество манг с этим тегом.
     *
     * @return количество манг
     */
    public Integer getMangaCount() { return mangaCount; }

    /**
     * Устанавливает количество манг с этим тегом.
     *
     * @param mangaCount количество манг
     */
    public void setMangaCount(Integer mangaCount) { this.mangaCount = mangaCount; }

    /**
     * Возвращает рейтинг популярности тега.
     *
     * @return рейтинг популярности
     */
    public Integer getPopularityScore() { return popularityScore; }

    /**
     * Устанавливает рейтинг популярности тега.
     *
     * @param popularityScore рейтинг популярности
     */
    public void setPopularityScore(Integer popularityScore) { this.popularityScore = popularityScore; }

    /**
     * Возвращает статус активности тега.
     *
     * @return true если тег активен
     */
    public Boolean getIsActive() { return isActive; }

    /**
     * Устанавливает статус активности тега.
     *
     * @param isActive статус активности
     */
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    /**
     * Возвращает дату создания тега.
     *
     * @return дата создания
     */
    public LocalDateTime getCreatedAt() { return createdAt; }

    /**
     * Устанавливает дату создания тега.
     *
     * @param createdAt дата создания
     */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    /**
     * Возвращает дату последнего обновления.
     *
     * @return дата обновления
     */
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    /**
     * Устанавливает дату последнего обновления.
     *
     * @param updatedAt дата обновления
     */
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    /**
     * Возвращает набор связанных манг.
     *
     * @return набор манг
     */
    public Set<Manga> getMangas() { return mangas; }

    /**
     * Устанавливает набор связанных манг.
     *
     * @param mangas набор манг
     */
    public void setMangas(Set<Manga> mangas) { this.mangas = mangas; }

    /**
     * Увеличивает счетчик манг на 1.
     */
    public void incrementMangaCount() {
        this.mangaCount++;
    }

    /**
     * Уменьшает счетчик манг на 1.
     */
    public void decrementMangaCount() {
        if (this.mangaCount > 0) {
            this.mangaCount--;
        }
    }

    /**
     * Увеличивает рейтинг популярности.
     */
    public void incrementPopularity() {
        this.popularityScore++;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Tag)) return false;
        Tag tag = (Tag) o;
        return id != null && id.equals(tag.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "Tag{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", slug='" + slug + '\'' +
                ", color='" + color + '\'' +
                ", mangaCount=" + mangaCount +
                ", isActive=" + isActive +
                '}';
    }
}