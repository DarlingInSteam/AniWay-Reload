package shadowshift.studio.chapterservice.dto;

import shadowshift.studio.chapterservice.entity.Chapter;
import java.time.LocalDateTime;

public class ChapterResponseDTO {

    private Long id;
    private Long mangaId;
    private Double chapterNumber;
    private Integer volumeNumber;
    private Double originalChapterNumber;
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
        this.volumeNumber = chapter.getVolumeNumber();
        this.originalChapterNumber = chapter.getOriginalChapterNumber();
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

    public Double getChapterNumber() { return chapterNumber; }
    public void setChapterNumber(Double chapterNumber) { this.chapterNumber = chapterNumber; }

    public Integer getVolumeNumber() { return volumeNumber; }
    public void setVolumeNumber(Integer volumeNumber) { this.volumeNumber = volumeNumber; }

    public Double getOriginalChapterNumber() { return originalChapterNumber; }
    public void setOriginalChapterNumber(Double originalChapterNumber) { this.originalChapterNumber = originalChapterNumber; }

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
