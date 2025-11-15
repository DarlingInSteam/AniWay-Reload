package com.example.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * DTO для профиля предпочтений пользователя.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceProfileDto {

    /**
     * Предпочтения по жанрам (жанр -> вес предпочтения)
     */
    @Builder.Default
    private Map<String, Double> genreWeights = new HashMap<>();

    /**
     * Предпочтения по тегам (тег -> вес предпочтения)
     */
    @Builder.Default
    private Map<String, Double> tagWeights = new HashMap<>();

    @Builder.Default
    private Map<String, Double> genreFrequency = new HashMap<>();

    @Builder.Default
    private Map<String, Double> tagFrequency = new HashMap<>();

    @Builder.Default
    private Integer totalMangaCount = 0;

    private Instant lastUpdated;

}
