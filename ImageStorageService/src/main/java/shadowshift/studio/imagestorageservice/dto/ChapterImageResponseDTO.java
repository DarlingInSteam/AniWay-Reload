package shadowshift.studio.imagestorageservice.dto;

import shadowshift.studio.imagestorageservice.entity.ChapterImage;
import java.time.LocalDateTime;

public class ChapterImageResponseDTO {

    private Long id;
    private Long chapterId;
    private Integer pageNumber;
    private String imageUrl;
    private String imageKey;
    private Long fileSize;
    private String mimeType;
    private Integer width;
    private Integer height;
    private LocalDateTime createdAt;

    // Constructors
    public ChapterImageResponseDTO() {}

    public ChapterImageResponseDTO(ChapterImage image) {
        this.id = image.getId();
        this.chapterId = image.getChapterId();
        this.pageNumber = image.getPageNumber();
        this.imageUrl = image.getImageUrl();
        this.imageKey = image.getImageKey();
        this.fileSize = image.getFileSize();
        this.mimeType = image.getMimeType();
        this.width = image.getWidth();
        this.height = image.getHeight();
        this.createdAt = image.getCreatedAt();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getChapterId() { return chapterId; }
    public void setChapterId(Long chapterId) { this.chapterId = chapterId; }

    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getImageKey() { return imageKey; }
    public void setImageKey(String imageKey) { this.imageKey = imageKey; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public Integer getWidth() { return width; }
    public void setWidth(Integer width) { this.width = width; }

    public Integer getHeight() { return height; }
    public void setHeight(Integer height) { this.height = height; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
