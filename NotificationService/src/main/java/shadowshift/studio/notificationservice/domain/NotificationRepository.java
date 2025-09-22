package shadowshift.studio.notificationservice.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND (:status IS NULL OR n.status = :status) ORDER BY n.id DESC")
    Page<Notification> findByUser(@Param("userId") Long userId, @Param("status") NotificationStatus status, Pageable pageable);

    long countByUserIdAndStatus(Long userId, NotificationStatus status);

    List<Notification> findTop50ByUserIdAndStatusOrderByIdDesc(Long userId, NotificationStatus status);
    
        List<Notification> findByUserIdOrderByIdDesc(Long userId);

    Optional<Notification> findByDedupeKey(String dedupeKey);
}
