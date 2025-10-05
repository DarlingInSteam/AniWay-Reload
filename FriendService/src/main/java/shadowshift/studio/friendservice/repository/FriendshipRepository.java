package shadowshift.studio.friendservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import shadowshift.studio.friendservice.entity.FriendshipEntity;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<FriendshipEntity, Long> {

    Optional<FriendshipEntity> findByUserAIdAndUserBId(Long userAId, Long userBId);

    boolean existsByUserAIdAndUserBId(Long userAId, Long userBId);

    void deleteByUserAIdAndUserBId(Long userAId, Long userBId);

    @Query("select f from FriendshipEntity f where f.userAId = :userId or f.userBId = :userId order by f.createdAt desc")
    List<FriendshipEntity> findAllByUserOrderByCreatedAtDesc(Long userId);

    @Query("select count(f) from FriendshipEntity f where f.userAId = :userId or f.userBId = :userId")
    long countByUser(Long userId);
}
