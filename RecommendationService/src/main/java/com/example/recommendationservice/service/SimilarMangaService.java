package com.example.recommendationservice.service;

import com.example.recommendationservice.dto.SimilarMangaDto;
import com.example.recommendationservice.dto.SuggestMangaResponse;
import com.example.recommendationservice.dto.VoteResponse;
import com.example.recommendationservice.entity.SimilarMangaRating;
import com.example.recommendationservice.entity.SimilarMangaSuggestions;
import com.example.recommendationservice.entity.SimilarMangaVotes;
import com.example.recommendationservice.entity.VoteType;
import com.example.recommendationservice.mapper.SimilarMangaMapper;
import com.example.recommendationservice.repository.SimilarMangaRatingRepository;
import com.example.recommendationservice.repository.SimilarMangaSuggestionsRepository;
import com.example.recommendationservice.repository.SimilarMangaVotesRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Сервис для управления коммунальными рекомендациями манги (похожие тайтлы).
 * Предоставляет бизнес-логику для операций с похожими мангами через механику голосования пользователей.
 *
 * @author ShadowShiftStudio
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class SimilarMangaService {

    private final SimilarMangaSuggestionsRepository suggestionsRepository;
    private final SimilarMangaVotesRepository votesRepository;
    private final SimilarMangaRatingRepository ratingRepository;
    private final SimilarMangaMapper similarMangaMapper;

    /**
     * Получить список похожих манг для указанной манги на основе голосов сообщества.
     * Автоматически учитывает голоса пользователя и текущие рейтинги из materialized view.
     *
     * @param mangaId идентификатор исходной манги
     * @param userId идентификатор пользователя (может быть null для анонимных запросов)
     * @return ответ со списком похожих манг, отсортированных по рейтингу
     */
    public List<SimilarMangaDto> getSimilarManga(Long mangaId, Long userId) {
        log.info("Getting similar manga for mangaId: {} and userId: {}", mangaId, userId);

        // Получаем рейтинги из materialized view
        List<SimilarMangaRating> ratings = ratingRepository.findBySourceMangaIdOrderByRatingDesc(mangaId);

        if (ratings.isEmpty()) {
            log.info("No similar manga found for mangaId: {}", mangaId);
            return Collections.singletonList(SimilarMangaDto.builder()
                    .suggestionId(null)
                    .targetMangaId(null)
                    .rating(0)
                    .upvotes(0)
                    .downvotes(0)
                    .userVote(null)
                    .targetMangaTitle("No similar manga found")
                    .targetMangaCover(null)
                    .suggestedBy(null)
                    .build());
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

        return ratings.stream()
                .map(rating -> similarMangaMapper.toDto(rating, userVotes.get(rating.getSuggestionId())))
                .toList();
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

                return getCurrentRating(suggestionId, "Vote removed successfully");
            } else {
                return VoteResponse.builder()
                        .success(false)
                        .message("Vote not found")
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
     */
    private VoteResponse getCurrentRating(Long suggestionId, String message) {
        Optional<SimilarMangaRating> rating = ratingRepository.findById(suggestionId);
        return VoteResponse.builder()
                .success(true)
                .message(message)
                .newRating(rating.map(SimilarMangaRating::getRating).orElse(0))
                .build();
    }

    /**
     * Принудительно обновить materialized view для пересчета рейтингов.
     */
    private void refreshMaterializedView() {
        try {
            ratingRepository.refreshMaterializedView();
            log.debug("Materialized view refreshed successfully");
        } catch (Exception e) {
            log.error("Error refreshing materialized view: {}", e.getMessage());
        }
    }
}
