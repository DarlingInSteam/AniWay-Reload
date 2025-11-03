package shadowshift.studio.momentservice.metrics;

import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;
import shadowshift.studio.momentservice.entity.Moment;
import shadowshift.studio.momentservice.entity.ReactionType;

@Component
public class MomentMetrics {

    private static final String CREATED_TOTAL = "moments.created.total";
    private static final String REACTIONS_SET = "moments.reactions.set";
    private static final String REACTIONS_CLEARED = "moments.reactions.cleared";
    private static final String RATE_LIMITED = "moments.rate_limited";
    private static final String UPLOAD_SIZE = "moments.upload.bytes";
    private static final String UPLOAD_TIMER = "moments.upload.duration";

    private final MeterRegistry registry;
    private final DistributionSummary uploadSizeSummary;
    private final Timer uploadTimer;

    public MomentMetrics(MeterRegistry registry) {
        this.registry = registry;
        this.uploadSizeSummary = DistributionSummary.builder(UPLOAD_SIZE)
            .description("Size of successfully uploaded moment images")
            .baseUnit("bytes")
            .publishPercentileHistogram()
            .register(registry);
        this.uploadTimer = Timer.builder(UPLOAD_TIMER)
            .description("Time spent handling moment creation")
            .publishPercentileHistogram()
            .register(registry);
    }

    public void recordMomentCreated(Moment moment, long durationNanos) {
        registry.counter(CREATED_TOTAL).increment();
        uploadSizeSummary.record(moment.getFileSize());
        uploadTimer.record(durationNanos, TimeUnit.NANOSECONDS);
    }

    public void recordReactionSet(ReactionType reactionType) {
        String reaction = reactionType != null ? reactionType.name() : "UNKNOWN";
        registry.counter(REACTIONS_SET, Tags.of("reaction", reaction)).increment();
    }

    public void recordReactionCleared() {
        registry.counter(REACTIONS_CLEARED).increment();
    }

    public void recordRateLimitHit(String reason) {
        registry.counter(RATE_LIMITED, Tags.of("reason", reason)).increment();
    }
}
