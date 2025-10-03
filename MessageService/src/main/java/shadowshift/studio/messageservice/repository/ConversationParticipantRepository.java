package shadowshift.studio.messageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shadowshift.studio.messageservice.entity.ConversationEntity;
import shadowshift.studio.messageservice.entity.ConversationParticipantEntity;

import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipantEntity, Long> {

    Optional<ConversationParticipantEntity> findByConversationAndUserId(ConversationEntity conversation, Long userId);

    List<ConversationParticipantEntity> findByConversation(ConversationEntity conversation);

    List<ConversationParticipantEntity> findByUserId(Long userId);
}
