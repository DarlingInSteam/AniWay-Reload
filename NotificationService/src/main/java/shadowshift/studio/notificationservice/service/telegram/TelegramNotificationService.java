package shadowshift.studio.notificationservice.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import shadowshift.studio.notificationservice.domain.Notification;
import shadowshift.studio.notificationservice.domain.NotificationType;
import shadowshift.studio.notificationservice.domain.TelegramDeliveryStatus;
import shadowshift.studio.notificationservice.domain.TelegramNotificationLog;
import shadowshift.studio.notificationservice.domain.TelegramNotificationLogRepository;
import shadowshift.studio.notificationservice.dto.TelegramRecipient;

import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramNotificationService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
            .withZone(ZoneId.systemDefault());

    private final TelegramNotificationProperties properties;
    private final AuthServiceTelegramClient authServiceTelegramClient;
    private final TelegramBotClient telegramBotClient;
    private final TelegramNotificationLogRepository logRepository;
    private final ObjectMapper objectMapper;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2, runnable -> {
        Thread thread = new Thread(runnable, "telegram-aggregation");
        thread.setDaemon(true);
        return thread;
    });

    private final ConcurrentMap<String, AggregateBucket> buckets = new ConcurrentHashMap<>();

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
        buckets.clear();
    }

    public void dispatch(Notification notification) {
        if (!properties.isEnabled()) {
            return;
        }
        if (notification.getType() != NotificationType.BOOKMARK_NEW_CHAPTER) {
            return;
        }
        ChapterPayload payload = parsePayload(notification.getPayloadJson());
        if (payload == null) {
            return;
        }
        if (properties.getAggregateWindowSeconds() <= 0) {
            deliverImmediate(notification, payload);
        } else {
            enqueue(notification, payload);
        }
    }

    private void deliverImmediate(Notification notification, ChapterPayload payload) {
        deliverAggregated(notification.getUserId(), notification.getId(), payload.mangaId(), payload.mangaTitle(), List.of(payload));
    }

    private void enqueue(Notification notification, ChapterPayload payload) {
        if (payload.mangaId() == null) {
            deliverImmediate(notification, payload);
            return;
        }
        String key = key(notification.getUserId(), payload.mangaId());
        AggregateBucket bucket = buckets.compute(key, (k, existing) -> {
            if (existing == null) {
                existing = new AggregateBucket(notification.getUserId(), payload.mangaId());
            }
            existing.add(payload);
            return existing;
        });
        bucket.ensureScheduled(() -> flushBucket(key), properties.getAggregateWindowSeconds(), scheduler);
    }

    private void flushBucket(String key) {
        AggregateBucket bucket = buckets.remove(key);
        if (bucket == null) {
            return;
        }
        List<ChapterPayload> chapters = bucket.drain();
        if (chapters.isEmpty()) {
            return;
        }
        deliverAggregated(bucket.userId(), null, bucket.mangaId(), bucket.mangaTitle(), chapters);
    }

    private void deliverAggregated(Long userId, Long notificationId, Long mangaId, String mangaTitle, List<ChapterPayload> chapters) {
        try {
            List<ChapterPayload> uniqueChapters = filterAlreadyDelivered(userId, chapters);
            if (uniqueChapters.isEmpty()) {
                return;
            }

            Optional<TelegramRecipient> recipientOpt = authServiceTelegramClient.getRecipientForUser(userId);
            if (recipientOpt.isEmpty()) {
                log.debug("Telegram skip: user {} has no linked account", userId);
                logSkipped(userId, notificationId, mangaId, chapters, "NO_RECIPIENT");
                return;
            }
            TelegramRecipient recipient = recipientOpt.get();
            if (!recipient.notificationsEnabled() || recipient.chatId() == null) {
                log.debug("Telegram skip: notifications disabled for user {}", userId);
                logSkipped(userId, notificationId, mangaId, chapters, "DISABLED");
                return;
            }

            String message = composeMessage(mangaTitle, uniqueChapters);
            SendOutcome outcome = sendWithRetry(recipient.chatId(), message);
            TelegramSendResult result = outcome.result();
            if (result.success()) {
                uniqueChapters.forEach(chapter -> logRepository.save(
                        TelegramNotificationLog.builder()
                                .notificationId(notificationId)
                                .userId(userId)
                                .chatId(recipient.chatId())
                                .mangaId(mangaId)
                                .chapterId(chapter.chapterId())
                                .status(TelegramDeliveryStatus.SUCCESS)
                                .retryCount(outcome.attempts())
                                .payload(message)
                                .build()
                ));
            } else {
                if ("403".equals(result.errorCode())) {
                    authServiceTelegramClient.unlinkByChat(recipient.chatId(), "FORBIDDEN");
                }
                uniqueChapters.forEach(chapter -> logRepository.save(
                        TelegramNotificationLog.builder()
                                .notificationId(notificationId)
                                .userId(userId)
                                .chatId(recipient.chatId())
                                .mangaId(mangaId)
                                .chapterId(chapter.chapterId())
                                .status(TelegramDeliveryStatus.FAILED)
                                .errorCode(result.errorCode())
                                .errorMessage(result.description())
                                .retryCount(outcome.attempts())
                                .payload(message)
                                .build()
                ));
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Telegram send interrupted for user {}", userId);
        } catch (Exception ex) {
            log.error("Failed to send telegram notification for user {}: {}", userId, ex.getMessage(), ex);
        }
    }

    private SendOutcome sendWithRetry(Long chatId, String message) throws InterruptedException {
        int attempts = Math.max(1, properties.getMaxRetries());
        int backoffBase = (int) Math.max(100, properties.getRetryBackoffMillis());
        TelegramSendResult result = TelegramSendResult.failure("INIT", "Not sent", 0, false);
        int used = 0;
        for (int i = 0; i < attempts; i++) {
            result = telegramBotClient.sendMessage(chatId, message);
            used = i + 1;
            if (result.success()) {
                return new SendOutcome(result, used);
            }
            if (!result.retryable()) {
                break;
            }
            int sleep = result.retryAfterSeconds() > 0 ? result.retryAfterSeconds() * 1000 : backoffBase * (i + 1);
            Thread.sleep(sleep);
        }
        return new SendOutcome(result, used == 0 ? attempts : used);
    }

    private List<ChapterPayload> filterAlreadyDelivered(Long userId, List<ChapterPayload> chapters) {
        List<ChapterPayload> filtered = new ArrayList<>();
        for (ChapterPayload chapter : chapters) {
            if (chapter.chapterId() != null && logRepository.existsByUserIdAndChapterIdAndStatus(userId, chapter.chapterId(), TelegramDeliveryStatus.SUCCESS)) {
                continue;
            }
            filtered.add(chapter);
        }
        return filtered;
    }

    private String composeMessage(String mangaTitle, List<ChapterPayload> chapters) {
        String effectiveTitle = (mangaTitle != null && !mangaTitle.isBlank()) ? mangaTitle : "Новая глава";
        StringBuilder sb = new StringBuilder();
        sb.append(properties.getTitleEmoji()).append(' ').append(effectiveTitle).append('\n');
        if (chapters.size() == 1) {
            ChapterPayload chapter = chapters.getFirst();
            String chapterLabel = chapter.chapterNumber() != null ? chapter.chapterNumber() : String.valueOf(chapter.chapterId());
            sb.append("Глава ").append(chapterLabel).append(" уже доступна!\n");
            String link = renderLink(chapter);
            if (link != null) {
                sb.append(link).append('\n');
            }
        } else {
            sb.append("Новые главы:\n");
            for (ChapterPayload chapter : chapters) {
                String chapterLabel = chapter.chapterNumber() != null ? chapter.chapterNumber() : String.valueOf(chapter.chapterId());
                sb.append(" • ").append(chapterLabel);
                String link = renderLink(chapter);
                if (link != null) {
                    sb.append(" — ").append(link);
                }
                sb.append('\n');
            }
        }
        sb.append("Время: ").append(DATE_TIME_FORMATTER.format(Instant.now()));
        return sb.toString();
    }

    private String renderLink(ChapterPayload chapter) {
        if (chapter.chapterId() == null || chapter.mangaId() == null) {
            return properties.getSiteBaseUrl();
        }
        String template = properties.getChapterLinkTemplate();
        if (!StringUtils.hasText(template)) {
            template = properties.getSiteBaseUrl() + "/manga/{mangaId}/chapter/{chapterId}";
        }
        return template
                .replace("{mangaId}", String.valueOf(chapter.mangaId()))
                .replace("{chapterId}", String.valueOf(chapter.chapterId()));
    }

    private ChapterPayload parsePayload(String payloadJson) {
        if (!StringUtils.hasText(payloadJson)) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(payloadJson);
            Long mangaId = node.path("mangaId").isNumber() ? node.path("mangaId").asLong() : null;
            Long chapterId = node.path("chapterId").isNumber() ? node.path("chapterId").asLong() : null;
            String chapterNumber = node.path("chapterNumber").isMissingNode() ? null : node.path("chapterNumber").asText(null);
            String mangaTitle = node.path("mangaTitle").isMissingNode() ? null : node.path("mangaTitle").asText(null);
            return new ChapterPayload(mangaId, chapterId, chapterNumber, mangaTitle);
        } catch (Exception ex) {
            log.warn("Failed to parse chapter payload: {}", ex.getMessage());
            return null;
        }
    }

    private void logSkipped(Long userId, Long notificationId, Long mangaId, List<ChapterPayload> chapters, String reason) {
        chapters.forEach(chapter -> logRepository.save(
                TelegramNotificationLog.builder()
                        .notificationId(notificationId)
                        .userId(userId)
                        .mangaId(mangaId)
                        .chapterId(chapter.chapterId())
                        .status(TelegramDeliveryStatus.SKIPPED)
                        .errorCode(reason)
                        .retryCount(0)
                        .build()
        ));
    }

    private String key(Long userId, Long mangaId) {
        return userId + ":" + mangaId;
    }

    private record ChapterPayload(Long mangaId, Long chapterId, String chapterNumber, String mangaTitle) {
    }

    private record SendOutcome(TelegramSendResult result, int attempts) {
    }

    private static final class AggregateBucket {
        private final Long userId;
        private final Long mangaId;
        private final List<ChapterPayload> chapters = Collections.synchronizedList(new ArrayList<>());
        private volatile ScheduledFuture<?> future;
        private volatile String mangaTitle;

        private AggregateBucket(Long userId, Long mangaId) {
            this.userId = userId;
            this.mangaId = mangaId;
        }

        private void add(ChapterPayload payload) {
            chapters.add(payload);
            if (StringUtils.hasText(payload.mangaTitle())) {
                mangaTitle = payload.mangaTitle();
            }
        }

        private void ensureScheduled(Runnable task, int delaySeconds, ScheduledExecutorService scheduler) {
            if (future != null && !future.isDone()) {
                return;
            }
            future = scheduler.schedule(task, Math.max(1, delaySeconds), TimeUnit.SECONDS);
        }

        private List<ChapterPayload> drain() {
            synchronized (chapters) {
                List<ChapterPayload> copy = new ArrayList<>(chapters);
                chapters.clear();
                return copy;
            }
        }

        private Long userId() {
            return userId;
        }

        private Long mangaId() {
            return mangaId;
        }

        private String mangaTitle() {
            return mangaTitle;
        }
    }
}
