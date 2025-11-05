package shadowshift.studio.authservice.metrics;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import shadowshift.studio.authservice.repository.UserRepository;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Publishes business-level metrics for AuthService that back Grafana dashboards and alerts.
 * <p>
 * Metrics exposed:
 * <ul>
 *     <li>{@code aniway_auth_active_users} &mdash; number of users considered active in the recent window.</li>
 *     <li>{@code aniway_auth_new_users_daily} &mdash; count of registrations within the last 24 hours.</li>
 * </ul>
 */
@Component
@Slf4j
public class AuthBusinessMetrics {

    private final UserRepository userRepository;
    private final AtomicLong activeUsersGauge;
    private final AtomicLong newUsersDailyGauge;

    private final int activeUsersWindowHours;
    private final long refreshIntervalMs;

    public AuthBusinessMetrics(
            UserRepository userRepository,
            MeterRegistry meterRegistry,
            @Value("${metrics.auth.active-users-window-hours:168}") int activeUsersWindowHours,
            @Value("${metrics.auth.refresh-ms:60000}") long refreshIntervalMs
    ) {
        this.userRepository = userRepository;
        this.activeUsersWindowHours = activeUsersWindowHours;
        this.refreshIntervalMs = refreshIntervalMs;
        this.activeUsersGauge = new AtomicLong(0L);
        this.newUsersDailyGauge = new AtomicLong(0L);

        Gauge.builder("aniway_auth_active_users", activeUsersGauge, AtomicLong::get)
                .description("Количество пользователей, проявивших активность за последний период (rolling window)")
                .register(meterRegistry);

        Gauge.builder("aniway_auth_new_users_daily", newUsersDailyGauge, AtomicLong::get)
                .description("Количество новых пользователей, зарегистрировавшихся за последние 24 часа")
                .register(meterRegistry);
    }

    @Scheduled(fixedDelayString = "${metrics.auth.refresh-ms:60000}")
    public void refreshGauges() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime activeCutoff = now.minusHours(activeUsersWindowHours);
        long activeUsers = userRepository.countActiveSince(activeCutoff);
        activeUsersGauge.set(activeUsers);

        LocalDateTime newUsersCutoff = now.minusHours(24);
        long newUsers = userRepository.countByCreatedAtAfter(newUsersCutoff);
        newUsersDailyGauge.set(newUsers);

        log.debug("Auth metrics updated: activeUsers={}, newUsersDaily={}, windowHours={}, refreshMs={}",
                activeUsers, newUsers, activeUsersWindowHours, refreshIntervalMs);
    }
}
