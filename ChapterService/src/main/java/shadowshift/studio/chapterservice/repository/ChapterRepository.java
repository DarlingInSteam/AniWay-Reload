package shadowshift.studio.chapterservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shadowshift.studio.chapterservice.entity.Chapter;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    // Получение всех глав для конкретной манги
    List<Chapter> findByMangaIdOrderByChapterNumberAsc(Long mangaId);

    // Подсчет количества глав для манги
    @Query("SELECT COUNT(c) FROM Chapter c WHERE c.mangaId = :mangaId")
    Integer countByMangaId(Long mangaId);

    // Поиск главы по ID манги и номеру главы
    Optional<Chapter> findByMangaIdAndChapterNumber(Long mangaId, Integer chapterNumber);

    // Получение следующей главы
    @Query("SELECT c FROM Chapter c WHERE c.mangaId = :mangaId AND c.chapterNumber > :currentChapter ORDER BY c.chapterNumber ASC")
    Optional<Chapter> findNextChapter(Long mangaId, Integer currentChapter);

    // Получение предыдущей главы
    @Query("SELECT c FROM Chapter c WHERE c.mangaId = :mangaId AND c.chapterNumber < :currentChapter ORDER BY c.chapterNumber DESC")
    Optional<Chapter> findPreviousChapter(Long mangaId, Integer currentChapter);
}
