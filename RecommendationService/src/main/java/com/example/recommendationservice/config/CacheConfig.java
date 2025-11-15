package com.example.recommendationservice.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        // Конфигурация для кеша метаданных манги
        cacheManager.registerCustomCache("mangaMetadata",
            Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofHours(1))
                .refreshAfterWrite(Duration.ofMinutes(30))
                .recordStats()
                .build());

        // Конфигурация для кеша пользовательских предпочтений
        cacheManager.registerCustomCache("userPreferences",
            Caffeine.newBuilder()
                .maximumSize(5_000)
                .expireAfterWrite(Duration.ofMinutes(30))
                .refreshAfterWrite(Duration.ofMinutes(15))
                .recordStats()
                .build());

        // Конфигурация для кеша похожих манг
        cacheManager.registerCustomCache("similarManga",
            Caffeine.newBuilder()
                .maximumSize(50_000)
                .expireAfterWrite(Duration.ofHours(2))
                .refreshAfterWrite(Duration.ofHours(1))
                .recordStats()
                .build());

        // Конфигурация для кеша рекомендаций пользователей
        cacheManager.registerCustomCache("userRecommendations",
            Caffeine.newBuilder()
                .maximumSize(1_000)
                .expireAfterWrite(Duration.ofMinutes(15))
                .recordStats()
                .build());

        // Дефолтный кеш для всех остальных случаев
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1_000)
            .expireAfterWrite(Duration.ofHours(1))
            .recordStats());

        return cacheManager;
    }
}
