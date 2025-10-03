package shadowshift.studio.messageservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import shadowshift.studio.messageservice.entity.ConversationEntity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {

    @EntityGraph(attributePaths = {"participants"})
    @Query("select c from ConversationEntity c join c.participants p where p.userId = :userId")
    Page<ConversationEntity> findAllByParticipant(@Param("userId") Long userId, Pageable pageable);

  @EntityGraph(attributePaths = {"participants"})
  @Query("select c from ConversationEntity c join c.participants p where p.userId = :userId")
  List<ConversationEntity> findAllByParticipant(@Param("userId") Long userId);

    @EntityGraph(attributePaths = {"participants"})
    Optional<ConversationEntity> findById(UUID id);

  @EntityGraph(attributePaths = {"participants"})
  Optional<ConversationEntity> findByCategoryId(Long categoryId);

  @EntityGraph(attributePaths = {"participants"})
  @Query("select c from ConversationEntity c where c.category.id in :categoryIds")
  List<ConversationEntity> findAllByCategoryIds(@Param("categoryIds") List<Long> categoryIds);

    @EntityGraph(attributePaths = {"participants"})
    @Query("""
            select c from ConversationEntity c
            join c.participants p1
            join c.participants p2
            where c.type = shadowshift.studio.messageservice.model.ConversationType.PRIVATE
              and p1.userId = :userId
              and p2.userId = :otherUserId
            """)
    Optional<ConversationEntity> findPrivateConversationBetween(@Param("userId") Long userId,
                                                                 @Param("otherUserId") Long otherUserId);
}
