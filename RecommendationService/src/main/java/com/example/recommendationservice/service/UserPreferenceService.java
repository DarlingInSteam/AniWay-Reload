package com.example.recommendationservice.service;

import com.example.recommendationservice.repository.UserPreferenceProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPreferenceService {

    private final UserPreferenceProfileRepository profileRepository;

    @Transactional
    public void invalidateUserProfile(Long userId) {
        profileRepository.findByUserId(userId).ifPresent(profile -> {
            profile.setLastUpdated(null); // Помечаем профиль как устаревший
            profileRepository.save(profile);
            log.info("Invalidated user profile for userId: {}", userId);
        });
    }
}