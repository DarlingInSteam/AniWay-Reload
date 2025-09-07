package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.authservice.dto.MangaRatingDTO;
import shadowshift.studio.authservice.dto.ReviewDTO;
import shadowshift.studio.authservice.entity.Review;
import shadowshift.studio.authservice.entity.ReviewLike;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.repository.ReviewLikeRepository;
import shadowshift.studio.authservice.repository.ReviewRepository;
import shadowshift.studio.authservice.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {
    
    private final ReviewRepository reviewRepository;
    private final ReviewLikeRepository reviewLikeRepository;
    private final UserRepository userRepository;
    
    @Transactional
    public ReviewDTO createReview(String username, Long mangaId, Integer rating, String comment) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Check if user already has a review for this manga
        if (reviewRepository.existsByUserIdAndMangaId(user.getId(), mangaId)) {
            throw new IllegalArgumentException("User already has a review for this manga");
        }
        
        if (rating < 1 || rating > 10) {
            throw new IllegalArgumentException("Rating must be between 1 and 10");
        }
        
        Review review = Review.builder()
                .userId(user.getId())
                .mangaId(mangaId)
                .rating(rating)
                .comment(comment)
                .build();
        
        review = reviewRepository.save(review);
        log.info("Created review for manga {} by user {}", mangaId, username);
        
        return convertToDTO(review, username);
    }
    
    @Transactional
    public ReviewDTO updateReview(String username, Long reviewId, Integer rating, String comment) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));
        
        if (!review.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("Access denied");
        }
        
        if (!review.canBeEdited()) {
            throw new IllegalArgumentException("Review can only be edited within 7 days of creation");
        }
        
        if (rating < 1 || rating > 10) {
            throw new IllegalArgumentException("Rating must be between 1 and 10");
        }
        
        review.setRating(rating);
        review.setComment(comment);
        review.setUpdatedAt(LocalDateTime.now());
        review.setIsEdited(true);
        
        review = reviewRepository.save(review);
        log.info("Updated review {} by user {}", reviewId, username);
        
        return convertToDTO(review, username);
    }
    
    @Transactional
    public void deleteReview(String username, Long reviewId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));
        
        if (!review.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("Access denied");
        }
        
        // Delete all likes/dislikes for this review
        reviewLikeRepository.deleteAll(reviewLikeRepository.findAll().stream()
                .filter(like -> like.getReviewId().equals(reviewId))
                .collect(Collectors.toList()));
        
        reviewRepository.delete(review);
        log.info("Deleted review {} by user {}", reviewId, username);
    }
    
    @Transactional
    public ReviewDTO likeReview(String username, Long reviewId, boolean isLike) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));
        
        // Check if user already voted on this review
        Optional<ReviewLike> existingLike = reviewLikeRepository.findByUserIdAndReviewId(user.getId(), reviewId);
        
        if (existingLike.isPresent()) {
            ReviewLike like = existingLike.get();
            if (like.getIsLike().equals(isLike)) {
                // Same vote - remove it
                reviewLikeRepository.delete(like);
                log.info("Removed {} from review {} by user {}", isLike ? "like" : "dislike", reviewId, username);
            } else {
                // Different vote - update it
                like.setIsLike(isLike);
                reviewLikeRepository.save(like);
                log.info("Changed vote to {} on review {} by user {}", isLike ? "like" : "dislike", reviewId, username);
            }
        } else {
            // New vote
            ReviewLike like = ReviewLike.builder()
                    .userId(user.getId())
                    .reviewId(reviewId)
                    .isLike(isLike)
                    .build();
            reviewLikeRepository.save(like);
            log.info("Added {} to review {} by user {}", isLike ? "like" : "dislike", reviewId, username);
        }
        
        // Update review counts
        updateReviewCounts(review);
        
        return convertToDTO(review, username);
    }
    
    public List<ReviewDTO> getReviewsByManga(Long mangaId, String currentUsername) {
        List<Review> reviews = reviewRepository.findByMangaIdOrderByTrustFactorDesc(mangaId);
        return reviews.stream()
                .map(review -> convertToDTO(review, currentUsername))
                .collect(Collectors.toList());
    }
    
    public Optional<ReviewDTO> getUserReviewForManga(String username, Long mangaId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return reviewRepository.findByUserIdAndMangaId(user.getId(), mangaId)
                .map(review -> convertToDTO(review, username));
    }
    
    public MangaRatingDTO getMangaRating(Long mangaId) {
        Double avgRating = reviewRepository.getAverageRatingByMangaId(mangaId);
        Long totalReviews = reviewRepository.countReviewsByMangaId(mangaId);
        
        // Get rating distribution
        List<Object[]> distribution = reviewRepository.getRatingDistributionByMangaId(mangaId);
        Long[] ratingCounts = new Long[10];
        for (int i = 0; i < 10; i++) {
            ratingCounts[i] = 0L;
        }
        
        for (Object[] row : distribution) {
            Integer rating = (Integer) row[0];
            Long count = (Long) row[1];
            if (rating >= 1 && rating <= 10) {
                ratingCounts[rating - 1] = count;
            }
        }
        
        return MangaRatingDTO.builder()
                .mangaId(mangaId)
                .averageRating(avgRating)
                .totalReviews(totalReviews)
                .ratingDistribution(ratingCounts)
                .build();
    }

    /**
     * Получение всех ревью пользователя
     */
    public List<ReviewDTO> getAllUserReviews(Long userId) {
        log.info("Getting all reviews for user {}", userId);
        
        List<Review> userReviews = reviewRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        return userReviews.stream()
                .map(review -> convertToDTO(review, null))
                .collect(Collectors.toList());
    }
    
    private void updateReviewCounts(Review review) {
        Long likes = reviewLikeRepository.countLikesByReviewId(review.getId());
        Long dislikes = reviewLikeRepository.countDislikesByReviewId(review.getId());
        
        review.setLikesCount(likes.intValue());
        review.setDislikesCount(dislikes.intValue());
        reviewRepository.save(review);
    }
    
    private ReviewDTO convertToDTO(Review review, String currentUsername) {
        User reviewer = userRepository.findById(review.getUserId()).orElse(null);
        User currentUser = currentUsername != null ? userRepository.findByUsername(currentUsername).orElse(null) : null;
        
        // Check user's vote on this review
        Boolean userLiked = null;
        if (currentUser != null) {
            Optional<ReviewLike> userVote = reviewLikeRepository.findByUserIdAndReviewId(currentUser.getId(), review.getId());
            if (userVote.isPresent()) {
                userLiked = userVote.get().getIsLike();
            }
        }
        
        boolean canEdit = currentUser != null && 
                         currentUser.getId().equals(review.getUserId()) && 
                         review.canBeEdited();
        
        boolean canDelete = currentUser != null && 
                           currentUser.getId().equals(review.getUserId());
        
        return ReviewDTO.builder()
                .id(review.getId())
                .userId(review.getUserId())
                .username(reviewer != null ? reviewer.getUsername() : "Unknown")
                .userDisplayName(reviewer != null ? reviewer.getDisplayName() : "Unknown User")
                .userAvatar(reviewer != null ? reviewer.getAvatar() : null)
                .mangaId(review.getMangaId())
                .rating(review.getRating())
                .comment(review.getComment())
                .likesCount(review.getLikesCount())
                .dislikesCount(review.getDislikesCount())
                .trustFactor(review.getTrustFactor())
                .trustFactorColor(review.getTrustFactorColor())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .isEdited(review.getIsEdited())
                .canEdit(canEdit)
                .canDelete(canDelete)
                .userLiked(userLiked)
                .build();
    }
}
