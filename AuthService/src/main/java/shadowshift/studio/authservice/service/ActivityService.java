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
 * Сервис для управления и получения активности пользователей.
 * Предоставляет функциональность для формирования ленты активности на основе
 * прогресса чтения и отзывов пользователей.
 *
 * @author ShadowShiftStudio
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {
    
    private final ReadingProgressRepository readingProgressRepository;
    private final ReviewRepository reviewRepository;
    
    /**
     * Получает ленту активности пользователя, включая завершенные главы и отзывы.
     * Активности сортируются по времени в обратном порядке (сначала новые).
     *
     * @param userId идентификатор пользователя
     * @param limit максимальное количество возвращаемых активностей
     * @return список активностей пользователя
     */
    public List<ActivityDTO> getUserActivity(Long userId, int limit) {
        log.info("Getting activity for user {} with limit {}", userId, limit);
        
        List<ActivityDTO> activities = new ArrayList<>();
        
        List<ReadingProgress> completedChapters = readingProgressRepository
                .findByUserIdAndIsCompletedOrderByUpdatedAtDesc(userId, true)
                .stream()
                .limit(50)
                .collect(Collectors.toList());
        
        for (ReadingProgress progress : completedChapters) {
            activities.add(createChapterActivity(progress));
        }
        
        List<Review> userReviews = reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(20)
                .collect(Collectors.toList());
        
        for (Review review : userReviews) {
            activities.add(createReviewActivity(review));
        }
        
        return activities.stream()
                .sorted(Comparator.comparing(ActivityDTO::getTimestamp).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }
    
    /**
     * Получает активность пользователя, связанную только с чтением глав.
     * Возвращает список завершенных глав в порядке убывания времени обновления.
     *
     * @param userId идентификатор пользователя
     * @param limit максимальное количество возвращаемых активностей чтения
     * @return список активностей чтения пользователя
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
     * Получает активность пользователя, связанную только с отзывами.
     * Возвращает список созданных отзывов в порядке убывания времени создания.
     *
     * @param userId идентификатор пользователя
     * @param limit максимальное количество возвращаемых активностей отзывов
     * @return список активностей отзывов пользователя
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
     * Создает объект активности для завершенной главы.
     * Формирует сообщение и ссылку на основе данных прогресса чтения.
     *
     * @param progress объект прогресса чтения
     * @return объект активности для главы
     */
    private ActivityDTO createChapterActivity(ReadingProgress progress) {
        String message = String.format("Прочитана глава %.1f", progress.getChapterNumber());
        
        String mangaTitle = "манги";
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
     * Создает объект активности для созданного отзыва.
     * Формирует сообщение и ссылку на основе данных отзыва.
     *
     * @param review объект отзыва
     * @return объект активности для отзыва
     */
    private ActivityDTO createReviewActivity(Review review) {
        String message = String.format("Оставлен отзыв с оценкой %d/10", review.getRating());
        
        String mangaTitle = "манги";
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
