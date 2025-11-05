package shadowshift.studio.notificationservice.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import shadowshift.studio.notificationservice.domain.NotificationRepository;
import shadowshift.studio.notificationservice.domain.NotificationStatus;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Publishes notification-related business metrics consumed by Grafana dashboards.
 */
@Component
@Slf4j
public class NotificationBusinessMetrics {

    private final NotificationRepository notificationRepository;
    private final Counter sentCounter;
    private final AtomicLong pendingGauge;

    public NotificationBusinessMetrics(
            NotificationRepository notificationRepository,
            MeterRegistry meterRegistry,
            @Value("${metrics.notification.refresh-ms:60000}") long refreshMs
    ) {
        this.notificationRepository = notificationRepository;
        this.pendingGauge = new AtomicLong(0L);
        this.sentCounter = Counter.builder("aniway_notification_sent_total")
                .description("Количество уведомлений, успешно поставленных в очередь на доставку")
                .register(meterRegistry);
        Gauge.builder("aniway_notification_deliveries_pending", pendingGauge, AtomicLong::get)
                .description("Количество уведомлений, ожидающих доставки (по статусу UNREAD)")
                .register(meterRegistry);

        refreshPendingGauge();
        log.debug("Notification metrics initialised with refreshMs={}", refreshMs);
    }

    public void recordQueuedNotification() {
        sentCounter.increment();
    }

    @Scheduled(fixedDelayString = "${metrics.notification.refresh-ms:60000}")
    public void refreshPendingGauge() {
        long pending = notificationRepository.countByStatus(NotificationStatus.UNREAD);
        pendingGauge.set(pending);
        log.debug("Notification metrics updated: sent_total={}, pending_unread={}", sentCounter.count(), pending);
    }
}
