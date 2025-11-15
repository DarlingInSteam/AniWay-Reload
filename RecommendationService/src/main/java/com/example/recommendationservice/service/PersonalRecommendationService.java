package com.example.recommendationservice.service;

import com.example.recommendationservice.dto.*;
import com.example.recommendationservice.entity.MangaMetadata;
import com.example.recommendationservice.entity.UserPreferenceProfile;
import com.example.recommendationservice.mapper.PersonalRecommendationMapper;
import com.example.recommendationservice.mapper.UserPreferenceProfileMapper;
import com.example.recommendationservice.repository.MangaMetadataRepository;
import com.example.recommendationservice.repository.UserPreferenceProfileRepository;
import com.example.recommendationservice.config.RecommendationProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Сервис для генерации персональных рекомендаций на основе профиля пользователя
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class PersonalRecommendationService {

    private final UserPreferenceProfileRepository profileRepository;
    private final MangaMetadataRepository mangaRepository;
    private final MangaDataService mangaDataService;
    private final UserDataService userDataService;
    private final RecommendationProperties recommendationProperties;

    /**
     * Получает персональные рекомендации для пользователя
     _
     * @param userId - ID пользователя
     * @param limit - максимальное количество рекомендаций для возврата (по умолчанию 20)
     * @param excludeBookmarks - флаг для исключения уже добавленных в закладки элементов (по умолчанию true)
     * @return - список персональных рекомендаций
     */
    @Cacheable(value = "userRecommendations", key = "#userId + '_' + #limit + '_' + #excludeBookmarks")
    public PersonalRecommendationResponse getPersonalRecommendations(Long userId, int limit, boolean excludeBookmarks) {

        // Шаг 1. Получаем профиль пользователя
        Optional<UserPreferenceProfile> existingProfile = profileRepository.findByUserId(userId);

        UserPreferenceProfileDto profile;
        if (existingProfile.isPresent() && isProfileActual(existingProfile.get())) {
            log.info("Using existing profile for userId: {}", userId);
            profile = UserPreferenceProfileMapper.toDto(existingProfile.get());
        } else {
            log.info("Regenerating profile for userId: {}", userId);
            profile = regenerateUserProfile(userId);
        }

        // Здесь должна быть логика поиска рекомендаций на основе профиля
        List<PersonalRecommendationDto> recommendations = generateRecommendations(profile, userId, limit, excludeBookmarks);


        return PersonalRecommendationMapper.toResponseList(recommendations, userId);
    }

    /**
     * Получает профиль предпочтений пользователя, регенерируя его при необходимости
     */
    @Cacheable(value = "userPreferences", key = "#userId")
    public UserPreferenceProfileDto getUserPreferenceProfile(Long userId) {
        Optional<UserPreferenceProfile> existingProfile = profileRepository.findByUserId(userId);

        if (existingProfile.isPresent() && isProfileActual(existingProfile.get())) {
            return UserPreferenceProfileMapper.toDto(existingProfile.get());
        }

        return regenerateUserProfile(userId);
    }

    /**
     * Проверяет, является ли профиль пользователя актуальным
     * @param profile - параметр, хранящий пользовательские предпочтения
     * @return - true, если профиль актуален, иначе false
     */
    private boolean isProfileActual(UserPreferenceProfile profile) {
        // Считаем профиль актуальным, если он обновлялся в течение последних 24 часов
        return profile.getLastUpdated() != null &&
                profile.getLastUpdated().isAfter(LocalDateTime.now().minusHours(24));
    }

    /**
     * Регенерирует профиль предпочтений пользователя на основе его закладок
     */
    public UserPreferenceProfileDto regenerateUserProfile(Long userId) {
        // Получаем закладки пользователя через Gateway (AuthService)
        List<UserBookmarkDto> userBookmarkDtos = userDataService.getUserBookmarks(userId);
        if (userBookmarkDtos.isEmpty()) {
            log.info("No bookmarks found for userId: {}, returning empty profile", userId);
            return createEmptyProfile();
        }

        Map<String, Double> genreWeights = new HashMap<>();
        Map<String, Double> tagWeights = new HashMap<>();
        Map<String, Integer> genreFrequency = new HashMap<>();
        Map<String, Integer> tagFrequency = new HashMap<>();

        double totalWeight = 0.0;
        int totalManga = 0;
        int skippedManga = 0;

        for (UserBookmarkDto bookmark : userBookmarkDtos) {
            // Проверяем, что манга существует в нашей системе рекомендаций
            Optional<MangaMetadata> mangaMetadataOpt = mangaRepository.findByMangaId(bookmark.getMangaId());
            if (mangaMetadataOpt.isEmpty()) {
                log.warn("Manga metadata reference not found for mangaId: {}", bookmark.getMangaId());
                skippedManga++;
                continue;
            }

            // Получаем полные данные манги из кеша или MangaService через Gateway
            MangaMetadataDto fullMangaData = mangaDataService.getBasicMangaInfo(bookmark.getMangaId());
            if (fullMangaData == null) {
                log.warn("Full manga data not found for mangaId: {}", bookmark.getMangaId());
                skippedManga++;
                continue;
            }

            totalManga++;

            // Получаем вес из конфигурации на основе статуса закладки
            double weight = recommendationProperties.getBookmarkWeight(bookmark.getStatus().name());
            totalWeight += weight;

            // Обрабатываем жанры
            if (fullMangaData.getGenres() != null) {
                for (String genre : fullMangaData.getGenres()) {
                    genreWeights.put(genre, genreWeights.getOrDefault(genre, 0.0) + weight);
                    genreFrequency.put(genre, genreFrequency.getOrDefault(genre, 0) + 1);
                }
            }

            // Обрабатываем теги
            if (fullMangaData.getTags() != null) {
                for (String tag : fullMangaData.getTags()) {
                    tagWeights.put(tag, tagWeights.getOrDefault(tag, 0.0) + weight);
                    tagFrequency.put(tag, tagFrequency.getOrDefault(tag, 0) + 1);
                }
            }
        }

        if (skippedManga > 0) {
            log.warn("Skipped {} manga entries due to missing data for userId: {}", skippedManga, userId);
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

        log.info("Generated profile for userId: {} with {} processed manga, {} genres, {} tags",
                userId, totalManga, normalizedGenreWeights.size(), normalizedTagWeights.size());

        return UserPreferenceProfileMapper.toDto(savedEntity);
    }

    /**
     * Нормализует веса, деля каждый вес на общую сумму весов
     * @param weights - карта жанров/тегов и их весов
     * @param totalWeight - общая сумма весов
     * @return - нормализованная карта весов
     */
    private Map<String, Double> normalizeWeights(Map<String, Double> weights, double totalWeight) {
        if (totalWeight == 0.0) return weights;

        Map<String, Double> normalized = new HashMap<>();
        for (Map.Entry<String, Double> entry : weights.entrySet()) {
            normalized.put(entry.getKey(), entry.getValue() / totalWeight);
        }
        return normalized;
    }

    /**
     * Вычисляет относительную частоту появления каждого жанра/тега
     * @param frequency - карта жанров/тегов и их частот
     * @param totalManga - общее количество манги в профиле пользователя
     * @return - карта жанров/тегов и их относительных частот
     */
    private Map<String, Double> calculateFrequencyRatio(Map<String, Integer> frequency, int totalManga) {
        if (totalManga == 0) return new HashMap<>();

        Map<String, Double> ratio = new HashMap<>();
        for (Map.Entry<String, Integer> entry : frequency.entrySet()) {
            ratio.put(entry.getKey(), (double) entry.getValue() / totalManga);
        }
        return ratio;
    }

    /**
     * Сохраняет или обновляет профиль пользователя в базе данных
     */
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
                .orElse(UserPreferenceProfileMapper.toEntity(profileDto, userId));

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

    /**
     * Создает пустой профиль пользователя
     */
    private UserPreferenceProfileDto createEmptyProfile() {
        return UserPreferenceProfileDto.builder()
                .genreWeights(new HashMap<>())
                .tagWeights(new HashMap<>())
                .genreFrequency(new HashMap<>())
                .tagFrequency(new HashMap<>())
                .totalMangaCount(0)
                .build();


    }

    /**
     * Генерирует персональные рекомендации на основе профиля пользователя
     * @param profile профиль предпочтений пользователя
     * @param userId ID пользователя
     * @param limit максимальное количество рекомендаций для возврата
     * @param excludeBookmarks флаг для исключения уже добавленных в закладки элементов
     * @return - список персональных рекомендаций
     */
    private List<PersonalRecommendationDto> generateRecommendations(
            UserPreferenceProfileDto profile, Long userId, int limit, boolean excludeBookmarks) {

        log.info("Generating recommendations for userId: {} with limit: {}", userId, limit);

        // Если профиль пустой, возвращаем популярные манги
        if (profile.getTotalMangaCount() == 0) {
            log.info("Empty profile for userId: {}, returning popular manga", userId);
            return getPopularMangaRecommendations(limit);
        }

        // Получаем все доступные манги для рекомендаций
        List<Long> candidateMangaIds = getAllCandidateMangaIds();

        // Исключаем уже прочитанные манги пользователя
        Set<Long> userBookmarkedManga = getUserBookmarkedManga(userId, excludeBookmarks);
        candidateMangaIds.removeIf(userBookmarkedManga::contains);

        if (candidateMangaIds.isEmpty()) {
            log.warn("No candidate manga found for userId: {}", userId);
            return new ArrayList<>();
        }

        // Рассчитываем скоринг для каждой манги-кандидата
        List<ScoredManga> scoredMangas = new ArrayList<>();

        for (Long mangaId : candidateMangaIds) {
            try {
                MangaMetadataDto mangaData = mangaDataService.getBasicMangaInfo(mangaId);
                if (mangaData != null) {
                    double score = calculateMangaScore(mangaData, profile);
                    if (score > 0.0) { // Исключаем манги с нулевым скорингом
                        scoredMangas.add(new ScoredManga(mangaData, score));
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to process manga {} for recommendations: {}", mangaId, e.getMessage());
            }
        }

        // Сортируем по убыванию скоринга и берем топ результатов
        scoredMangas.sort((a, b) -> Double.compare(b.score, a.score));

        List<PersonalRecommendationDto> recommendations = scoredMangas.stream()
                .limit(limit)
                .map(scored -> buildRecommendationDto(scored, profile))
                .toList();

        log.info("Generated {} recommendations for userId: {}", recommendations.size(), userId);
        return recommendations;
    }

    /**
     * Получает список всех доступных для рекомендаций manga ID
     */
    private List<Long> getAllCandidateMangaIds() {
        return mangaRepository.findAll()
                .stream()
                .map(MangaMetadata::getMangaId)
                .toList();
    }

    /**
     * Получает множество manga ID, которые пользователь уже добавил в закладки
     */
    private Set<Long> getUserBookmarkedManga(Long userId, boolean excludeBookmarks) {
        if (!excludeBookmarks) {
            return new HashSet<>();
        }

        try {
            List<UserBookmarkDto> bookmarks = userDataService.getUserBookmarks(userId);
            return bookmarks.stream()
                    .map(UserBookmarkDto::getMangaId)
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            log.warn("Failed to get user bookmarks for userId: {}, error: {}", userId, e.getMessage());
            return new HashSet<>();
        }
    }

    /**
     * Рассчитывает скоринг манги на основе профиля пользователя
     */
    private double calculateMangaScore(MangaMetadataDto manga, UserPreferenceProfileDto profile) {
        double genreScore = 0.0;
        double tagScore = 0.0;
        double popularityBonus = 0.0;

        // Рассчитываем скоринг по жанрам
        if (manga.getGenres() != null && !manga.getGenres().isEmpty()) {
            for (String genre : manga.getGenres()) {
                Double weight = profile.getGenreWeights().get(genre);
                if (weight != null) {
                    genreScore += weight;
                }
            }
            genreScore = genreScore / manga.getGenres().size(); // Нормализуем по количеству жанров
        }

        // Рассчитываем скоринг по тегам
        if (manga.getTags() != null && !manga.getTags().isEmpty()) {
            for (String tag : manga.getTags()) {
                Double weight = profile.getTagWeights().get(tag);
                if (weight != null) {
                    tagScore += weight;
                }
            }
            tagScore = tagScore / manga.getTags().size(); // Нормализуем по количеству тегов
        }

        // Добавляем бонус за популярность (рейтинг и просмотры)
        if (manga.getAverageRating() != null && manga.getViews() != null) {
            // Нормализуем рейтинг
            double ratingBonus = manga.getAverageRating() / 10.0 * 0.1; // 10% веса

            // Логарифмическая нормализация просмотров для избежания доминирования
            double viewsBonus = Math.log10(Math.max(1, manga.getViews())) / 10.0 * 0.1; // 10% веса

            popularityBonus = ratingBonus + viewsBonus;
        }

        // Итоговый скоринг: 60% жанры + 30% теги + 10% популярность
        double totalScore = genreScore * 0.6 + tagScore * 0.3 + popularityBonus;

        log.debug("Manga {} score: genre={}, tag={}, popularity={}, total={}",
                manga.getMangaId(), genreScore, tagScore, popularityBonus, totalScore);

        return totalScore;
    }

    /**
     * Создает DTO рекомендации с объяснением причин
     * @param scored манга с рассчитанным скорингом
     * @param profile профиль предпочтений пользователя
     * @return DTO персональной рекомендации
     */
    private PersonalRecommendationDto buildRecommendationDto(ScoredManga scored, UserPreferenceProfileDto profile) {
        MangaMetadataDto manga = scored.manga;
        List<String> matchReasons = generateMatchReasons(manga, profile);

        return PersonalRecommendationDto.builder()
                .mangaId(manga.getMangaId())
                .title(manga.getTitle())
                .coverUrl(manga.getCoverUrl())
                .score(scored.score)
                .rating(manga.getAverageRating())
                .views(manga.getViews())
                .matchReasons(matchReasons)
                .build();
    }

    /**
     * Генерирует список причин, почему манга рекомендована пользователю
     * @param manga метаданные манги
     * @param profile профиль предпочтений пользователя
     * @return список причин рекомендации
     */
    private List<String> generateMatchReasons(MangaMetadataDto manga, UserPreferenceProfileDto profile) {
        List<String> reasons = new ArrayList<>();

        // Находим топ жанры из профиля пользователя
        List<String> topGenres = profile.getGenreWeights().entrySet().stream()
                .sorted((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()))
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();

        // Проверяем совпадения жанров
        if (manga.getGenres() != null) {
            for (String genre : manga.getGenres()) {
                if (topGenres.contains(genre)) {
                    reasons.add("Жанр: " + genre);
                }
            }
        }

        // Находим топ теги из профиля пользователя
        List<String> topTags = profile.getTagWeights().entrySet().stream()
                .sorted((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()))
                .limit(2)
                .map(Map.Entry::getKey)
                .toList();

        // Проверяем совпадения тегов
        if (manga.getTags() != null) {
            for (String tag : manga.getTags()) {
                if (topTags.contains(tag)) {
                    reasons.add("Тег: " + tag);
                }
            }
        }

        // Добавляем популярность как причину
        if (manga.getAverageRating() != null && manga.getAverageRating() >= 8.0) {
            reasons.add("Высокий рейтинг: " + String.format("%.1f", manga.getAverageRating()));
        }

        if (manga.getViews() != null && manga.getViews() > 100000) {
            reasons.add("Популярная манга");
        }

        return reasons;
    }

    /**
     * Возвращает популярные манги когда профиль пользователя пустой
     * @param limit максимальное количество рекомендаций для возврата
     * @return список популярных персональных рекомендаций
     */
    private List<PersonalRecommendationDto> getPopularMangaRecommendations(int limit) {
        List<Long> allMangaIds = getAllCandidateMangaIds();
        List<ScoredManga> popularMangas = new ArrayList<>();

        for (Long mangaId : allMangaIds) {
            try {
                MangaMetadataDto manga = mangaDataService.getBasicMangaInfo(mangaId);
                if (manga != null && manga.getAverageRating() != null && manga.getViews() != null) {
                    // Скоринг только по популярности
                    double popularityScore = (manga.getAverageRating() / 10.0) * 0.7 +
                            (Math.log10(Math.max(1, manga.getViews())) / 10.0) * 0.3;
                    popularMangas.add(new ScoredManga(manga, popularityScore));
                }
            } catch (Exception e) {
                log.warn("Failed to process popular manga {}: {}", mangaId, e.getMessage());
            }
        }

        return popularMangas.stream()
                .sorted((a, b) -> Double.compare(b.score, a.score))
                .limit(limit)
                .map(scored -> PersonalRecommendationDto.builder()
                        .mangaId(scored.manga.getMangaId())
                        .title(scored.manga.getTitle())
                        .coverUrl(scored.manga.getCoverUrl())
                        .score(scored.score)
                        .rating(scored.manga.getAverageRating())
                        .views(scored.manga.getViews())
                        .matchReasons(List.of("Популярная манга", "Высокий рейтинг"))
                        .build())
                .toList();
    }

    //TODO: добавить методы для логирования метрик производительности сервиса рекомендаций
    // Нужно ли хранить манги с рассчитанным скорингом или кэшировать их?
    /**
     * Внутренний класс для хранения манги с рассчитанным скорингом
     */
    private static class ScoredManga {
        final MangaMetadataDto manga;
        final double score;

        ScoredManga(MangaMetadataDto manga, double score) {
            this.manga = manga;
            this.score = score;
        }
    }
}

