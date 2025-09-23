package shadowshift.studio.gatewayservice.security;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import io.github.bucket4j.ConsumptionProbe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RateLimitFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    private final AuthProperties authProperties;
    private final RateLimitProperties rateLimitProperties;

    // key -> bucket
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(AuthProperties authProperties, RateLimitProperties rateLimitProperties) {
        this.authProperties = authProperties;
        this.rateLimitProperties = rateLimitProperties;
    }

    private Bucket createBucketForKey(String key, String role) {
        int burst;
        int refill;
        switch (role) {
            case "ADMIN":
                burst = rateLimitProperties.getAdminBurst();
                refill = rateLimitProperties.getAdminRefillPerMinute();
                break;
            case "USER":
                burst = rateLimitProperties.getUserBurst();
                refill = rateLimitProperties.getUserRefillPerMinute();
                break;
            default:
                burst = rateLimitProperties.getAnonBurst();
                refill = rateLimitProperties.getAnonRefillPerMinute();
        }
        Bandwidth limit = Bandwidth.classic(burst, Refill.greedy(refill, Duration.ofMinutes(1)));
        return Bucket4j.builder().addLimit(limit).build();
    }

    private boolean isPublicPath(String path) {
        for (String p : authProperties.getPublicPaths()) {
            String trimmed = p.trim();
            if (trimmed.isEmpty()) continue;
            if (trimmed.endsWith("/**")) {
                String prefix = trimmed.substring(0, trimmed.length() - 3);
                if (path.equals(prefix) || path.startsWith(prefix + "/")) return true;
            } else {
                if (path.equals(trimmed) || path.startsWith(trimmed + "/")) return true;
            }
        }
        if (path.equals("/favicon.ico") || path.startsWith("/static/") || path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/images/")) return true;
        return false;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String role = exchange.getRequest().getHeaders().getFirst("X-User-Role");
        String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");
        if (role == null || role.isBlank()) role = "ANON";

        // classify cost (simple heuristic)
    long cost = classifyRequestCost(path, exchange.getRequest().getMethod() != null ? exchange.getRequest().getMethod().name() : "GET");

        String key;
        if (userId != null && !userId.isBlank()) {
            key = role + ":user:" + userId;
        } else {
            String ip = exchange.getRequest().getRemoteAddress() != null ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress() : "unknown";
            key = role + ":ip:" + ip;
        }

        String finalRole = role;
        Bucket bucket = buckets.computeIfAbsent(key, k -> createBucketForKey(k, finalRole));
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(cost);
        if (!probe.isConsumed()) {
            long waitForRefillSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000L;
            logger.warn("Rate limit exceeded for key={} role={} remaining={} path={} cost={}", key, role, probe.getRemainingTokens(), path, cost);
            exchange.getResponse().getHeaders().add("Retry-After", String.valueOf(waitForRefillSeconds));
            // We cannot call getConfiguration() on older Bucket4j versions; reuse cost heuristics by exposing original burst
            exchange.getResponse().getHeaders().add("X-RateLimit-Limit", deriveLimitForRole(role));
            exchange.getResponse().getHeaders().add("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            exchange.getResponse().getHeaders().add("X-RateLimit-Role", role);
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return exchange.getResponse().setComplete();
        } else {
            exchange.getResponse().getHeaders().add("X-RateLimit-Limit", deriveLimitForRole(role));
            exchange.getResponse().getHeaders().add("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            exchange.getResponse().getHeaders().add("X-RateLimit-Role", role);
        }

        return chain.filter(exchange);
    }

    private long classifyRequestCost(String path, String method) {
        // Light endpoints (ping, small GET): cost 1
        // Medium (list pages, catalog queries): cost 2
        // Heavy (uploads, mutations): cost 5
        String m = method.toUpperCase();
        if (!m.equals("GET")) {
            return 5;
        }
        if (path.startsWith("/api/manga") || path.startsWith("/api/chapters") || path.startsWith("/api/search")) {
            return 2;
        }
        return 1;
    }

    private String deriveLimitForRole(String role) {
        switch (role) {
            case "ADMIN": return String.valueOf(rateLimitProperties.getAdminBurst());
            case "USER": return String.valueOf(rateLimitProperties.getUserBurst());
            default: return String.valueOf(rateLimitProperties.getAnonBurst());
        }
    }
}
