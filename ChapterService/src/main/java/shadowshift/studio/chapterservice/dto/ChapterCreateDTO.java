package shadowshift.studio.chapterservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class ChapterCreateDTO {

    @NotNull(message = "Manga ID is required")
    private Long mangaId;

    @NotNull(message = "Chapter number is required")
    @Min(value = 1, message = "Chapter number must be positive")
    private Double chapterNumber;

    private Integer volumeNumber;

    private Double originalChapterNumber;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private LocalDateTime publishedDate;

    // Constructors
    public ChapterCreateDTO() {}

    public ChapterCreateDTO(Long mangaId, Double chapterNumber, String title) {
        this.mangaId = mangaId;
        this.chapterNumber = chapterNumber;
        this.title = title;
    }

    // Getters and Setters
    public Long getMangaId() { return mangaId; }
    public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

    public Double getChapterNumber() { return chapterNumber; }
    public void setChapterNumber(Double chapterNumber) { this.chapterNumber = chapterNumber; }

    public Integer getVolumeNumber() { return volumeNumber; }
    public void setVolumeNumber(Integer volumeNumber) { this.volumeNumber = volumeNumber; }

    public Double getOriginalChapterNumber() { return originalChapterNumber; }
    public void setOriginalChapterNumber(Double originalChapterNumber) { this.originalChapterNumber = originalChapterNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDateTime getPublishedDate() { return publishedDate; }
    public void setPublishedDate(LocalDateTime publishedDate) { this.publishedDate = publishedDate; }
}
