package shadowshift.studio.mangaservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "manga")
public class Manga {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Size(max = 255, message = "Author name must not exceed 255 characters")
    private String author;

    @Size(max = 255, message = "Artist name must not exceed 255 characters")
    private String artist;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private MangaStatus status;

    @Size(max = 500, message = "Genre must not exceed 500 characters")
    private String genre;

    @Size(max = 1000, message = "Tags must not exceed 1000 characters")
    private String tags;

    @Column(name = "eng_name", length = 255)
    private String engName;

    @Column(name = "alternative_names", length = 1000)
    private String alternativeNames;

    @Enumerated(EnumType.STRING)
    @Column(name = "manga_type", length = 50)
    private MangaType type;

    @Column(name = "age_limit")
    private Integer ageLimit;

    @Column(name = "is_licensed")
    private Boolean isLicensed = false;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "total_chapters")
    private Integer totalChapters = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Constructors
    public Manga() {}

    public Manga(String title, String description, String author) {
        this.title = title;
        this.description = description;
        this.author = author;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getArtist() { return artist; }
    public void setArtist(String artist) { this.artist = artist; }

    public LocalDate getReleaseDate() { return releaseDate; }
    public void setReleaseDate(LocalDate releaseDate) { this.releaseDate = releaseDate; }

    public MangaStatus getStatus() { return status; }
    public void setStatus(MangaStatus status) { this.status = status; }

    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public Integer getTotalChapters() { return totalChapters; }
    public void setTotalChapters(Integer totalChapters) { this.totalChapters = totalChapters; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getEngName() { return engName; }
    public void setEngName(String engName) { this.engName = engName; }

    public String getAlternativeNames() { return alternativeNames; }
    public void setAlternativeNames(String alternativeNames) { this.alternativeNames = alternativeNames; }

    public MangaType getType() { return type; }
    public void setType(MangaType type) { this.type = type; }

    public Integer getAgeLimit() { return ageLimit; }
    public void setAgeLimit(Integer ageLimit) { this.ageLimit = ageLimit; }

    public Boolean getIsLicensed() { return isLicensed; }
    public void setIsLicensed(Boolean isLicensed) { this.isLicensed = isLicensed; }

    public enum MangaStatus {
        ONGOING, COMPLETED, HIATUS, CANCELLED
    }

    public enum MangaType {
        MANGA, MANHWA, MANHUA, WESTERN_COMIC, RUSSIAN_COMIC, OEL, OTHER
    }
}
