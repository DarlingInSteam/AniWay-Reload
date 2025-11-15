package com.example.recommendationservice.controller;

import com.example.recommendationservice.dto.CacheInfo;
import com.example.recommendationservice.service.CacheManagementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST контроллер для управления Caffeine кешем.
 */
@Slf4j
@RestController
@RequestMapping("/api/cache")
@RequiredArgsConstructor
public class CacheController {

    private final CacheManagementService cacheManagementService;

    /**
     * Получить информацию о всех кешах.
     */
    @GetMapping("/info")
    public ResponseEntity<List<CacheInfo>> getAllCacheInfo() {
        List<CacheInfo> cacheInfos = cacheManagementService.getAllCacheInfo();
        return ResponseEntity.ok(cacheInfos);
    }

    /**
     * Получить информацию о конкретном кеше.
     */
    @GetMapping("/info/{cacheName}")
    public ResponseEntity<CacheInfo> getCacheInfo(@PathVariable String cacheName) {
        CacheInfo cacheInfo = cacheManagementService.getCacheInfo(cacheName);
        if (cacheInfo == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(cacheInfo);
    }

    /**
     * Очистить конкретный кеш.
     */
    @DeleteMapping("/{cacheName}")
    public ResponseEntity<Void> evictCache(@PathVariable String cacheName) {
        cacheManagementService.evictCache(cacheName);
        log.info("Cache '{}' evicted via API", cacheName);
        return ResponseEntity.ok().build();
    }

    /**
     * Очистить все кеши.
     */
    @DeleteMapping("/all")
    public ResponseEntity<Void> evictAllCaches() {
        cacheManagementService.evictAllCaches();
        log.info("All caches evicted via API");
        return ResponseEntity.ok().build();
    }

    /**
     * Очистить кеш для конкретного пользователя.
     */
    @DeleteMapping("/user/{userId}")
    public ResponseEntity<Void> evictUserCaches(@PathVariable Long userId) {
        cacheManagementService.evictUserCaches(userId);
        log.info("User caches evicted for userId: {} via API", userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Проверить, есть ли значение в кеше.
     */
    @GetMapping("/{cacheName}/exists/{key}")
    public ResponseEntity<Boolean> isCached(@PathVariable String cacheName, @PathVariable String key) {
        boolean exists = cacheManagementService.isCached(cacheName, key);
        return ResponseEntity.ok(exists);
    }
}
