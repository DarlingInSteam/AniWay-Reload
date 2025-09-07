package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.ActivityDTO;
import shadowshift.studio.authservice.entity.ReadingProgress;
import shadowshift.studio.authservice.entity.Review;
import shadowshift.studio.authservice.repository.ReadingProgressRepository;
import shadowshift.studio.authservice.repository.ReviewRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Сервис для получения активности пользователя
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {
    
    private final ReadingProgressRepository readingProgressRepository;
    private final ReviewRepository reviewRepository;
    
    /**
     * Получение ленты активности пользователя
     */
    public List<ActivityDTO> getUserActivity(Long userId, int limit) {
        log.info("Getting activity for user {} with limit {}", userId, limit);
        
        List<ActivityDTO> activities = new ArrayList<>();
        
        // Получаем завершенные главы (последние 50 для оптимизации)
        List<ReadingProgress> completedChapters = readingProgressRepository
                .findByUserIdAndIsCompletedOrderByUpdatedAtDesc(userId, true)
                .stream()
                .limit(50)
                .collect(Collectors.toList());
        
        // Преобразуем в активности чтения
        for (ReadingProgress progress : completedChapters) {
            activities.add(createChapterActivity(progress));
        }
        
        // Получаем ревью пользователя (последние 20 для оптимизации)
        List<Review> userReviews = reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(20)
                .collect(Collectors.toList());
        
        // Преобразуем в активности ревью
        for (Review review : userReviews) {
            activities.add(createReviewActivity(review));
        }
        
        // Сортируем по времени (сначала новые) и ограничиваем количество
        return activities.stream()
                .sorted(Comparator.comparing(ActivityDTO::getTimestamp).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }
    
    /**
     * Получение только активности чтения
     */
    public List<ActivityDTO> getUserReadingActivity(Long userId, int limit) {
        log.info("Getting reading activity for user {} with limit {}", userId, limit);
        
        List<ReadingProgress> completedChapters = readingProgressRepository
                .findByUserIdAndIsCompletedOrderByUpdatedAtDesc(userId, true)
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
        
        return completedChapters.stream()
                .map(this::createChapterActivity)
                .collect(Collectors.toList());
    }
    
    /**
     * Получение только активности ревью
     */
    public List<ActivityDTO> getUserReviewActivity(Long userId, int limit) {
        log.info("Getting review activity for user {} with limit {}", userId, limit);
        
        List<Review> userReviews = reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
        
        return userReviews.stream()
                .map(this::createReviewActivity)
                .collect(Collectors.toList());
    }
    
    /**
     * Создание активности для прочитанной главы
     */
    private ActivityDTO createChapterActivity(ReadingProgress progress) {
        String message = String.format("Прочитана глава %.1f", progress.getChapterNumber());
        
        // TODO: Получить название манги из MangaService через API
        String mangaTitle = "манги"; // заглушка, позже получаем из MangaService
        if (mangaTitle != null && !mangaTitle.equals("манги")) {
            message = String.format("Прочитана глава %.1f манги '%s'", 
                    progress.getChapterNumber(), mangaTitle);
        }
        
        return ActivityDTO.builder()
                .id(progress.getId())
                .userId(progress.getUserId())
                .activityType("CHAPTER_COMPLETED")
                .message(message)
                .timestamp(progress.getUpdatedAt())
                .mangaId(progress.getMangaId())
                .mangaTitle(mangaTitle)
                .chapterId(progress.getChapterId())
                .chapterNumber(progress.getChapterNumber())
                .actionUrl(String.format("/manga/%d/chapter/%d", progress.getMangaId(), progress.getChapterId()))
                .build();
    }
    
    /**
     * Создание активности для ревью
     */
    private ActivityDTO createReviewActivity(Review review) {
        String message = String.format("Оставлен отзыв с оценкой %d/10", review.getRating());
        
        // TODO: Получить название манги из MangaService через API
        String mangaTitle = "манги"; // заглушка
        if (mangaTitle != null && !mangaTitle.equals("манги")) {
            message = String.format("Оставлен отзыв с оценкой %d/10 для манги '%s'", 
                    review.getRating(), mangaTitle);
        }
        
        return ActivityDTO.builder()
                .id(review.getId())
                .userId(review.getUserId())
                .activityType("REVIEW_CREATED")
                .message(message)
                .timestamp(review.getCreatedAt())
                .mangaId(review.getMangaId())
                .mangaTitle(mangaTitle)
                .reviewId(review.getId())
                .actionUrl(String.format("/manga/%d#review-%d", review.getMangaId(), review.getId()))
                .build();
    }
}
