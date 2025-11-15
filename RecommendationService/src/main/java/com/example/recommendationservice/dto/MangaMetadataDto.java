package com.example.recommendationservice.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class MangaMetadataDto {
    private Long mangaId;
    private String title;
    private List<String> genres;
    private List<String> tags;
    private String coverUrl;
    private Double averageRating;
    private Long views;
    private LocalDateTime updatedAt;
}
