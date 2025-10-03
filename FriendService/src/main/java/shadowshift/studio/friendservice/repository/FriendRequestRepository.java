package shadowshift.studio.friendservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shadowshift.studio.friendservice.entity.FriendRequestEntity;
import shadowshift.studio.friendservice.model.FriendRequestStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequestEntity, UUID> {

    Optional<FriendRequestEntity> findByRequesterIdAndReceiverIdAndStatus(Long requesterId, Long receiverId, FriendRequestStatus status);

    List<FriendRequestEntity> findByReceiverIdAndStatusOrderByCreatedAtDesc(Long receiverId, FriendRequestStatus status);

    List<FriendRequestEntity> findByRequesterIdAndStatusOrderByCreatedAtDesc(Long requesterId, FriendRequestStatus status);

    long countByReceiverIdAndStatus(Long receiverId, FriendRequestStatus status);

    long countByRequesterIdAndStatus(Long requesterId, FriendRequestStatus status);

    @Query("select fr from FriendRequestEntity fr where fr.status = 'PENDING' and ((fr.requesterId = :userId and fr.receiverId = :otherUserId) or (fr.requesterId = :otherUserId and fr.receiverId = :userId))")
    List<FriendRequestEntity> findActiveBetween(Long userId, Long otherUserId);
}
