package shadowshift.studio.messageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shadowshift.studio.messageservice.entity.ChatCategoryEntity;

import java.util.List;
import java.util.Optional;

public interface ChatCategoryRepository extends JpaRepository<ChatCategoryEntity, Long> {

    Optional<ChatCategoryEntity> findBySlugIgnoreCase(String slug);

    List<ChatCategoryEntity> findAllByIsArchivedFalseOrderByIsDefaultDescTitleAsc();

    List<ChatCategoryEntity> findAllByOrderByIsArchivedAscTitleAsc();
}
