package shadowshift.studio.imagestorageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.imagestorageservice.entity.ChapterImage;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterImageRepository extends JpaRepository<ChapterImage, Long> {

    List<ChapterImage> findByChapterIdOrderByPageNumberAsc(Long chapterId);

    Optional<ChapterImage> findByChapterIdAndPageNumber(Long chapterId, Integer pageNumber);

    Integer countByChapterId(Long chapterId);

    @Modifying
    @Transactional
    void deleteByChapterId(Long chapterId);

    @Query("SELECT COALESCE(MAX(ci.pageNumber), 0) FROM ChapterImage ci WHERE ci.chapterId = :chapterId")
    Optional<Integer> findMaxPageNumberByChapterId(@Param("chapterId") Long chapterId);

    // Специальные методы для обложек (chapterId = -1)
    @Query("SELECT ci FROM ChapterImage ci WHERE ci.chapterId = -1")
    List<ChapterImage> findAllCovers();

    @Query("SELECT ci FROM ChapterImage ci WHERE ci.chapterId = -1 AND ci.pageNumber = :pageNumber")
    Optional<ChapterImage> findCoverByPageNumber(@Param("pageNumber") Integer pageNumber);

    Optional<ChapterImage> findByMangaIdAndChapterId(Long mangaId, Long chapterId);
}
