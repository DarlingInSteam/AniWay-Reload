package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.MangaRatingDTO;
import shadowshift.studio.authservice.dto.ReviewDTO;
import shadowshift.studio.authservice.service.ReviewService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Optional;

/**
 * Контроллер для управления отзывами и рейтингами пользователей в системе.
 * Предоставляет REST API для создания, обновления, удаления отзывов,
 * лайков/дизлайков, получения отзывов по манге и рейтингов.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@RestController
@RequestMapping("/api/auth/reviews")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {
    
    private final ReviewService reviewService;
    
    /**
     * Создает новый отзыв для манги.
     *
     * @param mangaId идентификатор манги
     * @param request объект с данными отзыва
     * @param authentication объект аутентификации
     * @return ResponseEntity с ReviewDTO или ошибкой
     * @throws IllegalArgumentException в случае ошибки создания
     */
    @PostMapping("/manga/{mangaId}")
    public ResponseEntity<ReviewDTO> createReview(
            @PathVariable Long mangaId,
            @RequestBody @Valid CreateReviewRequest request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            ReviewDTO review = reviewService.createReview(username, mangaId, request.getRating(), request.getComment());
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to create review: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Обновляет существующий отзыв.
     *
     * @param reviewId идентификатор отзыва
     * @param request объект с обновленными данными отзыва
     * @param authentication объект аутентификации
     * @return ResponseEntity с ReviewDTO или ошибкой
     * @throws IllegalArgumentException в случае ошибки обновления
     */
    @PutMapping("/{reviewId}")
    public ResponseEntity<ReviewDTO> updateReview(
            @PathVariable Long reviewId,
            @RequestBody @Valid UpdateReviewRequest request,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            ReviewDTO review = reviewService.updateReview(username, reviewId, request.getRating(), request.getComment());
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to update review: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Удаляет отзыв пользователя.
     *
     * @param reviewId идентификатор отзыва
     * @param authentication объект аутентификации
     * @return ResponseEntity с подтверждением или ошибкой
     * @throws IllegalArgumentException в случае ошибки удаления
     */
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long reviewId,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            reviewService.deleteReview(username, reviewId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.warn("Failed to delete review: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Ставит лайк отзыву.
     *
     * @param reviewId идентификатор отзыва
     * @param authentication объект аутентификации
     * @return ResponseEntity с ReviewDTO или ошибкой
     * @throws IllegalArgumentException в случае ошибки лайка
     */
    @PostMapping("/{reviewId}/like")
    public ResponseEntity<ReviewDTO> likeReview(
            @PathVariable Long reviewId,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            ReviewDTO review = reviewService.likeReview(username, reviewId, true);
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to like review: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Ставит дизлайк отзыву.
     *
     * @param reviewId идентификатор отзыва
     * @param authentication объект аутентификации
     * @return ResponseEntity с ReviewDTO или ошибкой
     * @throws IllegalArgumentException в случае ошибки дизлайка
     */
    @PostMapping("/{reviewId}/dislike")
    public ResponseEntity<ReviewDTO> dislikeReview(
            @PathVariable Long reviewId,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            ReviewDTO review = reviewService.likeReview(username, reviewId, false);
            return ResponseEntity.ok(review);
        } catch (IllegalArgumentException e) {
            log.warn("Failed to dislike review: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получает все отзывы для манги.
     *
     * @param mangaId идентификатор манги
     * @param authentication объект аутентификации (может быть null)
     * @return ResponseEntity со списком ReviewDTO
     */
    @GetMapping("/manga/{mangaId}")
    public ResponseEntity<List<ReviewDTO>> getReviewsByManga(
            @PathVariable Long mangaId,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        List<ReviewDTO> reviews = reviewService.getReviewsByManga(mangaId, username);
        return ResponseEntity.ok(reviews);
    }
    
    /**
     * Получает отзыв пользователя для манги.
     *
     * @param mangaId идентификатор манги
     * @param authentication объект аутентификации
     * @return ResponseEntity с ReviewDTO или 404, если не найдено
     */
    @GetMapping("/manga/{mangaId}/my")
    public ResponseEntity<ReviewDTO> getUserReviewForManga(
            @PathVariable Long mangaId,
            Authentication authentication) {
        String username = authentication.getName();
        Optional<ReviewDTO> review = reviewService.getUserReviewForManga(username, mangaId);
        return review.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Получает рейтинг манги.
     *
     * @param mangaId идентификатор манги
     * @return ResponseEntity с MangaRatingDTO
     */
    @GetMapping("/manga/{mangaId}/rating")
    public ResponseEntity<MangaRatingDTO> getMangaRating(@PathVariable Long mangaId) {
        MangaRatingDTO rating = reviewService.getMangaRating(mangaId);
        return ResponseEntity.ok(rating);
    }

    /**
     * Получает все отзывы пользователя для профиля.
     *
     * @param userId идентификатор пользователя
     * @return ResponseEntity со списком ReviewDTO или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ReviewDTO>> getUserReviews(@PathVariable Long userId) {
        try {
            log.info("Getting reviews for user {}", userId);
            List<ReviewDTO> reviews = reviewService.getAllUserReviews(userId);
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            log.error("Error getting reviews for user {}", userId, e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Возвращает количество отзывов пользователя (легковесная альтернатива выборке всех отзывов).
     * @param userId идентификатор пользователя
     * @return количество отзывов
     */
    @GetMapping("/user/{userId}/count")
    public ResponseEntity<Long> getUserReviewsCount(@PathVariable Long userId) {
        Long count = reviewService.countUserReviews(userId);
        return ResponseEntity.ok(count);
    }
    /**
     * Получает отзыв по идентификатору.
     *
     * @param reviewId идентификатор отзыва
     * @param authentication объект аутентификации (может быть null)
     * @return ResponseEntity с ReviewDTO или 404, если не найдено
     */
    @GetMapping("/{reviewId}")
    public ResponseEntity<ReviewDTO> getReviewById(
            @PathVariable Long reviewId,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        Optional<ReviewDTO> review = reviewService.getReviewById(reviewId, username);
        return review.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }


    /**
     * Внутренний класс для запроса на создание отзыва.
     *
     * @author ShadowShiftStudio
     * @version 1.0
     */
    public static class CreateReviewRequest {
        @NotNull
        @Min(1)
        @Max(10)
        private Integer rating;
        
        private String comment;
        
        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }
        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
    }
    
    /**
     * Внутренний класс для запроса на обновление отзыва.
     *
     * @author ShadowShiftStudio
     * @version 1.0
     */
    public static class UpdateReviewRequest {
        @NotNull
        @Min(1)
        @Max(10)
        private Integer rating;
        
        private String comment;
        
        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }
        public String getComment() { return comment; }
        public void setComment(String comment) { this.comment = comment; }
    }
}
