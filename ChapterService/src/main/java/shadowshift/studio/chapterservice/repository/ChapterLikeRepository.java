package shadowshift.studio.chapterservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shadowshift.studio.chapterservice.entity.ChapterLike;
import java.util.Optional;

/**
 * Репозиторий для работы с сущностями ChapterLike.
 * Предоставляет методы для выполнения CRUD операций и кастомных запросов к базе данных.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface ChapterLikeRepository extends JpaRepository<ChapterLike, Long> {

    /**
     * Проверить, существует ли лайк от пользователя к главе.
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     * @return true, если лайк существует, иначе false
     */
    boolean existsByUserIdAndChapterId(Long userId, Long chapterId);

    /**
     * Найти лайк по пользователю и главе.
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     * @return Optional с найденным лайком или пустой Optional
     */
    Optional<ChapterLike> findByUserIdAndChapterId(Long userId, Long chapterId);

    /**
     * Подсчитать количество лайков к главе.
     *
     * @param chapterId идентификатор главы
     * @return количество лайков
     */
    @Query("SELECT COUNT(cl) FROM ChapterLike cl WHERE cl.chapterId = :chapterId")
    Integer countByChapterId(Long chapterId);
}