package com.example.recommendationservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "manga_metadata")
@Data
public class MangaMetadata {

    @Id
    @Column(name = "manga_id")
    private Long mangaId;

    @Column(name = "title")
    private String title;

    @Column(columnDefinition = "jsonb")
    private List<String> genres;

    @Column(columnDefinition = "jsonb")
    private List<String> tags;

    @Column(name = "average_rating")
    private Double averageRating;

    @Column(name = "views")
    private Long views;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
