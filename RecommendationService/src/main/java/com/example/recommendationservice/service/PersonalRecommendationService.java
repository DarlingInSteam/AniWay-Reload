package com.example.recommendationservice.service;

import com.example.recommendationservice.dto.PersonalRecommendationDto;
import com.example.recommendationservice.dto.UserPreferenceProfileDto;
import com.example.recommendationservice.entity.MangaMetadata;
import com.example.recommendationservice.entity.UserBookmark;
import com.example.recommendationservice.entity.UserPreferenceProfile;
import com.example.recommendationservice.mapper.UserPreferenceProfileMapper;
import com.example.recommendationservice.repository.MangaMetadataRepository;
import com.example.recommendationservice.repository.UserPreferenceProfileRepository;
import com.example.recommendationservice.repository.UserBookmarkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;


@Slf4j
@RequiredArgsConstructor
@Service
public class PersonalRecommendationService {

    private final UserPreferenceProfileRepository profileRepository;
    private final MangaMetadataRepository mangaRepository;
    private final UserBookmarkRepository userBookmarkRepository;

    public PersonalRecommendationDto getPersonalRecommendations(Long userId, int limit, boolean excludeBookmarks) {

        // Шаг 1. Получаем или пересчитываем профиль пользователя
        UserPreferenceProfileDto userProfile = getUserPreferenceProfile(userId);

        // TODO: Добавить логику генерации рекомендаций на основе профиля

        return null; // Заглушка для следующих шагов
    }

    private UserPreferenceProfileDto getUserPreferenceProfile(Long userId) {
        // Проверяем, есть ли актуальный профиль
        Optional<UserPreferenceProfile> existingProfile =
                profileRepository.findByUserId(userId);

        if (existingProfile.isPresent() && isProfileActual(existingProfile.get())) {
            log.info("Using cached profile for userId: {}", userId);
            return UserPreferenceProfileMapper.toUserPreferenceProfileDto(existingProfile.get());
        }

        // Пересчитываем профиль на основе локальных данных
        log.info("Regenerating profile for userId: {}", userId);
        return regenerateUserProfile(userId);
    }

    private boolean isProfileActual(UserPreferenceProfile profile) {
        // Считаем профиль актуальным, если он обновлялся в течение последних 24 часов
        return profile.getLastUpdated() != null &&
                profile.getLastUpdated().isAfter(LocalDateTime.now().minusHours(24));
    }

    private UserPreferenceProfileDto regenerateUserProfile(Long userId) {
        // Получаем все закладки пользователя из локальной БД
        List<UserBookmark> userBookmarks = userBookmarkRepository.findByUserId(userId);

        if (userBookmarks.isEmpty()) {
            log.info("No bookmarks found for userId: {}, returning empty profile", userId);
            return new UserPreferenceProfileDto();
        }

        Map<String, Double> genreWeights = new HashMap<>();
        Map<String, Double> tagWeights = new HashMap<>();
        Map<String, Integer> genreFrequency = new HashMap<>();
        Map<String, Integer> tagFrequency = new HashMap<>();

        double totalWeight = 0.0;
        int totalManga = 0;

        // Подсчитываем веса и частоты жанров и тегов
        for (UserBookmark bookmark : userBookmarks) {
            Optional<MangaMetadata> mangaMetadataOpt = mangaRepository.findByMangaId(bookmark.getMangaId());
            if (mangaMetadataOpt.isEmpty()) {
                log.warn("Manga metadata not found for mangaId: {}", bookmark.getMangaId());
                continue;
            }

            MangaMetadata mangaMetadata = mangaMetadataOpt.get();
            totalManga++;

            double weight = switch (bookmark.getStatus()) {
                case COMPLETED -> 1.0;
                case READING -> 1.5;
                case PLAN_TO_READ -> 0.5;
                case DROPPED -> 0.1;
                case ON_HOLD -> 0.3;
                default -> 0.0;
            };

            totalWeight += weight;

            // Обрабатываем жанры
            for (String genre : mangaMetadata.getGenres()) {
                genreWeights.put(genre, genreWeights.getOrDefault(genre, 0.0) + weight);
                genreFrequency.put(genre, genreFrequency.getOrDefault(genre, 0) + 1);
            }

            // Обрабатываем теги
            for (String tag : mangaMetadata.getTags()) {
                tagWeights.put(tag, tagWeights.getOrDefault(tag, 0.0) + weight);
                tagFrequency.put(tag, tagFrequency.getOrDefault(tag, 0) + 1);
            }
        }

        // Нормализуем веса
        Map<String, Double> normalizedGenreWeights = normalizeWeights(genreWeights, totalWeight);
        Map<String, Double> normalizedTagWeights = normalizeWeights(tagWeights, totalWeight);

        // Вычисляем относительные частоты
        Map<String, Double> genreFrequencyRatio = calculateFrequencyRatio(genreFrequency, totalManga);
        Map<String, Double> tagFrequencyRatio = calculateFrequencyRatio(tagFrequency, totalManga);

        // Сохраняем профиль в БД
        UserPreferenceProfile savedEntity = saveUserProfile(userId, normalizedGenreWeights, normalizedTagWeights,
                genreFrequencyRatio, tagFrequencyRatio, totalManga);

        return UserPreferenceProfileMapper.toUserPreferenceProfileDto(savedEntity);
    }

    private Map<String, Double> normalizeWeights(Map<String, Double> weights, double totalWeight) {
        if (totalWeight == 0.0) return weights;

        Map<String, Double> normalized = new HashMap<>();
        for (Map.Entry<String, Double> entry : weights.entrySet()) {
            normalized.put(entry.getKey(), entry.getValue() / totalWeight);
        }
        return normalized;
    }

    private Map<String, Double> calculateFrequencyRatio(Map<String, Integer> frequency, int totalManga) {
        if (totalManga == 0) return new HashMap<>();

        Map<String, Double> ratio = new HashMap<>();
        for (Map.Entry<String, Integer> entry : frequency.entrySet()) {
            ratio.put(entry.getKey(), (double) entry.getValue() / totalManga);
        }
        return ratio;
    }

    private UserPreferenceProfile saveUserProfile(Long userId, Map<String, Double> genreWeights,
                                                Map<String, Double> tagWeights,
                                                Map<String, Double> genreFrequency,
                                                Map<String, Double> tagFrequency,
                                                int totalManga) {

        // Создаем DTO с новыми данными
        UserPreferenceProfileDto profileDto = UserPreferenceProfileDto.builder()
                .genreWeights(genreWeights)
                .tagWeights(tagWeights)
                .genreFrequency(genreFrequency)
                .tagFrequency(tagFrequency)
                .totalMangaCount(totalManga)
                .build();

        // Ищем существующий профиль или создаем новый через маппер
        UserPreferenceProfile profile = profileRepository.findByUserId(userId)
                .orElse(UserPreferenceProfileMapper.toUserPreferenceProfileEntity(profileDto, userId));

        // Если профиль существует, обновляем его данными из DTO
        if (profile.getLastUpdated() != null) {
            profile.setGenreWeights(genreWeights);
            profile.setTagWeights(tagWeights);
            profile.setGenreFrequency(genreFrequency);
            profile.setTagFrequency(tagFrequency);
            profile.setTotalMangaCount(totalManga);
        }

        profile.setLastUpdated(LocalDateTime.now());

        UserPreferenceProfile saved = profileRepository.save(profile);

        log.info("Saved profile for userId: {} with {} manga, {} genres, {} tags",
                userId, totalManga, genreWeights.size(), tagWeights.size());

        return saved;
    }
}
