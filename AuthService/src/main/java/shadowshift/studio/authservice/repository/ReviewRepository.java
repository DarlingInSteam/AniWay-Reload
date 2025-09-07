package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.Review;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с отзывами.
 * Предоставляет методы для доступа к данным отзывов в базе данных.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    /**
     * Находит отзывы для манги, отсортированные по дате создания.
     *
     * @param mangaId идентификатор манги
     * @return список отзывов
     */
    List<Review> findByMangaIdOrderByCreatedAtDesc(Long mangaId);
    
    /**
     * Находит отзывы пользователя, отсортированные по дате создания.
     *
     * @param userId идентификатор пользователя
     * @return список отзывов
     */
    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Находит отзыв пользователя для манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return Optional с отзывом или пустой
     */
    Optional<Review> findByUserIdAndMangaId(Long userId, Long mangaId);
    
    /**
     * Получает средний рейтинг для манги.
     *
     * @param mangaId идентификатор манги
     * @return средний рейтинг
     */
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.mangaId = :mangaId")
    Double getAverageRatingByMangaId(@Param("mangaId") Long mangaId);
    
    /**
     * Подсчитывает отзывы для манги.
     *
     * @param mangaId идентификатор манги
     * @return количество отзывов
     */
    @Query("SELECT COUNT(r) FROM Review r WHERE r.mangaId = :mangaId")
    Long countReviewsByMangaId(@Param("mangaId") Long mangaId);
    
    /**
     * Получает распределение рейтингов для манги.
     *
     * @param mangaId идентификатор манги
     * @return список массивов [рейтинг, количество]
     */
    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.mangaId = :mangaId GROUP BY r.rating ORDER BY r.rating")
    List<Object[]> getRatingDistributionByMangaId(@Param("mangaId") Long mangaId);
    
    /**
     * Находит отзывы для манги, отсортированные по фактору доверия.
     *
     * @param mangaId идентификатор манги
     * @return список отзывов
     */
    @Query("SELECT r FROM Review r WHERE r.mangaId = :mangaId ORDER BY (r.likesCount - r.dislikesCount) DESC, r.createdAt DESC")
    List<Review> findByMangaIdOrderByTrustFactorDesc(@Param("mangaId") Long mangaId);
    
    /**
     * Проверяет существование отзыва пользователя для манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return true, если отзыв существует
     */
    boolean existsByUserIdAndMangaId(Long userId, Long mangaId);
}
