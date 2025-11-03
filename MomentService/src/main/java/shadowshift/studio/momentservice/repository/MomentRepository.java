package shadowshift.studio.momentservice.repository;

import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.momentservice.entity.Moment;

@Repository
public interface MomentRepository extends JpaRepository<Moment, Long> {

    Page<Moment> findByMangaIdAndHiddenFalse(Long mangaId, Pageable pageable);

    Page<Moment> findByMangaId(Long mangaId, Pageable pageable);

    boolean existsByIdAndUploaderId(Long id, Long uploaderId);

    long countByUploaderIdAndCreatedAtGreaterThanEqual(Long uploaderId, Instant createdAfter);

    @Query("select coalesce(sum(m.fileSize), 0) from Moment m where m.uploaderId = :uploaderId and m.createdAt >= :createdAfter")
    long sumFileSizeByUploaderIdSince(@Param("uploaderId") Long uploaderId, @Param("createdAfter") Instant createdAfter);
}
