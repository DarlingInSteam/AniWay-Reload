package com.aniway.post.model;

import jakarta.persistence.*;

@Entity
@Table(name = "post_votes", uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "user_id"}))
public class PostVote extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private int value; // -1, 0, 1

    public Post getPost() { return post; }
    public void setPost(Post post) { this.post = post; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public int getValue() { return value; }
    public void setValue(int value) { this.value = value; }
}
