package shadowshift.studio.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.notificationservice.domain.*;
import shadowshift.studio.notificationservice.dto.NotificationResponseDTO;
import shadowshift.studio.notificationservice.sse.SseEmitterRegistry;
import shadowshift.studio.notificationservice.service.telegram.TelegramNotificationService;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationServiceFacade {

    private final NotificationRepository notificationRepository;
    private final SseEmitterRegistry sseEmitterRegistry;
    private final TelegramNotificationService telegramNotificationService;

    @Transactional
    public Notification createBasic(Long userId, NotificationType type, String payloadJson, String dedupeKey) {
        Notification notification;
        if (dedupeKey != null) {
            Optional<Notification> existing = notificationRepository.findByDedupeKey(dedupeKey);
            if (existing.isPresent()) {
                Notification upd = existing.get();
                upd.setPayloadJson(payloadJson); // merge strategy (MVP overwrite)
                Notification saved = notificationRepository.save(upd);
                pushToUser(saved);
                telegramNotificationService.dispatch(saved);
                return saved;
            }
        }
        notification = Notification.builder()
                .userId(userId)
                .type(type)
                .status(NotificationStatus.UNREAD)
                .payloadJson(payloadJson)
                .dedupeKey(dedupeKey)
                .priority((short)0)
                .silent(false)
                .version((short)1)
                .build();
        Notification saved = notificationRepository.save(notification);
        pushToUser(saved);
        telegramNotificationService.dispatch(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndStatus(userId, NotificationStatus.UNREAD);
    }

    @Transactional
    public int markRead(Long userId, List<Long> ids) {
        List<Notification> list = notificationRepository.findAllById(ids);
        int changed = 0;
        Instant now = Instant.now();
        for (Notification n : list) {
            if (n.getUserId().equals(userId) && n.getStatus() == NotificationStatus.UNREAD) {
                n.setStatus(NotificationStatus.READ);
                n.setReadAt(now);
                changed++;
            }
        }
        if (changed > 0) notificationRepository.saveAll(list);
        return changed;
    }

    @Transactional
    public int markAllRead(Long userId) {
        // Simple implementation: load top unread (bounded) then loop (optimizable with custom update)
        List<Notification> unread = notificationRepository.findTop50ByUserIdAndStatusOrderByIdDesc(userId, NotificationStatus.UNREAD);
        int changed = 0;
        Instant now = Instant.now();
        for (Notification n : unread) {
            n.setStatus(NotificationStatus.READ);
            n.setReadAt(now);
            changed++;
        }
        if (changed > 0) notificationRepository.saveAll(unread);
        return changed;
    }

    @Transactional
    public long deleteAllForUser(Long userId) {
        List<Notification> all = notificationRepository.findByUserIdOrderByIdDesc(userId);
        long count = all.size();
        if (count > 0) notificationRepository.deleteAllInBatch(all);
        return count;
    }

    private void pushToUser(Notification n) {
        NotificationResponseDTO dto = NotificationResponseDTO.builder()
                .id(n.getId())
                .type(n.getType().name())
                .status(n.getStatus().name())
                .payload(n.getPayloadJson())
                .createdAtEpoch(n.getCreatedAt() != null ? n.getCreatedAt().toEpochMilli() : Instant.now().toEpochMilli())
                .readAtEpoch(n.getReadAt() != null ? n.getReadAt().toEpochMilli() : null)
                .build();
        sseEmitterRegistry.sendTo(n.getUserId(), dto);
    }
}
