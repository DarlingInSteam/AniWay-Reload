package shadowshift.studio.momentservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shadowshift.studio.momentservice.entity.Moment;

@Repository
public interface MomentRepository extends JpaRepository<Moment, Long> {

    Page<Moment> findByMangaIdAndHiddenFalse(Long mangaId, Pageable pageable);

    Page<Moment> findByMangaId(Long mangaId, Pageable pageable);

    boolean existsByIdAndUploaderId(Long id, Long uploaderId);
}
