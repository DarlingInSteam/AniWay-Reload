package shadowshift.studio.forumservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.forumservice.entity.ForumCategory;

import java.util.List;
import java.util.Optional;

@Repository
public interface ForumCategoryRepository extends JpaRepository<ForumCategory, Long> {
    
    /**
     * Найти все активные категории, отсортированные по порядку отображения
     */
    @Query("SELECT c FROM ForumCategory c WHERE c.isActive = true ORDER BY c.displayOrder ASC, c.name ASC")
    List<ForumCategory> findAllActiveOrderByDisplayOrder();
    
    /**
     * Найти категории по статусу активности
     */
    Page<ForumCategory> findByIsActiveOrderByDisplayOrderAsc(Boolean isActive, Pageable pageable);
    
    /**
     * Проверить существование категории по имени (для проверки уникальности)
     */
    boolean existsByNameIgnoreCase(String name);
    
    /**
     * Найти категорию по точному имени без учета регистра
     */
    Optional<ForumCategory> findByNameIgnoreCase(String name);

    /**
     * Найти категории по имени (поиск)
     */
    @Query("SELECT c FROM ForumCategory c WHERE c.isActive = true AND LOWER(c.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<ForumCategory> findByNameContainingIgnoreCase(@Param("name") String name);
}