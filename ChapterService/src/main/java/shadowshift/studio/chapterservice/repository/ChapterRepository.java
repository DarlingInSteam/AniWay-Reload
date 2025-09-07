package shadowshift.studio.chapterservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shadowshift.studio.chapterservice.entity.Chapter;
import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с сущностями Chapter.
 * Предоставляет методы для выполнения CRUD операций и кастомных запросов к базе данных.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    /**
     * Получить все главы для указанной манги, отсортированные по номеру главы по возрастанию.
     *
     * @param mangaId идентификатор манги
     * @return список глав манги
     */
    List<Chapter> findByMangaIdOrderByChapterNumberAsc(Long mangaId);

    /**
     * Подсчитать количество глав для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @return количество глав
     */
    @Query("SELECT COUNT(c) FROM Chapter c WHERE c.mangaId = :mangaId")
    Integer countByMangaId(Long mangaId);

    /**
     * Найти главу по идентификатору манги и номеру главы.
     *
     * @param mangaId идентификатор манги
     * @param chapterNumber номер главы
     * @return Optional с найденной главой или пустой Optional
     */
    Optional<Chapter> findByMangaIdAndChapterNumber(Long mangaId, Double chapterNumber);

    /**
     * Найти следующую главу после указанной.
     * Возвращает главу с наименьшим номером, большим чем текущий.
     *
     * @param mangaId идентификатор манги
     * @param currentChapter номер текущей главы
     * @return Optional со следующей главой или пустой Optional
     */
    @Query("SELECT c FROM Chapter c WHERE c.mangaId = :mangaId AND c.chapterNumber > :currentChapter ORDER BY c.chapterNumber ASC")
    Optional<Chapter> findNextChapter(Long mangaId, Double currentChapter);

    /**
     * Найти предыдущую главу перед указанной.
     * Возвращает главу с наибольшим номером, меньшим чем текущий.
     *
     * @param mangaId идентификатор манги
     * @param currentChapter номер текущей главы
     * @return Optional с предыдущей главой или пустой Optional
     */
    @Query("SELECT c FROM Chapter c WHERE c.mangaId = :mangaId AND c.chapterNumber < :currentChapter ORDER BY c.chapterNumber DESC")
    Optional<Chapter> findPreviousChapter(Long mangaId, Double currentChapter);
}
