package shadowshift.studio.notificationservice.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;
import shadowshift.studio.notificationservice.domain.Notification;
import shadowshift.studio.notificationservice.domain.NotificationType;
import shadowshift.studio.notificationservice.domain.TelegramDeliveryStatus;
import shadowshift.studio.notificationservice.domain.TelegramNotificationLog;
import shadowshift.studio.notificationservice.domain.TelegramNotificationLogRepository;
import shadowshift.studio.notificationservice.dto.TelegramRecipient;

import java.math.BigDecimal;
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

/**
 * Handles Telegram notifications delivery, including optional aggregation windows,
 * per-chapter deduplication, and retry/backoff logic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramNotificationService {

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

    private void deliverAggregated(Long userId,
                                   Long notificationId,
                                   Long mangaId,
                                   String mangaTitle,
                                   List<ChapterPayload> chapters) {
        try {
            List<ChapterPayload> uniqueChapters = filterAlreadyDelivered(userId, chapters);
            if (uniqueChapters.isEmpty()) {
                return;
            }

            Optional<TelegramRecipient> recipientOpt = authServiceTelegramClient.getRecipientForUser(userId);
            if (recipientOpt.isEmpty()) {
                log.debug("Telegram skip: user {} has no linked account", userId);
                logSkipped(userId, notificationId, mangaId, uniqueChapters, "NO_RECIPIENT");
                return;
            }
            TelegramRecipient recipient = recipientOpt.get();
            if (!recipient.notificationsEnabled() || recipient.chatId() == null) {
                log.debug("Telegram skip: notifications disabled for user {}", userId);
                logSkipped(userId, notificationId, mangaId, uniqueChapters, "DISABLED");
                return;
            }

            for (ChapterPayload chapter : uniqueChapters) {
                String effectiveTitle = resolveMangaTitle(mangaTitle, chapter);
                String message = composeSingleMessage(effectiveTitle, chapter);
                SendOutcome outcome = sendWithRetry(recipient.chatId(), message);
                TelegramSendResult result = outcome.result();

                if (result.success()) {
                    logRepository.save(
                            TelegramNotificationLog.builder()
                                    .notificationId(notificationId)
                                    .userId(userId)
                                    .chatId(recipient.chatId())
                                    .mangaId(mangaId != null ? mangaId : chapter.mangaId())
                                    .chapterId(chapter.chapterId())
                                    .status(TelegramDeliveryStatus.SUCCESS)
                                    .retryCount(outcome.attempts())
                                    .payload(message)
                                    .build()
                    );
                } else {
                    if ("403".equals(result.errorCode())) {
                        authServiceTelegramClient.unlinkByChat(recipient.chatId(), "FORBIDDEN");
                    }
                    logRepository.save(
                            TelegramNotificationLog.builder()
                                    .notificationId(notificationId)
                                    .userId(userId)
                                    .chatId(recipient.chatId())
                                    .mangaId(mangaId != null ? mangaId : chapter.mangaId())
                                    .chapterId(chapter.chapterId())
                                    .status(TelegramDeliveryStatus.FAILED)
                                    .errorCode(result.errorCode())
                                    .errorMessage(result.description())
                                    .retryCount(outcome.attempts())
                                    .payload(message)
                                    .build()
                    );
                }
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
            if (chapter.chapterId() != null
                    && logRepository.existsByUserIdAndChapterIdAndStatus(userId, chapter.chapterId(), TelegramDeliveryStatus.SUCCESS)) {
                continue;
            }
            filtered.add(chapter);
        }
        return filtered;
    }

    private String composeSingleMessage(String mangaTitle, ChapterPayload chapter) {
        StringBuilder sb = new StringBuilder();
        String emoji = StringUtils.hasText(properties.getTitleEmoji())
                ? properties.getTitleEmoji()
                : "\uD83D\uDCE2"; // 📢 fallback

        String chapterLabel = formatChapterNumber(chapter);
        sb.append(emoji).append(' ').append("Добавлена новая");
        if (chapterLabel != null) {
            sb.append(' ').append(chapterLabel);
        }
        sb.append(" глава");
        if (StringUtils.hasText(mangaTitle)) {
            sb.append(' ').append("манги ").append(mangaTitle);
        }

        String promoLine = properties.getPromoLine();
        if (StringUtils.hasText(promoLine)) {
            sb.append("\n\n").append(promoLine);
        }

        String shareLine = properties.getShareLine();
        if (StringUtils.hasText(shareLine)) {
            sb.append("\n\n").append(shareLine);
        }

        String link = renderChapterLink(chapter);
        if (link == null) {
            link = renderMangaLink(chapter);
        }
        if (link != null) {
            sb.append("\n\n").append(link);
        }

        return sb.toString();
    }

    private String renderChapterLink(ChapterPayload chapter) {
        String template = properties.getChapterLinkTemplate();
        if (!StringUtils.hasText(template)) {
            template = defaultBaseUrl() + "/reader/{chapterId}";
        }
        String expanded = expandTemplate(template, chapter, true);
        if (expanded == null) {
            String fallback = defaultBaseUrl();
            if (chapter.chapterId() != null) {
                if (StringUtils.hasText(chapter.mangaSlug())) {
                    expanded = fallback + "/reader/" + chapter.mangaSlug() + "/" + chapter.chapterId();
                } else {
                    expanded = fallback + "/reader/" + chapter.chapterId();
                }
            }
        }
        return appendUtm(expanded);
    }

    private String renderMangaLink(ChapterPayload chapter) {
        String template = properties.getMangaLinkTemplate();
        if (!StringUtils.hasText(template)) {
            template = defaultBaseUrl() + "/manga/{mangaSlug}";
        }
        String expanded = expandTemplate(template, chapter, false);
        return appendUtm(expanded);
    }

    private String expandTemplate(String template, ChapterPayload chapter, boolean expectChapter) {
        if (!StringUtils.hasText(template)) {
            return null;
        }
        String result = template;
        if (result.contains("{mangaSlug}")) {
            String slug = chapter.mangaSlug();
            if (!StringUtils.hasText(slug)) {
                if (chapter.mangaId() != null) {
                    slug = String.valueOf(chapter.mangaId());
                } else {
                    return null;
                }
            }
            result = result.replace("{mangaSlug}", slug);
        }
        if (result.contains("{mangaId}")) {
            if (chapter.mangaId() == null) {
                return null;
            }
            result = result.replace("{mangaId}", String.valueOf(chapter.mangaId()));
        }
        if (result.contains("{chapterId}")) {
            if (chapter.chapterId() == null) {
                if (expectChapter) {
                    return null;
                }
                result = result.replace("{chapterId}", "");
            } else {
                result = result.replace("{chapterId}", String.valueOf(chapter.chapterId()));
            }
        }
        return result;
    }

    private String appendUtm(String url) {
        if (!StringUtils.hasText(url)) {
            return null;
        }
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(url);
        if (StringUtils.hasText(properties.getUtmSource())) {
            builder.queryParam("utm_source", properties.getUtmSource());
        }
        if (StringUtils.hasText(properties.getUtmMedium())) {
            builder.queryParam("utm_medium", properties.getUtmMedium());
        }
        if (StringUtils.hasText(properties.getUtmCampaign())) {
            builder.queryParam("utm_campaign", properties.getUtmCampaign());
        }
        return builder.build(true).toUriString();
    }

    private String defaultBaseUrl() {
        return StringUtils.hasText(properties.getSiteBaseUrl())
                ? properties.getSiteBaseUrl()
                : "https://aniway.space";
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
            String title = node.path("mangaTitle").isMissingNode() ? null : node.path("mangaTitle").asText(null);
            String slug = node.path("mangaSlug").isMissingNode() ? null : node.path("mangaSlug").asText(null);
            return new ChapterPayload(mangaId, chapterId, chapterNumber, title, slug);
        } catch (Exception ex) {
            log.warn("Failed to parse chapter payload: {}", ex.getMessage());
            return null;
        }
    }

    private void logSkipped(Long userId,
                             Long notificationId,
                             Long fallbackMangaId,
                             List<ChapterPayload> chapters,
                             String reason) {
        chapters.forEach(chapter -> logRepository.save(
                TelegramNotificationLog.builder()
                        .notificationId(notificationId)
                        .userId(userId)
                        .mangaId(fallbackMangaId != null ? fallbackMangaId : chapter.mangaId())
                        .chapterId(chapter.chapterId())
                        .status(TelegramDeliveryStatus.SKIPPED)
                        .errorCode(reason)
                        .retryCount(0)
                        .build()
        ));
    }

    private String resolveMangaTitle(String aggregatedTitle, ChapterPayload chapter) {
        if (StringUtils.hasText(chapter.mangaTitle())) {
            return chapter.mangaTitle();
        }
        if (StringUtils.hasText(aggregatedTitle)) {
            return aggregatedTitle;
        }
        return null;
    }

    private String formatChapterNumber(ChapterPayload chapter) {
        String number = chapter.chapterNumber();
        if (StringUtils.hasText(number)) {
            try {
                BigDecimal decimal = new BigDecimal(number.trim());
                return decimal.stripTrailingZeros().toPlainString();
            } catch (NumberFormatException ex) {
                return number.trim();
            }
        }
        if (chapter.chapterId() != null) {
            return String.valueOf(chapter.chapterId());
        }
        return null;
    }

    private String key(Long userId, Long mangaId) {
        return userId + ":" + mangaId;
    }

    private record ChapterPayload(Long mangaId, Long chapterId, String chapterNumber, String mangaTitle, String mangaSlug) {
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
