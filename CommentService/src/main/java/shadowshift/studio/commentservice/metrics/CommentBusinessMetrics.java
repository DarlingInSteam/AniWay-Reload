package shadowshift.studio.commentservice.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import shadowshift.studio.commentservice.repository.CommentRepository;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Aggregates business-focused metrics for CommentService that power Grafana dashboards
 * and alerting rules.
 */
@Component
@Slf4j
public class CommentBusinessMetrics {

    private final CommentRepository commentRepository;
    private final boolean moderationMetricsEnabled;
    private final Counter commentsCreatedCounter;
    private final AtomicLong pendingModerationGauge;

    public CommentBusinessMetrics(
            CommentRepository commentRepository,
            MeterRegistry meterRegistry,
            @Value("${metrics.comment.moderation-enabled:false}") boolean moderationMetricsEnabled
    ) {
        this.commentRepository = commentRepository;
        this.moderationMetricsEnabled = moderationMetricsEnabled;
        this.pendingModerationGauge = new AtomicLong(0L);
        this.commentsCreatedCounter = Counter.builder("aniway_comment_created_total")
                .description("Суммарное количество созданных комментариев")
                .register(meterRegistry);
        Gauge.builder("aniway_comment_pending_moderation_total", pendingModerationGauge, AtomicLong::get)
                .description("Количество комментариев, ожидающих модерации (если включено)")
                .register(meterRegistry);

        updatePendingModerationGauge();
    }

    /**
     * Records a freshly created comment.
     */
    public void recordCommentCreated() {
        commentsCreatedCounter.increment();
    }

    /**
     * Schedules periodic refresh of moderation backlog gauge so dashboards do not show stale numbers.
     */
    @Scheduled(fixedDelayString = "${metrics.comment.refresh-ms:60000}")
    public void updatePendingModerationGauge() {
        long pending = moderationMetricsEnabled ? commentRepository.countPendingModeration() : 0L;
        pendingModerationGauge.set(pending);
        log.debug("Comment metrics updated: created_total={}, pending_moderation={}, moderationEnabled={}",
                commentsCreatedCounter.count(), pending, moderationMetricsEnabled);
    }
}
