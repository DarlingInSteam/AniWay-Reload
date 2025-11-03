package shadowshift.studio.momentservice.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.momentservice.config.MomentRateLimitProperties;
import shadowshift.studio.momentservice.metrics.MomentMetrics;
import shadowshift.studio.momentservice.repository.MomentRepository;

@Component
public class MomentRateLimiter {

    private static final Logger log = LoggerFactory.getLogger(MomentRateLimiter.class);

    private final MomentRepository momentRepository;
    private final MomentRateLimitProperties properties;
    private final MomentMetrics momentMetrics;

    public MomentRateLimiter(MomentRepository momentRepository,
                             MomentRateLimitProperties properties,
                             MomentMetrics momentMetrics) {
        this.momentRepository = momentRepository;
        this.properties = properties;
        this.momentMetrics = momentMetrics;
    }

    public void assertAllowed(Long uploaderId, long newUploadSizeBytes) {
        if (uploaderId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (!properties.isEnabled()) {
            return;
        }
        if (properties.getMaxPerWindow() <= 0 || properties.getWindowHours() <= 0) {
            return;
        }
        Instant windowStart = Instant.now().minus(properties.getWindowHours(), ChronoUnit.HOURS);
        long uploadsInWindow = momentRepository.countByUploaderIdAndCreatedAtGreaterThanEqual(uploaderId, windowStart);
        if (uploadsInWindow >= properties.getMaxPerWindow()) {
            log.warn("Rate limit exceeded for user {}: {} uploads in last {}h", uploaderId, uploadsInWindow, properties.getWindowHours());
            momentMetrics.recordRateLimitHit("max_count");
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                String.format("Upload limit reached: max %d moments per %d hours", properties.getMaxPerWindow(), properties.getWindowHours()));
        }
        long maxBytes = properties.getMaxBytesPerWindow();
        if (maxBytes > 0) {
            long bytesInWindow = momentRepository.sumFileSizeByUploaderIdSince(uploaderId, windowStart);
            if (bytesInWindow + newUploadSizeBytes > maxBytes) {
                log.warn("Rate limit exceeded for user {}: {} bytes already uploaded in last {}h", uploaderId, bytesInWindow, properties.getWindowHours());
                momentMetrics.recordRateLimitHit("max_bytes");
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    String.format("Upload traffic limit reached: max %.2f MB per %d hours", maxBytes / 1_048_576.0, properties.getWindowHours()));
            }
        }
    }
}
