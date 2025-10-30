package shadowshift.studio.momentservice.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "manga_moments")
public class Moment extends BaseEntity {

    @Column(name = "manga_id", nullable = false)
    private Long mangaId;

    @Column(name = "chapter_id")
    private Long chapterId;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "uploader_id", nullable = false)
    private Long uploaderId;

    @Column(name = "image_url", nullable = false, length = 1024)
    private String imageUrl;

    @Column(name = "image_key", nullable = false, length = 512)
    private String imageKey;

    @Column(name = "image_width", nullable = false)
    private Integer imageWidth;

    @Column(name = "image_height", nullable = false)
    private Integer imageHeight;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "caption", nullable = false, length = 280)
    private String caption;

    @Column(name = "is_spoiler", nullable = false)
    private boolean spoiler;

    @Column(name = "is_nsfw", nullable = false)
    private boolean nsfw;

    @Column(name = "is_hidden", nullable = false)
    private boolean hidden;

    @Column(name = "hidden_by")
    private Long hiddenBy;

    @Column(name = "hidden_reason", length = 512)
    private String hiddenReason;

    @Column(name = "is_reported", nullable = false)
    private boolean reported;

    @Column(name = "likes_count", nullable = false)
    private int likesCount;

    @Column(name = "likes_count_7d", nullable = false)
    private int likesCount7d;

    @Column(name = "dislikes_count", nullable = false)
    private int dislikesCount;

    @Column(name = "comments_count", nullable = false)
    private int commentsCount;

    @Column(name = "comments_count_7d", nullable = false)
    private int commentsCount7d;

    @Column(name = "last_activity_at", nullable = false)
    private Instant lastActivityAt;

    @OneToMany(mappedBy = "moment", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<MomentReaction> reactions = new ArrayList<>();

    @PrePersist
    protected void onPersist() {
        if (lastActivityAt == null) {
            lastActivityAt = Instant.now();
        }
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

    public Long getUploaderId() {
        return uploaderId;
    }

    public void setUploaderId(Long uploaderId) {
        this.uploaderId = uploaderId;
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

    public Integer getImageWidth() {
        return imageWidth;
    }

    public void setImageWidth(Integer imageWidth) {
        this.imageWidth = imageWidth;
    }

    public Integer getImageHeight() {
        return imageHeight;
    }

    public void setImageHeight(Integer imageHeight) {
        this.imageHeight = imageHeight;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public boolean isSpoiler() {
        return spoiler;
    }

    public void setSpoiler(boolean spoiler) {
        this.spoiler = spoiler;
    }

    public boolean isNsfw() {
        return nsfw;
    }

    public void setNsfw(boolean nsfw) {
        this.nsfw = nsfw;
    }

    public boolean isHidden() {
        return hidden;
    }

    public void setHidden(boolean hidden) {
        this.hidden = hidden;
    }

    public Long getHiddenBy() {
        return hiddenBy;
    }

    public void setHiddenBy(Long hiddenBy) {
        this.hiddenBy = hiddenBy;
    }

    public String getHiddenReason() {
        return hiddenReason;
    }

    public void setHiddenReason(String hiddenReason) {
        this.hiddenReason = hiddenReason;
    }

    public boolean isReported() {
        return reported;
    }

    public void setReported(boolean reported) {
        this.reported = reported;
    }

    public int getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(int likesCount) {
        this.likesCount = likesCount;
    }

    public int getLikesCount7d() {
        return likesCount7d;
    }

    public void setLikesCount7d(int likesCount7d) {
        this.likesCount7d = likesCount7d;
    }

    public int getDislikesCount() {
        return dislikesCount;
    }

    public void setDislikesCount(int dislikesCount) {
        this.dislikesCount = dislikesCount;
    }

    public int getCommentsCount() {
        return commentsCount;
    }

    public void setCommentsCount(int commentsCount) {
        this.commentsCount = commentsCount;
    }

    public int getCommentsCount7d() {
        return commentsCount7d;
    }

    public void setCommentsCount7d(int commentsCount7d) {
        this.commentsCount7d = commentsCount7d;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public List<MomentReaction> getReactions() {
        return reactions;
    }

    public void setReactions(List<MomentReaction> reactions) {
        this.reactions = reactions;
    }
}
