package com.aniway.post.model;

import jakarta.persistence.*;

@Entity
@Table(name = "post_references")
public class PostReference extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(nullable = false)
    private String type; // e.g. "MANGA"

    @Column(nullable = false)
    private Long refId; // referenced entity id

    public Post getPost() { return post; }
    public void setPost(Post post) { this.post = post; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Long getRefId() { return refId; }
    public void setRefId(Long refId) { this.refId = refId; }
}
