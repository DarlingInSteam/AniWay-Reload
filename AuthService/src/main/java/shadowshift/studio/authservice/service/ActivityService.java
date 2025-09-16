package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.ActivityDTO;
import shadowshift.studio.authservice.entity.ReadingProgress;
import shadowshift.studio.authservice.entity.Review;
import shadowshift.studio.authservice.mapper.ActivityMapper;
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
            activities.add(ActivityMapper.fromReadingProgress(progress));
        }
        
        List<Review> userReviews = reviewRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .limit(20)
                .collect(Collectors.toList());
        
        for (Review review : userReviews) {
            activities.add(ActivityMapper.fromReview(review));
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
                .map(ActivityMapper::fromReadingProgress)
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
                .map(ActivityMapper::fromReview)
                .collect(Collectors.toList());
    }
    
    // Методы маппинга вынесены в ActivityMapper
}
