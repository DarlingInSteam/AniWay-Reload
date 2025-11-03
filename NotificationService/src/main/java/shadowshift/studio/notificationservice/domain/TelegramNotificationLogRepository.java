package shadowshift.studio.notificationservice.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TelegramNotificationLogRepository extends JpaRepository<TelegramNotificationLog, Long> {

    boolean existsByUserIdAndChapterIdAndStatus(Long userId, Long chapterId, TelegramDeliveryStatus status);

    Optional<TelegramNotificationLog> findTopByUserIdAndChapterIdOrderBySentAtDesc(Long userId, Long chapterId);
}
