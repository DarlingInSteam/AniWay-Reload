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
    private Integer chapterNumber;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private LocalDateTime publishedDate;

    // Constructors
    public ChapterCreateDTO() {}

    public ChapterCreateDTO(Long mangaId, Integer chapterNumber, String title) {
        this.mangaId = mangaId;
        this.chapterNumber = chapterNumber;
        this.title = title;
    }

    // Getters and Setters
    public Long getMangaId() { return mangaId; }
    public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

    public Integer getChapterNumber() { return chapterNumber; }
    public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDateTime getPublishedDate() { return publishedDate; }
    public void setPublishedDate(LocalDateTime publishedDate) { this.publishedDate = publishedDate; }
}
