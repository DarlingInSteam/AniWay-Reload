package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.Bookmark;
import shadowshift.studio.authservice.entity.BookmarkStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    
    List<Bookmark> findByUserId(Long userId);
    
    List<Bookmark> findByUserIdAndStatus(Long userId, BookmarkStatus status);
    
    List<Bookmark> findByUserIdAndIsFavoriteTrue(Long userId);
    
    Optional<Bookmark> findByUserIdAndMangaId(Long userId, Long mangaId);
    
    boolean existsByUserIdAndMangaId(Long userId, Long mangaId);
    
    @Query("SELECT COUNT(b) FROM Bookmark b WHERE b.userId = :userId AND b.status = :status")
    Long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") BookmarkStatus status);
    
    void deleteByUserIdAndMangaId(Long userId, Long mangaId);
    
    Long deleteByMangaId(Long mangaId);
}
