package shadowshift.studio.levelservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shadowshift.studio.levelservice.entity.UserBadge;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    boolean existsByUserIdAndBadgeCode(Long userId, String badgeCode);
    List<UserBadge> findByUserId(Long userId);
    Optional<UserBadge> findByUserIdAndBadgeCode(Long userId, String badgeCode);
    long countByUserId(Long userId);
}
