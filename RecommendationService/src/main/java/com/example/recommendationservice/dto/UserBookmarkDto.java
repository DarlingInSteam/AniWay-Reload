package com.example.recommendationservice.dto;

import com.example.recommendationservice.entity.BookmarkStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserBookmarkDto {
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
