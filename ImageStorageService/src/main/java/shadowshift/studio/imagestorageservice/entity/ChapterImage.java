package shadowshift.studio.imagestorageservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

@Entity
@Table(name = "chapter_image", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"chapter_id", "page_number"})
})
public class ChapterImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Chapter ID is required")
    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    @NotNull(message = "Page number is required")
    @Min(value = 1, message = "Page number must be positive")
    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @NotNull(message = "Image URL is required")
    @Size(max = 500, message = "Image URL must not exceed 500 characters")
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @NotNull(message = "Image key is required")
    @Size(max = 255, message = "Image key must not exceed 255 characters")
    @Column(name = "image_key", nullable = false)
    private String imageKey;

    @Column(name = "file_size")
    private Long fileSize;

    @Size(max = 100, message = "MIME type must not exceed 100 characters")
    @Column(name = "mime_type", length = 100)
    private String mimeType;

    private Integer width;
    private Integer height;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public ChapterImage() {}

    public ChapterImage(Long chapterId, Integer pageNumber, String imageUrl, String imageKey) {
        this.chapterId = chapterId;
        this.pageNumber = pageNumber;
        this.imageUrl = imageUrl;
        this.imageKey = imageKey;
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
