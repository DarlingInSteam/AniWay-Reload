package shadowshift.studio.forumservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.forumservice.entity.ForumSubscription;
import shadowshift.studio.forumservice.entity.ForumThread;
import shadowshift.studio.forumservice.repository.ForumSubscriptionRepository;
import shadowshift.studio.forumservice.repository.ForumThreadRepository;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForumSubscriptionService {

    private final ForumSubscriptionRepository subscriptionRepository;
    private final ForumThreadRepository threadRepository;

    @Transactional
    public void subscribe(Long threadId, Long userId) {
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена: " + threadId));

        if (thread.getAuthorId().equals(userId)) {
            // Автор автоматически получает уведомления, отдельная подписка не требуется
            log.debug("Пользователь {} является автором темы {}, подписка не требуется", userId, threadId);
            return;
        }

        Optional<ForumSubscription> existing = subscriptionRepository.findByUserIdAndThreadId(userId, threadId);
        if (existing.isPresent()) {
            ForumSubscription sub = existing.get();
            if (!Boolean.TRUE.equals(sub.getIsActive())) {
                sub.setIsActive(true);
                subscriptionRepository.save(sub);
                log.debug("Повторно активирована подписка пользователя {} на тему {}", userId, threadId);
            }
            return;
        }

        ForumSubscription subscription = ForumSubscription.builder()
                .userId(userId)
                .threadId(threadId)
                .build();
        subscriptionRepository.save(subscription);
        log.debug("Создана подписка пользователя {} на тему {}", userId, threadId);
    }

    @Transactional
    public void unsubscribe(Long threadId, Long userId) {
        subscriptionRepository.findByUserIdAndThreadId(userId, threadId).ifPresent(sub -> {
            if (Boolean.TRUE.equals(sub.getIsActive())) {
                sub.setIsActive(false);
                subscriptionRepository.save(sub);
                log.debug("Подписка пользователя {} на тему {} деактивирована", userId, threadId);
            }
        });
    }
}
