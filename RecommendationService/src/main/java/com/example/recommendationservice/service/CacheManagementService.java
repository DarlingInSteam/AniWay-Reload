package com.example.recommendationservice.service;

import com.example.recommendationservice.dto.CacheInfo;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;


import java.util.Collection;
import java.util.List;
import java.util.Objects;

/**
 * Сервис для управления Caffeine кешем.
 * Предоставляет методы для мониторинга, очистки и управления кешем.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheManagementService {

    private final CacheManager cacheManager;

    /**
     * Получить информацию о всех кешах.
     */
    public List<CacheInfo> getAllCacheInfo() {
        Collection<String> cacheNames = cacheManager.getCacheNames();

        return cacheNames.stream()
                .map(this::getCacheInfo)
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * Получить информацию о конкретном кеше.
     */
    public CacheInfo getCacheInfo(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            return null;
        }

        try {
            // Получаем статистику из Caffeine кеша
            com.github.benmanes.caffeine.cache.Cache<Object, Object> nativeCache =
                (com.github.benmanes.caffeine.cache.Cache<Object, Object>) cache.getNativeCache();

            CacheStats stats = nativeCache.stats();

            return CacheInfo.builder()
                    .name(cacheName)
                    .estimatedSize(nativeCache.estimatedSize())
                    .hitCount(stats.hitCount())
                    .missCount(stats.missCount())
                    .hitRate(stats.hitRate())
                    .evictionCount(stats.evictionCount())
                    .loadCount(stats.loadCount())
                    .averageLoadTime(stats.averageLoadPenalty())
                    .build();

        } catch (Exception e) {
            log.warn("Failed to get cache statistics for cache: {}", cacheName, e);
            return CacheInfo.builder()
                    .name(cacheName)
                    .estimatedSize(-1L)
                    .hitCount(-1L)
                    .missCount(-1L)
                    .hitRate(-1.0)
                    .evictionCount(-1L)
                    .loadCount(-1L)
                    .averageLoadTime(-1.0)
                    .build();
        }
    }

    /**
     * Очистить конкретный кеш.
     */
    public void evictCache(String cacheName) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            log.info("Cleared cache: {}", cacheName);
        } else {
            log.warn("Cache not found: {}", cacheName);
        }
    }

    /**
     * Очистить все кеши.
     */
    @CacheEvict(allEntries = true, value = {"mangaMetadata", "userPreferences", "similarManga", "userRecommendations"})
    public void evictAllCaches() {
        cacheManager.getCacheNames().forEach(cacheName -> {
            Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        });
        log.info("Cleared all caches");
    }

    /**
     * Очистить кеш для конкретного пользователя.
     */
    public void evictUserCaches(Long userId) {
        // Очищаем кеш предпочтений пользователя
        Cache userPreferencesCache = cacheManager.getCache("userPreferences");
        if (userPreferencesCache != null) {
            userPreferencesCache.evict(userId);
        }

        // Очищаем кеш рекомендаций пользователя (нужно очистить все варианты ключей)
        Cache userRecommendationsCache = cacheManager.getCache("userRecommendations");
        if (userRecommendationsCache != null) {
            // К сожалению, Caffeine не поддерживает wildcard eviction
            // Поэтому очищаем весь кеш рекомендаций
            userRecommendationsCache.clear();
        }

        log.info("Evicted user caches for userId: {}", userId);
    }

    /**
     * Проверить, есть ли значение в кеше.
     */
    public boolean isCached(String cacheName, Object key) {
        Cache cache = cacheManager.getCache(cacheName);
        if (cache == null) {
            return false;
        }

        Cache.ValueWrapper valueWrapper = cache.get(key);
        return valueWrapper != null;
    }
}
