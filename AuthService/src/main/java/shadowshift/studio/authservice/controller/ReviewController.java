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

@RestController
@RequestMapping("/api/auth/reviews")
@RequiredArgsConstructor
@Slf4j
public class ReviewController {
    
    private final ReviewService reviewService;
    
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
    
    @GetMapping("/manga/{mangaId}")
    public ResponseEntity<List<ReviewDTO>> getReviewsByManga(
            @PathVariable Long mangaId,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        List<ReviewDTO> reviews = reviewService.getReviewsByManga(mangaId, username);
        return ResponseEntity.ok(reviews);
    }
    
    @GetMapping("/manga/{mangaId}/my")
    public ResponseEntity<ReviewDTO> getUserReviewForManga(
            @PathVariable Long mangaId,
            Authentication authentication) {
        String username = authentication.getName();
        Optional<ReviewDTO> review = reviewService.getUserReviewForManga(username, mangaId);
        return review.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/manga/{mangaId}/rating")
    public ResponseEntity<MangaRatingDTO> getMangaRating(@PathVariable Long mangaId) {
        MangaRatingDTO rating = reviewService.getMangaRating(mangaId);
        return ResponseEntity.ok(rating);
    }

    /**
     * Получение всех ревью пользователя для профиля
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
    
    // Request DTOs
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
