package shadowshift.studio.imagestorageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shadowshift.studio.imagestorageservice.entity.ChapterImage;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChapterImageRepository extends JpaRepository<ChapterImage, Long> {

    // Получение всех изображений для главы, отсортированных по номеру страницы
    List<ChapterImage> findByChapterIdOrderByPageNumberAsc(Long chapterId);

    // Подсчет количества страниц в главе
    @Query("SELECT COUNT(ci) FROM ChapterImage ci WHERE ci.chapterId = :chapterId")
    Integer countByChapterId(Long chapterId);

    // Поиск изображения по ID главы и номеру страницы
    Optional<ChapterImage> findByChapterIdAndPageNumber(Long chapterId, Integer pageNumber);

    // Удаление всех изображений главы
    void deleteByChapterId(Long chapterId);

    // Получение максимального номера страницы для главы
    @Query("SELECT MAX(ci.pageNumber) FROM ChapterImage ci WHERE ci.chapterId = :chapterId")
    Optional<Integer> findMaxPageNumberByChapterId(Long chapterId);
}
