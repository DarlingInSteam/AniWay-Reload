package shadowshift.studio.mangaservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.mangaservice.entity.MangaCharacter;

import java.util.List;

@Repository
public interface MangaCharacterRepository extends JpaRepository<MangaCharacter, Long> {

    List<MangaCharacter> findByMangaId(Long mangaId);

    List<MangaCharacter> findByMangaIdAndStatus(Long mangaId, MangaCharacter.Status status);

    @Query("SELECT mc FROM MangaCharacter mc WHERE mc.manga.id = :mangaId AND mc.createdBy = :userId")
    List<MangaCharacter> findByMangaIdAndCreator(@Param("mangaId") Long mangaId, @Param("userId") Long userId);

    @Query("SELECT mc FROM MangaCharacter mc WHERE mc.status = :status")
    List<MangaCharacter> findByStatus(@Param("status") MangaCharacter.Status status);
}
