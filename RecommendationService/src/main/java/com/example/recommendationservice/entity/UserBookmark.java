package com.example.recommendationservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_bookmarks")
@Data
public class UserBookmark {
    @Id
    @GeneratedValue
    private Long id;

    private Long userId;
    private Long mangaId;

    @Enumerated(EnumType.STRING)
    private BookmarkStatus status; // "READING", "PLANNED", "COMPLETED"

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Boolean isFavorite;
}
