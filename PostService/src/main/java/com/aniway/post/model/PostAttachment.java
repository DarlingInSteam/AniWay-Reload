package com.aniway.post.model;

import jakarta.persistence.*;

@Entity
@Table(name = "post_attachments")
public class PostAttachment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private long sizeBytes;

    public Post getPost() { return post; }
    public void setPost(Post post) { this.post = post; }
    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }
}
