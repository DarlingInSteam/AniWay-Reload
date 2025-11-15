package com.example.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalRecommendationResponse {
    private Long userId;
    private List<PersonalRecommendationDto> recommendations;
    private Instant generatedAt;
}