package com.example.recommendationservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Builder
@Table(name = "user_preference_profiles")
@NoArgsConstructor
@AllArgsConstructor
// TODO Тут должно быть DTO
public class UserPreferenceProfile {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "genre_weights", columnDefinition = "jsonb")
    // TODO Понять в чем ошибка с мапой
    private Map<String, Double> genreWeights;

    @Column(name = "tag_weights", columnDefinition = "jsonb")
    private Map<String, Double> tagWeights;

    private Map<String, Double> genreFrequency;

    private Map<String, Double> tagFrequency;

    private Integer totalMangaCount;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }

}

