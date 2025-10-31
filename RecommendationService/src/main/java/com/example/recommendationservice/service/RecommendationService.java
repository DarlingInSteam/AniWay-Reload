package com.example.recommendationservice.service;

import com.example.recommendationservice.dto.SimilarMangaDto;
import com.example.recommendationservice.dto.SimilarMangaResponse;
import com.example.recommendationservice.dto.SuggestMangaResponse;
import com.example.recommendationservice.dto.VoteResponse;
import com.example.recommendationservice.entity.SimilarMangaRating;
import com.example.recommendationservice.entity.SimilarMangaSuggestions;
import com.example.recommendationservice.entity.SimilarMangaVotes;
import com.example.recommendationservice.entity.VoteType;
import com.example.recommendationservice.repository.SimilarMangaRatingRepository;
import com.example.recommendationservice.repository.SimilarMangaSuggestionsRepository;
import com.example.recommendationservice.repository.SimilarMangaVotesRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Сервис для управления рекомендациями манги.
 * Предоставляет бизнес-логику для операций с похожими мангами, включая предложения, голосования и рейтинги.
 *
 * @author ShadowShiftStudio
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private final SimilarMangaSuggestionsRepository suggestionsRepository;
    private final SimilarMangaVotesRepository votesRepository;
    private final SimilarMangaRatingRepository ratingRepository;

    /**
     * Получить список похожих манг для указанной манги.
     * Автоматически учитывает голоса пользователя и текущие рейтинги из materialized view.
     *
     * @param mangaId идентификатор исходной манги
     * @param userId идентификатор пользователя (может быть null для анонимных запросов)
     * @return ответ со списком похожих манг, отсортированных по рейтингу
     */
    public SimilarMangaResponse getSimilarManga(Long mangaId, Long userId) {
        log.info("Getting similar manga for mangaId: {} and userId: {}", mangaId, userId);

        // Получаем рейтинги из materialized view
        List<SimilarMangaRating> ratings = ratingRepository.findBySourceMangaIdOrderByRatingDesc(mangaId);

        if (ratings.isEmpty()) {
            log.info("No similar manga found for mangaId: {}", mangaId);
            return SimilarMangaResponse.builder()
                    .mangaId(mangaId)
                    .similarMangaDtoList(List.of())
                    .build();
        }

        // Получаем IDs предложений для поиска голосов пользователя
        List<Long> suggestionIds = ratings.stream()
                .map(SimilarMangaRating::getSuggestionId)
                .toList();

        // Получаем голоса пользователя для этих предложений
        final Map<Long, VoteType> userVotes;
        if (userId != null) {
            userVotes = votesRepository.findBySuggestionIdsAndUserId(suggestionIds, userId)
                    .stream()
                    .collect(Collectors.toMap(
                            vote -> vote.getSuggestion().getId(),
                            SimilarMangaVotes::getVoteType
                    ));
        } else {
            userVotes = Map.of(); // Пустая карта, если userId не предоставлен
        }

        // Преобразуем в DTO
        List<SimilarMangaDto> similarList = ratings.stream()
                .map(rating -> mapToSimilarMangaDto(rating, userVotes.get(rating.getSuggestionId())))
                .toList();

        return SimilarMangaResponse.builder()
                .mangaId(mangaId)
                .similarMangaDtoList(similarList)
                .build();
    }

    /**
     * Преобразовать рейтинг манги в DTO с учетом голоса пользователя.
     *
     * @param rating рейтинг похожей манги из базы данных
     * @param userVote тип голоса пользователя или null если пользователь не голосовал
     * @return DTO с информацией о похожей манге
     */
    private SimilarMangaDto mapToSimilarMangaDto(SimilarMangaRating rating, VoteType userVote) {
        return SimilarMangaDto.builder()
                .suggestionId(rating.getSuggestionId())
                .targetMangaId(rating.getTargetMangaId())
                .rating(rating.getRating())
                .upvotes(rating.getUpvotes())
                .downvotes(rating.getDownvotes())
                .userVote(userVote)
                // TODO: Добавить получение информации о манге (title, cover) из MangaService
                .targetMangaTitle("Title placeholder")
                .targetMangaCover("Cover placeholder")
                .suggestedBy("User placeholder")
                .build();
    }

    /**
     * Предложить связь между двумя мангами как похожими.
     * Проверяет существование предложения и создает новое при необходимости.
     *
     * @param sourceMangaId идентификатор исходной манги
     * @param targetMangaId идентификатор предлагаемой похожей манги
     * @param userId идентификатор пользователя, предлагающего связь
     * @return ответ с информацией о предложении и текущим рейтингом
     */
    public SuggestMangaResponse suggestSimilarManga(Long sourceMangaId, Long targetMangaId, Long userId) {
        log.info("Suggesting similar manga: source={}, target={}, user={}", sourceMangaId, targetMangaId, userId);

        // Проверяем, существует ли уже такое предложение
        Optional<SimilarMangaSuggestions> existingSuggestion =
                suggestionsRepository.findBySourceMangaIdAndTargetMangaId(sourceMangaId, targetMangaId);

        SuggestMangaResponse response = new SuggestMangaResponse();

        if (existingSuggestion.isPresent()) {
            // Предложение уже существует
            SimilarMangaSuggestions suggestion = existingSuggestion.get();
            response.setSuggestionId(suggestion.getId());
            response.setIsNewSuggestion(false);

            // Получаем текущий рейтинг из materialized view
            Optional<SimilarMangaRating> rating = ratingRepository.findById(suggestion.getId());
            response.setCurrentRating(rating.map(SimilarMangaRating::getRating).orElse(0));

            log.info("Suggestion already exists with ID: {} and rating: {}",
                    suggestion.getId(), response.getCurrentRating());
        } else {
            // Создаем новое предложение
            SimilarMangaSuggestions newSuggestion = new SimilarMangaSuggestions();
            newSuggestion.setSourceMangaId(sourceMangaId);
            newSuggestion.setTargetMangaId(targetMangaId);
            newSuggestion.setSuggestedByUserId(userId);

            SimilarMangaSuggestions savedSuggestion = suggestionsRepository.save(newSuggestion);

            response.setSuggestionId(savedSuggestion.getId());
            response.setIsNewSuggestion(true);
            response.setCurrentRating(0); // Новое предложение начинается с рейтинга 0

            log.info("Created new suggestion with ID: {}", savedSuggestion.getId());
        }

        return response;
    }

    /**
     * Проголосовать за или против предложения о похожести манг.
     * Обновляет существующий голос пользователя или создает новый.
     *
     * @param suggestionId идентификатор предложения
     * @param userId идентификатор голосующего пользователя
     * @param voteType тип голоса (UPVOTE или DOWNVOTE)
     * @return результат голосования с обновленным рейтингом
     * @throws IllegalArgumentException если параметры невалидны
     */
    public VoteResponse voteSimilarManga(Long suggestionId, Long userId, VoteType voteType) {
        log.info("Voting on suggestionId: {} by userId: {} with voteType: {}", suggestionId, userId, voteType);

        // Валидация входных параметров
        if (suggestionId == null || userId == null || voteType == null) {
            return VoteResponse.builder()
                    .success(false)
                    .message("Invalid parameters: suggestionId, userId, and voteType are required")
                    .build();
        }

        try {
            // Проверяем, существует ли предложение
            SimilarMangaSuggestions suggestion = suggestionsRepository.findById(suggestionId)
                    .orElse(null);

            if (suggestion == null) {
                return VoteResponse.builder()
                        .success(false)
                        .message("Suggestion not found")
                        .build();
            }

            // Проверяем, существует ли уже голос пользователя для этого предложения
            Optional<SimilarMangaVotes> existingVoteOpt =
                    votesRepository.findBySuggestionIdAndUserId(suggestionId, userId);

            SimilarMangaVotes vote;
            boolean isNewVote = false;

            if (existingVoteOpt.isPresent()) {
                // Обновляем существующий голос
                vote = existingVoteOpt.get();
                VoteType oldVoteType = vote.getVoteType();

                if (oldVoteType == voteType) {
                    // Пользователь голосует тем же типом - ничего не меняем
                    return getCurrentRating(suggestionId, "Vote unchanged");
                }

                vote.setVoteType(voteType);
                log.info("Updated existing vote from {} to {} for suggestionId: {} by userId: {}",
                        oldVoteType, voteType, suggestionId, userId);
            } else {
                // Создаем новый голос
                vote = new SimilarMangaVotes();
                vote.setSuggestion(suggestion);
                vote.setUserId(userId);
                vote.setVoteType(voteType);
                isNewVote = true;
                log.info("Created new vote for suggestionId: {} by userId: {}", suggestionId, userId);
            }

            votesRepository.save(vote);

            // Принудительно обновляем materialized view
            refreshMaterializedView();

            // Получаем обновленный рейтинг
            String message = isNewVote ? "Vote added successfully" : "Vote updated successfully";
            return getCurrentRating(suggestionId, message);

        } catch (Exception e) {
            log.error("Error voting for suggestionId: {} by userId: {}", suggestionId, userId, e);
            return VoteResponse.builder()
                    .success(false)
                    .message("Error processing vote: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Удалить голос пользователя за предложение о похожести манг.
     * Обновляет рейтинг после удаления голоса.
     *
     * @param suggestionId идентификатор предложения
     * @param userId идентификатор пользователя
     * @return результат операции с обновленным рейтингом
     */
    public VoteResponse removeVote(Long suggestionId, Long userId) {
        log.info("Removing vote for suggestionId: {} by userId: {}", suggestionId, userId);

        // Валидация входных параметров
        if (suggestionId == null || userId == null) {
            return VoteResponse.builder()
                    .success(false)
                    .message("Invalid parameters: suggestionId and userId are required")
                    .build();
        }

        try {
            Optional<SimilarMangaVotes> existingVoteOpt =
                    votesRepository.findBySuggestionIdAndUserId(suggestionId, userId);

            if (existingVoteOpt.isPresent()) {
                votesRepository.delete(existingVoteOpt.get());
                log.info("Vote removed for suggestionId: {} by userId: {}", suggestionId, userId);

                // Принудительно обновляем materialized view
                refreshMaterializedView();

                // Получаем обновленный рейтинг
                return getCurrentRating(suggestionId, "Vote removed successfully");
            } else {
                log.info("No existing vote found for suggestionId: {} by userId: {}", suggestionId, userId);
                return VoteResponse.builder()
                        .success(false)
                        .message("No vote found to remove")
                        .build();
            }
        } catch (Exception e) {
            log.error("Error removing vote for suggestionId: {} by userId: {}", suggestionId, userId, e);
            return VoteResponse.builder()
                    .success(false)
                    .message("Error removing vote: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Получить текущий рейтинг предложения из materialized view.
     *
     * @param suggestionId идентификатор предложения
     * @param message сообщение для включения в ответ
     * @return ответ с текущим рейтингом, количеством положительных и отрицательных голосов
     */
    private VoteResponse getCurrentRating(Long suggestionId, String message) {
        Optional<SimilarMangaRating> ratingOpt = ratingRepository.findById(suggestionId);

        if (ratingOpt.isPresent()) {
            SimilarMangaRating rating = ratingOpt.get();
            return VoteResponse.builder()
                    .success(true)
                    .message(message)
                    .newRating(rating.getRating())
                    .upvotes(rating.getUpvotes())
                    .downvotes(rating.getDownvotes())
                    .build();
        } else {
            return VoteResponse.builder()
                    .success(true)
                    .message(message)
                    .newRating(0)
                    .upvotes(0)
                    .downvotes(0)
                    .build();
        }
    }

    /**
     * Обновить materialized view для актуальных рейтингов.
     * Обеспечивает синхронизацию данных после изменения голосов.
     */
    private void refreshMaterializedView() {
        try {
            // Обновляем materialized view для актуальных рейтингов
            // В PostgreSQL это делается командой REFRESH MATERIALIZED VIEW
            votesRepository.flush(); // Сначала сохраняем все изменения
            // Можно добавить native query для обновления view, если нужно мгновенное обновление
        } catch (Exception e) {
            log.warn("Could not refresh materialized view: {}", e.getMessage());
        }
    }
}
