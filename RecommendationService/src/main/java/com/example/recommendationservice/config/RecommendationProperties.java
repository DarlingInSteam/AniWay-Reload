package com.example.recommendationservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.Map;

@Data
@Component
@ConfigurationProperties(prefix = "recommendation")
public class RecommendationProperties {
    private Map<String, Double> bookmarkWeights;

    public double getBookmarkWeight(String status) {
        return bookmarkWeights.getOrDefault(status, bookmarkWeights.getOrDefault("default", 0.0));
    }
}
