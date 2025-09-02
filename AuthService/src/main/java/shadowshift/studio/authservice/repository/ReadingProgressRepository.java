package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.ReadingProgress;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, Long> {
    
    List<ReadingProgress> findByUserId(Long userId);
    
    List<ReadingProgress> findByUserIdAndMangaId(Long userId, Long mangaId);
    
    Optional<ReadingProgress> findByUserIdAndChapterId(Long userId, Long chapterId);
    
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.mangaId = :mangaId " +
           "ORDER BY rp.chapterNumber DESC")
    List<ReadingProgress> findLatestProgressForManga(@Param("userId") Long userId, @Param("mangaId") Long mangaId);
    
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.isCompleted = true")
    List<ReadingProgress> findCompletedChapters(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(rp) FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.isCompleted = true")
    Long countCompletedChaptersByUser(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(DISTINCT rp.mangaId) FROM ReadingProgress rp WHERE rp.userId = :userId")
    Long countDistinctMangasByUser(@Param("userId") Long userId);
    
    Long countByUserId(Long userId);
}
