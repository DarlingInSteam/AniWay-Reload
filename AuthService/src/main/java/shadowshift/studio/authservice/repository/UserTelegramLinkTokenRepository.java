package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.UserTelegramLinkToken;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserTelegramLinkTokenRepository extends JpaRepository<UserTelegramLinkToken, Long> {

    Optional<UserTelegramLinkToken> findByTokenHash(String tokenHash);

    long countByUser_IdAndUsedAtIsNullAndExpiresAtAfter(Long userId, LocalDateTime referenceTime);

    List<UserTelegramLinkToken> findByUser_IdAndUsedAtIsNullOrderByCreatedAtAsc(Long userId);

    @Modifying
    @Query("DELETE FROM UserTelegramLinkToken t WHERE t.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM UserTelegramLinkToken t WHERE t.expiresAt < :threshold")
    void deleteExpired(@Param("threshold") LocalDateTime threshold);
}
