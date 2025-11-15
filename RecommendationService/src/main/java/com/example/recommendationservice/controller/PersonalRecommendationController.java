package com.example.recommendationservice.controller;

import com.example.recommendationservice.dto.PersonalRecommendationDto;
import com.example.recommendationservice.dto.PersonalRecommendationResponse;
import com.example.recommendationservice.dto.UserPreferenceProfileDto;
import com.example.recommendationservice.mapper.PersonalRecommendationMapper;
import com.example.recommendationservice.service.PersonalRecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class PersonalRecommendationController {

    private final PersonalRecommendationService recommendationService;

    /**
     * Контроллер для получения персональных рекомендаций пользователя.
     * @param authentication      информация об аутентификации пользователя
     * @param limit               максимальное количество рекомендаций для возврата (по умолчанию 20)
     * @param excludeBookmarks  флаг для исключения уже добавленных в закладки элементов (по умолчанию true)
    */
    @GetMapping("/personal")
    public ResponseEntity<PersonalRecommendationResponse> getPersonalRecommendations(
            Authentication authentication,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "true") boolean excludeBookmarks) {

        Long userId = Long.parseLong(authentication.getName());

        PersonalRecommendationResponse response = recommendationService
                .getPersonalRecommendations(userId, limit, excludeBookmarks);

        return ResponseEntity.ok(response);
    }

    /**
     * Контроллер для получения профиля предпочтений пользователя.
     * @param authentication информация об аутентификации пользователя
     */
    @GetMapping("/profile")
    public ResponseEntity<UserPreferenceProfileDto> getUserProfile(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());

        UserPreferenceProfileDto profileDto = recommendationService.getUserPreferenceProfile(userId);
        return ResponseEntity.ok(profileDto);
    }

    /**
     * Контроллер для регенерации профиля предпочтений пользователя.
     * @param authentication информация об аутентификации пользователя
     */
    @PostMapping("/profile/regenerate")
    public ResponseEntity<UserPreferenceProfileDto> regenerateUserProfile(Authentication authentication) {
        Long userId = Long.parseLong(authentication.getName());

        UserPreferenceProfileDto response = recommendationService.regenerateUserProfile(userId);

        return ResponseEntity.ok(response);
    }
}
