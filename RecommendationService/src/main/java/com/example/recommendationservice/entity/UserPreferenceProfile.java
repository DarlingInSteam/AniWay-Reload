package com.example.recommendationservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Entity
@Builder
@Table(name = "user_preference_profiles")
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceProfile {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "genre_weights", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Double> genreWeights;

    @Column(name = "tag_weights", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Double> tagWeights;

    @Column(name = "genre_frequency", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Double> genreFrequency;

    @Column(name = "tag_frequency", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Double> tagFrequency;

    @Column(name = "total_manga_count")
    private Integer totalMangaCount;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
