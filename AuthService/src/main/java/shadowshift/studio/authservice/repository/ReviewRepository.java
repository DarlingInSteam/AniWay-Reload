package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.Review;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    
    List<Review> findByMangaIdOrderByCreatedAtDesc(Long mangaId);
    
    List<Review> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    Optional<Review> findByUserIdAndMangaId(Long userId, Long mangaId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.mangaId = :mangaId")
    Double getAverageRatingByMangaId(@Param("mangaId") Long mangaId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.mangaId = :mangaId")
    Long countReviewsByMangaId(@Param("mangaId") Long mangaId);
    
    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.mangaId = :mangaId GROUP BY r.rating ORDER BY r.rating")
    List<Object[]> getRatingDistributionByMangaId(@Param("mangaId") Long mangaId);
    
    @Query("SELECT r FROM Review r WHERE r.mangaId = :mangaId ORDER BY (r.likesCount - r.dislikesCount) DESC, r.createdAt DESC")
    List<Review> findByMangaIdOrderByTrustFactorDesc(@Param("mangaId") Long mangaId);
    
    boolean existsByUserIdAndMangaId(Long userId, Long mangaId);
}
