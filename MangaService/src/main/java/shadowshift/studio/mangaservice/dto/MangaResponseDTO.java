package shadowshift.studio.mangaservice.dto;

import shadowshift.studio.mangaservice.entity.Manga;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class MangaResponseDTO {

    private Long id;
    private String title;
    private String description;
    private String author;
    private String artist;
    private LocalDate releaseDate;
    private Manga.MangaStatus status;
    private String genre;
    private String tags;
    private String engName;
    private String alternativeNames;
    private Manga.MangaType type;
    private Integer ageLimit;
    private Boolean isLicensed;
    private String coverImageUrl;
    private Integer totalChapters;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public MangaResponseDTO() {}

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
        this.createdAt = manga.getCreatedAt();
        this.updatedAt = manga.getUpdatedAt();
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

    public Manga.MangaStatus getStatus() { return status; }
    public void setStatus(Manga.MangaStatus status) { this.status = status; }

    public String getGenre() { return genre; }
    public void setGenre(String genre) { this.genre = genre; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getEngName() { return engName; }
    public void setEngName(String engName) { this.engName = engName; }

    public String getAlternativeNames() { return alternativeNames; }
    public void setAlternativeNames(String alternativeNames) { this.alternativeNames = alternativeNames; }

    public Manga.MangaType getType() { return type; }
    public void setType(Manga.MangaType type) { this.type = type; }

    public Integer getAgeLimit() { return ageLimit; }
    public void setAgeLimit(Integer ageLimit) { this.ageLimit = ageLimit; }

    public Boolean getIsLicensed() { return isLicensed; }
    public void setIsLicensed(Boolean isLicensed) { this.isLicensed = isLicensed; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public Integer getTotalChapters() { return totalChapters; }
    public void setTotalChapters(Integer totalChapters) { this.totalChapters = totalChapters; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
