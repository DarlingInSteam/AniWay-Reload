package com.aniway.post.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts")
public class Post extends BaseEntity {
    @Column(nullable = false)
    private Long authorId;

    @Column(nullable = false, length = 5000)
    private String content;

    @Column(nullable = false)
    private Instant editedUntil;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostReference> references = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostVote> votes = new ArrayList<>();

    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Instant getEditedUntil() { return editedUntil; }
    public void setEditedUntil(Instant editedUntil) { this.editedUntil = editedUntil; }
    public List<PostAttachment> getAttachments() { return attachments; }
    public List<PostReference> getReferences() { return references; }
    public List<PostVote> getVotes() { return votes; }
}
