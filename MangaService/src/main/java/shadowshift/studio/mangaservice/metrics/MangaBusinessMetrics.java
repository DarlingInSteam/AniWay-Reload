package shadowshift.studio.mangaservice.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import shadowshift.studio.mangaservice.repository.MangaRepository;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Central place for business metrics emitted by MangaService.
 * <p>
 * Provides counters and gauges that are consumed by the new Prometheus-based monitoring stack
 * (Grafana dashboards, alerting). The metrics are aligned with expectations from
 * {@code monitoring/prometheus/alerts.yml} and business dashboards.
 */
@Component
public class MangaBusinessMetrics {

    private static final Logger logger = LoggerFactory.getLogger(MangaBusinessMetrics.class);

    private final MangaRepository mangaRepository;
    private final Counter chapterReadsCounter;
    private final AtomicLong totalTitlesGauge;

    public MangaBusinessMetrics(
        MangaRepository mangaRepository,
        MeterRegistry meterRegistry
    ) {
        this.mangaRepository = mangaRepository;
        this.totalTitlesGauge = new AtomicLong(0L);

        Gauge.builder("aniway_manga_total_titles", totalTitlesGauge, AtomicLong::get)
            .description("Количество опубликованных тайтлов в каталоге AniWay")
            .register(meterRegistry);

        this.chapterReadsCounter = Counter.builder("aniway_manga_chapter_reads_total")
            .description("Суммарное число событий чтения глав (по данным MangaService)")
            .register(meterRegistry);

        refreshTotalTitles();
    }

    /**
     * Records a single chapter reading event.
     *
     * @param mangaId идентификатор манги, для которой зафиксировано чтение
     * @param userId  идентификатор пользователя, инициировавшего чтение (опционально)
     */
    public void recordChapterRead(Long mangaId, Long userId) {
        if (logger.isDebugEnabled()) {
            logger.debug("Recording chapter read event for mangaId={}, userId={}", mangaId, userId);
        }
        chapterReadsCounter.increment();
    }

    /**
     * Forces gauge refresh, e.g. after создания/удаления манги.
     */
    public void refreshTotalTitles() {
        long total = mangaRepository.count();
        totalTitlesGauge.set(total);
        if (logger.isDebugEnabled()) {
            logger.debug("Refreshed aniway_manga_total_titles gauge: {}", total);
        }
    }

    /**
     * Periodically refreshes {@code aniway_manga_total_titles} gauge to keep data fresh even без событий.
     */
    @Scheduled(initialDelay = 0, fixedDelayString = "${metrics.manga.title-refresh-ms:60000}")
    public void scheduledRefresh() {
        refreshTotalTitles();
    }
}
