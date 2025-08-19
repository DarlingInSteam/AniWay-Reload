package shadowshift.studio.mangaservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shadowshift.studio.mangaservice.entity.Manga;
import java.util.List;

@Repository
public interface MangaRepository extends JpaRepository<Manga, Long> {

    // Поиск по названию (для MVP не нужен, но может пригодиться)
    List<Manga> findByTitleContainingIgnoreCase(String title);

    // Получение всех манг, отсортированных по дате создания (для каталога)
    @Query("SELECT m FROM Manga m ORDER BY m.createdAt DESC")
    List<Manga> findAllOrderByCreatedAtDesc();

    // Получение манг по статусу
    List<Manga> findByStatus(Manga.MangaStatus status);
}
