package com.example.recommendationservice.controller;

import com.example.recommendationservice.dto.PersonalRecommendationDto;
import com.example.recommendationservice.dto.PersonalRecommendationResponse;
import com.example.recommendationservice.dto.UserPreferenceProfileResponse;
import com.example.recommendationservice.entity.UserPreferenceProfile;
import com.example.recommendationservice.service.PersonalRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST контроллер для управления персональными рекомендациями манги.
 * Предоставляет API endpoints для получения рекомендаций на основе анализа закладок и предпочтений пользователя.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/personalized")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PersonalRecommendationController {

    private final PersonalRecommendationService personalRecommendationService;

    /**
     * Получить персональные рекомендации манги для пользователя на основе его закладок и предпочтений.
     *
     * @param userId идентификатор пользователя
     * @param limit количество рекомендаций (по умолчанию 20)
     * @param excludeBookmarks исключить содержащееся в закладках пользователя (по умолчанию true)
     * @return ResponseEntity с персональными рекомендациями
     */
    @GetMapping("/{userId}")
    public ResponseEntity<PersonalRecommendationResponse> getPersonalRecommendations(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "true") boolean excludeBookmarks) {
        try {
            PersonalRecommendationResponse response = personalRecommendationService
                    // TODO Тут надо через mapper перевести в PersonalRecommendationResponse
                    .getPersonalRecommendations(userId, limit, excludeBookmarks);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching personal recommendations for user ID {}: {}", userId, e.getMessage());
            throw e;
        }
    }

    /**
     * Получить анализ профиля предпочтений пользователя.
     *
     * @param userId идентификатор пользователя
     * @return ResponseEntity с анализом предпочтений пользователя
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserPreferenceProfileResponse> getUserPreferenceProfile(
            @PathVariable Long userId) {
        try {
            // TODO Тут должен быть mapper в UserPreferenceProfileResponse
            var profile = personalRecommendationService.getUserPreferenceProfile(userId);
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            log.error("Error fetching user preference profile for user ID {}: {}", userId, e.getMessage());
            throw e;
        }
    }

    /**
     * Обновить профиль предпочтений пользователя на основе его текущих закладок.
     *
     * @param userId идентификатор пользователя
     * @return ResponseEntity с результатом обновления профиля
     */
    // TODO создать метод в сервисе и реализовать логику обновления профиля
    @PostMapping("/{userId}/refresh")
    public ResponseEntity<?> refreshUserProfile(
            @PathVariable Long userId) {
        try {
            personalRecommendationService.refreshUserProfile(userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error refreshing user profile for user ID {}: {}", userId, e.getMessage());
            throw e;
        }
    }
}
