package shadowshift.studio.mangaservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Сущность жанра манги.
 * Содержит информацию о жанре и связанных с ним мангах.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "genres")
public class Genre {

    /**
     * Уникальный идентификатор жанра.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Название жанра.
     */
    @Column(unique = true, nullable = false)
    @NotBlank(message = "Genre name cannot be empty")
    @Size(max = 100, message = "Genre name must not exceed 100 characters")
    private String name;

    /**
     * Описание жанра.
     */
    @Column(length = 500)
    @Size(max = 500, message = "Genre description must not exceed 500 characters")
    private String description;

    /**
     * Slug для URL (нормализованное название).
     */
    @Column(unique = true, nullable = false)
    @NotBlank(message = "Genre slug cannot be empty")
    @Size(max = 100, message = "Genre slug must not exceed 100 characters")
    private String slug;

    /**
     * Количество манг с этим жанром.
     */
    @Column(name = "manga_count", nullable = false)
    private Integer mangaCount = 0;

    /**
     * Дата создания жанра.
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
    @ManyToMany(mappedBy = "genres", fetch = FetchType.LAZY)
    private Set<Manga> mangas = new HashSet<>();

    /**
     * Конструктор по умолчанию.
     */
    public Genre() {}

    /**
     * Конструктор с названием жанра.
     *
     * @param name название жанра
     */
    public Genre(String name) {
        this.name = name;
        this.slug = generateSlug(name);
    }

    /**
     * Конструктор с названием и описанием.
     *
     * @param name название жанра
     * @param description описание жанра
     */
    public Genre(String name, String description) {
        this.name = name;
        this.description = description;
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
    }

    /**
     * Обновление полей перед изменением.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Генерирует slug из названия жанра.
     *
     * @param name название жанра
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

    // Геттеры и сеттеры

    /**
     * Возвращает уникальный идентификатор жанра.
     *
     * @return уникальный идентификатор
     */
    public Long getId() { return id; }

    /**
     * Устанавливает уникальный идентификатор жанра.
     *
     * @param id уникальный идентификатор
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Возвращает название жанра.
     *
     * @return название жанра
     */
    public String getName() { return name; }

    /**
     * Устанавливает название жанра.
     *
     * @param name название жанра
     */
    public void setName(String name) {
        this.name = name;
        this.slug = generateSlug(name);
    }

    /**
     * Возвращает описание жанра.
     *
     * @return описание жанра
     */
    public String getDescription() { return description; }

    /**
     * Устанавливает описание жанра.
     *
     * @param description описание жанра
     */
    public void setDescription(String description) { this.description = description; }

    /**
     * Возвращает slug жанра.
     *
     * @return slug жанра
     */
    public String getSlug() { return slug; }

    /**
     * Устанавливает slug жанра.
     *
     * @param slug slug жанра
     */
    public void setSlug(String slug) { this.slug = slug; }

    /**
     * Возвращает количество манг с этим жанром.
     *
     * @return количество манг
     */
    public Integer getMangaCount() { return mangaCount; }

    /**
     * Устанавливает количество манг с этим жанром.
     *
     * @param mangaCount количество манг
     */
    public void setMangaCount(Integer mangaCount) { this.mangaCount = mangaCount; }

    /**
     * Возвращает дату создания жанра.
     *
     * @return дата создания
     */
    public LocalDateTime getCreatedAt() { return createdAt; }

    /**
     * Устанавливает дату создания жанра.
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Genre)) return false;
        Genre genre = (Genre) o;
        return id != null && id.equals(genre.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "Genre{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", slug='" + slug + '\'' +
                ", mangaCount=" + mangaCount +
                '}';
    }
}