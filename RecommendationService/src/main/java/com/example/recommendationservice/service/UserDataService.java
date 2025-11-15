package com.example.recommendationservice.service;

import com.example.recommendationservice.dto.UserBookmarkDto;
import com.example.recommendationservice.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.ArrayList;

/**
 * Сервис для получения данных пользователей через Gateway.
 * Обращается к AuthService для получения закладок пользователей.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserDataService {

    private final RestTemplate restTemplate;
    private final AppProperties appProperties;

    /**
     * Получить закладки пользователя через Gateway с кешированием.
     * Данные кешируются на 30 минут для снижения нагрузки на AuthService.
     */
    @Cacheable(value = "userPreferences", key = "'bookmarks_' + #userId")
    public List<UserBookmarkDto> getUserBookmarks(Long userId) {
        try {
            log.debug("Fetching user bookmarks from AuthService via Gateway for userId: {}", userId);
            
            // Формируем URL через Gateway к AuthService
            String gatewayUrl = appProperties.getGateway().getUrl();
            String authBasePath = appProperties.getServices().getAuth().getBasePath();
            String url = gatewayUrl + authBasePath + "/bookmarks/user/" + userId;
            
            log.debug("Requesting user bookmarks from URL: {}", url);
            
            // Используем ParameterizedTypeReference для корректной десериализации List<UserBookmarkDto>
            ResponseEntity<List<UserBookmarkDto>> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<UserBookmarkDto>>() {}
            );
            
            List<UserBookmarkDto> bookmarks = response.getBody();
            if (bookmarks != null) {
                log.debug("Successfully fetched {} bookmarks for userId: {}", bookmarks.size(), userId);
                return bookmarks;
            } else {
                log.warn("No bookmarks found for userId: {}", userId);
                return new ArrayList<>();
            }
            
        } catch (RestClientException e) {
            log.error("Error fetching user bookmarks for userId: {} - {}", userId, e.getMessage());
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("Unexpected error fetching user bookmarks for userId: {}", userId, e);
            return new ArrayList<>();
        }
    }

    /**
     * Получить закладки нескольких пользователей.
     * Используется для пакетной обработки.
     */
    public List<UserBookmarkDto> getUserBookmarksBatch(List<Long> userIds) {
        log.debug("Fetching bookmarks for {} users", userIds.size());
        
        List<UserBookmarkDto> allBookmarks = new ArrayList<>();
        for (Long userId : userIds) {
            try {
                List<UserBookmarkDto> userBookmarks = getUserBookmarks(userId);
                allBookmarks.addAll(userBookmarks);
            } catch (Exception e) {
                log.warn("Failed to fetch bookmarks for userId: {}", userId, e);
            }
        }
        
        return allBookmarks;
    }

    /**
     * Проверить существование пользователя через Gateway.
     */
    @Cacheable(value = "userPreferences", key = "'exists_' + #userId")
    public boolean userExists(Long userId) {
        try {
            log.debug("Checking if user exists via Gateway for userId: {}", userId);
            
            String gatewayUrl = appProperties.getGateway().getUrl();
            String authBasePath = appProperties.getServices().getAuth().getBasePath();
            String url = gatewayUrl + authBasePath + "/users/" + userId + "/exists";
            
            ResponseEntity<Boolean> response = restTemplate.getForEntity(url, Boolean.class);
            boolean exists = response.getBody() != null ? response.getBody() : false;
            
            log.debug("User {} exists: {}", userId, exists);
            return exists;
            
        } catch (RestClientException e) {
            log.error("Error checking user existence for userId: {} - {}", userId, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Unexpected error checking user existence for userId: {}", userId, e);
            return false;
        }
    }

    /**
     * Очистить кеш пользователя.
     */
    public void evictUserCache(Long userId) {
        // Кеш будет очищен через CacheManagementService
        log.debug("User cache eviction requested for userId: {}", userId);
    }
}