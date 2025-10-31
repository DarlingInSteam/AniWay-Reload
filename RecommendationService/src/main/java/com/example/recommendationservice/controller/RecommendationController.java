package com.example.recommendationservice.controller;

import com.example.recommendationservice.dto.SimilarMangaResponse;
import com.example.recommendationservice.dto.SuggestMangaResponse;
import com.example.recommendationservice.dto.VoteResponse;
import com.example.recommendationservice.entity.VoteType;
import com.example.recommendationservice.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST контроллер для управления рекомендациями манги.
 * Предоставляет API endpoints для получения похожих манг, создания предложений и голосования.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * Получить список похожих манг для указанной манги.
     *
     * @param id идентификатор манги
     * @param userId идентификатор пользователя (опционально, для получения пользовательских голосов)
     * @return ResponseEntity с списком похожих манг
     */
    @GetMapping("/similar/{id}")
    public ResponseEntity<SimilarMangaResponse> getSimilarManga(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        try {
            SimilarMangaResponse response = recommendationService.getSimilarManga(id, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching similar manga for ID {}: {}", id, e.getMessage());
            throw e;
        }
    }

    /**
     * Предложить связь между двумя мангами как похожими.
     *
     * @param id идентификатор исходной манги
     * @param targetMangaId идентификатор предлагаемой похожей манги
     * @param userId идентификатор пользователя, создающего предложение
     * @return ResponseEntity с информацией о созданном или существующем предложении
     */
    @PostMapping("/similar/{id}/suggest")
    public ResponseEntity<SuggestMangaResponse> suggestSimilarManga(
            @PathVariable Long id,
            @RequestParam(required = false) Long targetMangaId,
            @RequestParam(required = false) Long userId) {
        try {
            SuggestMangaResponse response = recommendationService.suggestSimilarManga(id, targetMangaId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error suggesting similar manga for ID {}: {}", id, e.getMessage());
            throw e;
        }
    }

    /**
     * Проголосовать за или против предложения о похожести манг.
     *
     * @param suggestionId идентификатор предложения
     * @param userId идентификатор голосующего пользователя
     * @param vote тип голоса (UPVOTE или DOWNVOTE)
     * @return ResponseEntity с результатом голосования
     */
    @PostMapping("/similar/vote")
    public ResponseEntity<VoteResponse> voteSimilarManga(
            @RequestParam Long suggestionId,
            @RequestParam Long userId,
            @RequestParam VoteType vote) {
        try {
            VoteResponse response = recommendationService.voteSimilarManga(suggestionId, userId, vote);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error voting for suggestion ID {}: {}", suggestionId, e.getMessage());
            throw e; // или обработка ошибки по-другому
        }
    }

    /**
     * Удалить голос пользователя за предложение.
     *
     * @param suggestionId идентификатор предложения
     * @param userId идентификатор пользователя
     * @return ResponseEntity с результатом операции удаления
     */
    @DeleteMapping("/similar/vote/{suggestionId}")
    public ResponseEntity<VoteResponse> removeVote(
            @PathVariable Long suggestionId,
            @RequestParam(required = false) Long userId
    ) {
        try {
            VoteResponse response =  recommendationService.removeVote(suggestionId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error removing vote for suggestion ID {}: {}", suggestionId, e.getMessage());
            throw e; // или обработка ошибки по-другому
        }
    }
}
