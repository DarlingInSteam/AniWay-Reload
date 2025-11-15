package com.example.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalRecommendationDto {
    private Long mangaId;
    private String title;
    private String coverUrl;
    private Double score;
    private List<String> matchReasons;
    private Double rating;
    private Long views;
}