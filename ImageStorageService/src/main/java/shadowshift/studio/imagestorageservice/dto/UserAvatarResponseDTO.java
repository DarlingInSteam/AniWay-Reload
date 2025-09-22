package shadowshift.studio.imagestorageservice.dto;

import shadowshift.studio.imagestorageservice.entity.UserAvatar;
import java.time.LocalDateTime;

public class UserAvatarResponseDTO {
    private Long userId;
    private String url;
    private Integer width;
    private Integer height;
    private LocalDateTime uploadedAt;

    public UserAvatarResponseDTO(UserAvatar avatar) {
        this.userId = avatar.getUserId();
        this.url = avatar.getImageUrl();
        this.width = avatar.getWidth();
        this.height = avatar.getHeight();
        this.uploadedAt = avatar.getUpdatedAt();
    }

    public Long getUserId() { return userId; }
    public String getUrl() { return url; }
    public Integer getWidth() { return width; }
    public Integer getHeight() { return height; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
}
