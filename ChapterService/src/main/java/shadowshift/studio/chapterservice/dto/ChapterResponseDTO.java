package shadowshift.studio.chapterservice.dto;

import shadowshift.studio.chapterservice.entity.Chapter;
import java.time.LocalDateTime;

public class ChapterResponseDTO {

    private Long id;
    private Long mangaId;
    private Integer chapterNumber;
    private String title;
    private Integer pageCount;
    private LocalDateTime publishedDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public ChapterResponseDTO() {}

    public ChapterResponseDTO(Chapter chapter) {
        this.id = chapter.getId();
        this.mangaId = chapter.getMangaId();
        this.chapterNumber = chapter.getChapterNumber();
        this.title = chapter.getTitle();
        this.pageCount = chapter.getPageCount();
        this.publishedDate = chapter.getPublishedDate();
        this.createdAt = chapter.getCreatedAt();
        this.updatedAt = chapter.getUpdatedAt();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMangaId() { return mangaId; }
    public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

    public Integer getChapterNumber() { return chapterNumber; }
    public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }

    public LocalDateTime getPublishedDate() { return publishedDate; }
    public void setPublishedDate(LocalDateTime publishedDate) { this.publishedDate = publishedDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
