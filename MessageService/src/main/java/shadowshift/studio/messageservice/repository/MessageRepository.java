package shadowshift.studio.messageservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import shadowshift.studio.messageservice.entity.MessageEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<MessageEntity, UUID> {

    @Query("""
            select m from MessageEntity m
            where m.conversation.id = :conversationId and m.deletedAt is null
            order by m.createdAt desc
            """)
    Page<MessageEntity> findRecentMessages(@Param("conversationId") UUID conversationId, Pageable pageable);

    @Query("""
            select m from MessageEntity m
            where m.conversation.id = :conversationId and m.deletedAt is null and m.createdAt < :before
            order by m.createdAt desc
            """)
    Page<MessageEntity> findMessagesBefore(@Param("conversationId") UUID conversationId,
                                           @Param("before") LocalDateTime before,
                                           Pageable pageable);

    @Query("""
            select m from MessageEntity m
            where m.conversation.id = :conversationId and m.deletedAt is null and m.createdAt > :after
            order by m.createdAt asc
            """)
    List<MessageEntity> findMessagesAfter(@Param("conversationId") UUID conversationId,
                                          @Param("after") LocalDateTime after,
                                          Pageable pageable);

        Optional<MessageEntity> findByIdAndConversationId(UUID id, UUID conversationId);

        long countByConversationIdAndDeletedAtIsNullAndSenderIdNotAndCreatedAtAfter(UUID conversationId,
                                                                                                                                                                Long senderId,
                                                                                                                                                                LocalDateTime after);
}
