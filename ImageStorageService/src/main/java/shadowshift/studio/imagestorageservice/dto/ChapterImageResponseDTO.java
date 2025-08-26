package shadowshift.studio.imagestorageservice.dto;

import shadowshift.studio.imagestorageservice.entity.ChapterImage;
import java.time.LocalDateTime;

public class ChapterImageResponseDTO {

    private Long id;
    private Long mangaId;
    private Long chapterId;
    private Integer pageNumber;
    private String imageUrl;
    private String imageKey;
    private Long fileSize;
    private String mimeType;
    private Integer width;
    private Integer height;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Конструкторы
    public ChapterImageResponseDTO() {}

    public ChapterImageResponseDTO(ChapterImage chapterImage) {
        this.id = chapterImage.getId();
        this.mangaId = chapterImage.getMangaId();
        this.chapterId = chapterImage.getChapterId();
        this.pageNumber = chapterImage.getPageNumber();
        this.imageUrl = chapterImage.getImageUrl();
        this.imageKey = chapterImage.getImageKey();
        this.fileSize = chapterImage.getFileSize();
        this.mimeType = chapterImage.getMimeType();
        this.width = chapterImage.getWidth();
        this.height = chapterImage.getHeight();
        this.createdAt = chapterImage.getCreatedAt();
        this.updatedAt = chapterImage.getUpdatedAt();
    }

    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMangaId() {
        return mangaId;
    }

    public void setMangaId(Long mangaId) {
        this.mangaId = mangaId;
    }

    public Long getChapterId() {
        return chapterId;
    }

    public void setChapterId(Long chapterId) {
        this.chapterId = chapterId;
    }

    public Integer getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getImageKey() {
        return imageKey;
    }

    public void setImageKey(String imageKey) {
        this.imageKey = imageKey;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
