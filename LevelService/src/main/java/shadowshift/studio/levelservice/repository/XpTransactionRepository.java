package shadowshift.studio.levelservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shadowshift.studio.levelservice.entity.XpTransaction;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface XpTransactionRepository extends JpaRepository<XpTransaction, UUID> {
    Optional<XpTransaction> findByEventId(String eventId);
    Page<XpTransaction> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
