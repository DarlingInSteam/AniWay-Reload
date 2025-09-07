package shadowshift.studio.gatewayservice.security;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    private final AuthProperties authProperties;

    // key -> bucket
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    private Bucket createBucketForKey(String key) {
        // Different limits for authenticated users and anonymous IPs
        if (key.startsWith("user:")) {
            // authenticated users: burst 300, refill 120/min
            Bandwidth limit = Bandwidth.classic(300, Refill.greedy(120, Duration.ofMinutes(1)));
            return Bucket4j.builder().addLimit(limit).build();
        } else {
            // anonymous IPs: stricter burst 60, refill 30/min
            Bandwidth limit = Bandwidth.classic(60, Refill.greedy(30, Duration.ofMinutes(1)));
            return Bucket4j.builder().addLimit(limit).build();
        }
    }

    private boolean isPublicPath(String path) {
        List<String> publicPaths = authProperties.getPublicPaths();
        for (String p : publicPaths) {
            String trimmed = p.trim();
            if (trimmed.endsWith("/**")) {
                String prefix = trimmed.substring(0, trimmed.length() - 3);
                if (path.startsWith(prefix)) return true;
            } else {
                if (path.equals(trimmed) || path.startsWith(trimmed)) return true;
            }
        }
        // also static assets
        if (path.startsWith("/favicon.ico") || path.startsWith("/static/") || path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/images/")) return true;
        return false;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        // prefer per-user limiting if header present
        String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
        String key;
        if (userId != null && !userId.isBlank()) {
            key = "user:" + userId;
        } else {
            String ip = exchange.getRequest().getRemoteAddress() != null ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress() : "unknown";
            key = "ip:" + ip;
        }

        Bucket bucket = buckets.computeIfAbsent(key, k -> createBucketForKey(k));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            long waitForRefillSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000L;
            logger.warn("Rate limit exceeded for key={}; remaining={}", key, probe.getRemainingTokens());
            exchange.getResponse().getHeaders().add("Retry-After", String.valueOf(waitForRefillSeconds));
            int limitValue = key.startsWith("user:") ? 300 : 60;
            exchange.getResponse().getHeaders().add("X-RateLimit-Limit", String.valueOf(limitValue));
            exchange.getResponse().getHeaders().add("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return exchange.getResponse().setComplete();
        } else {
            int limitValue = key.startsWith("user:") ? 300 : 60;
            exchange.getResponse().getHeaders().add("X-RateLimit-Limit", String.valueOf(limitValue));
            exchange.getResponse().getHeaders().add("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
        }

        return chain.filter(exchange);
    }
}
