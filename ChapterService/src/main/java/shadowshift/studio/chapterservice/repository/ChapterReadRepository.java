package shadowshift.studio.chapterservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shadowshift.studio.chapterservice.entity.ChapterRead;

@Repository
public interface ChapterReadRepository extends JpaRepository<ChapterRead, Long> {
    boolean existsByUserIdAndChapterId(Long userId, Long chapterId);
}
