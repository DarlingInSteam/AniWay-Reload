package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.ReviewLike;

import java.util.Optional;

/**
 * Репозиторий для работы с лайками отзывов.
 * Предоставляет методы для доступа к данным лайков отзывов в базе данных.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Repository
public interface ReviewLikeRepository extends JpaRepository<ReviewLike, Long> {
    
    /**
     * Находит лайк пользователя для отзыва.
     *
     * @param userId идентификатор пользователя
     * @param reviewId идентификатор отзыва
     * @return Optional с лайком или пустой
     */
    Optional<ReviewLike> findByUserIdAndReviewId(Long userId, Long reviewId);
    
    /**
     * Подсчитывает лайки для отзыва.
     *
     * @param reviewId идентификатор отзыва
     * @return количество лайков
     */
    @Query("SELECT COUNT(rl) FROM ReviewLike rl WHERE rl.reviewId = :reviewId AND rl.isLike = true")
    Long countLikesByReviewId(@Param("reviewId") Long reviewId);
    
    /**
     * Подсчитывает дизлайки для отзыва.
     *
     * @param reviewId идентификатор отзыва
     * @return количество дизлайков
     */
    @Query("SELECT COUNT(rl) FROM ReviewLike rl WHERE rl.reviewId = :reviewId AND rl.isLike = false")
    Long countDislikesByReviewId(@Param("reviewId") Long reviewId);
    
    /**
     * Проверяет существование лайка пользователя для отзыва.
     *
     * @param userId идентификатор пользователя
     * @param reviewId идентификатор отзыва
     * @return true, если лайк существует
     */
    boolean existsByUserIdAndReviewId(Long userId, Long reviewId);
    
    /**
     * Удаляет лайк пользователя для отзыва.
     *
     * @param userId идентификатор пользователя
     * @param reviewId идентификатор отзыва
     */
    void deleteByUserIdAndReviewId(Long userId, Long reviewId);
}
