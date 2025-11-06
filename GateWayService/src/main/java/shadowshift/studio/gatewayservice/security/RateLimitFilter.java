package shadowshift.studio.gatewayservice.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.AsyncBucketProxy;
import io.github.bucket4j.distributed.proxy.AsyncProxyManager;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import reactor.core.publisher.Mono;

@Component
@Order(-20)
@ConditionalOnProperty(name = "ratelimit.enabled", havingValue = "true", matchIfMissing = true)
public class RateLimitFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    private final RateLimitProperties rateLimitProperties;
    private final TokenIntrospectionService tokenIntrospectionService;
    private final ClientIpResolver clientIpResolver;
    private final AsyncProxyManager<byte[]> asyncProxyManager;
    private final MeterRegistry meterRegistry;

    private final Map<String, BucketConfiguration> configurationByRole = new ConcurrentHashMap<>();
    private final Map<String, byte[]> keyCache = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitProperties rateLimitProperties,
                           TokenIntrospectionService tokenIntrospectionService,
                           ClientIpResolver clientIpResolver,
                           ProxyManager<byte[]> proxyManager,
                           MeterRegistry meterRegistry) {
        this.rateLimitProperties = rateLimitProperties;
        this.tokenIntrospectionService = tokenIntrospectionService;
        this.clientIpResolver = clientIpResolver;
        this.asyncProxyManager = proxyManager.asAsync();
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (isStaticResource(path)) {
            return chain.filter(exchange);
        }

        return tokenIntrospectionService.resolveToken(exchange)
                .onErrorResume(ex -> {
                    TokenDetails errorDetails = TokenDetails.error(ex, Instant.now().plusSeconds(5));
                    exchange.getAttributes().put(TokenIntrospectionService.ATTRIBUTE_TOKEN_DETAILS, errorDetails);
                    return Mono.just(errorDetails);
                })
                .defaultIfEmpty(TokenDetails.anonymous())
                .flatMap(details -> applyRateLimit(details, exchange, chain));
    }

    private Mono<Void> applyRateLimit(TokenDetails details, ServerWebExchange exchange, WebFilterChain chain) {
    String method = Optional.ofNullable(exchange.getRequest().getMethod()).map(HttpMethod::name).orElse("GET");
        String path = exchange.getRequest().getURI().getPath();
        long weight = classifyRequestCost(path, method);

        boolean authenticated = details.isValid();
        String role = authenticated ? details.roleOrDefault() : "ANON";
        String subject = authenticated ? "user" : "ip";
        String identifier = authenticated ? "user:" + details.getUserId() : "ip:" + clientIpResolver.resolve(exchange.getRequest());
        String bucketKey = role + ':' + identifier;

        AsyncBucketProxy bucket = resolveBucket(bucketKey, role);

        return Mono.fromFuture(bucket.tryConsumeAndReturnRemaining(weight))
                .flatMap(probe -> {
                    meterRegistry.counter("gateway.ratelimit.attempts",
                            Tags.of("role", role, "subject", subject, "path", metricPath(path), "method", method))
                            .increment();

                    exchange.getResponse().getHeaders().set("X-RateLimit-Limit", String.valueOf(limitForRole(role)));
                    exchange.getResponse().getHeaders().set("X-RateLimit-Role", role);

                    if (!probe.isConsumed()) {
                        long waitSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
                        exchange.getResponse().getHeaders().set("Retry-After", String.valueOf(waitSeconds));
                        exchange.getResponse().getHeaders().set("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
                        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);

                        meterRegistry.counter("gateway.ratelimit.rejections",
                                Tags.of("role", role, "subject", subject, "path", metricPath(path), "method", method))
                                .increment();

                        logger.warn("Rate limit exceeded for key={} role={} remaining={} path={} method={} weight={}",
                                bucketKey, role, probe.getRemainingTokens(), path, method, weight);
                        return exchange.getResponse().setComplete();
                    }

                    exchange.getResponse().getHeaders().set("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
                    return chain.filter(exchange);
                });
    }

    private AsyncBucketProxy resolveBucket(String bucketKey, String role) {
        BucketConfiguration configuration = configurationByRole.computeIfAbsent(role, this::createConfigurationForRole);
        byte[] redisKey = keyCache.computeIfAbsent(bucketKey, key -> key.getBytes(StandardCharsets.UTF_8));
        return asyncProxyManager.builder().build(redisKey, () -> CompletableFuture.completedFuture(configuration));
    }

    private BucketConfiguration createConfigurationForRole(String role) {
        RatePlan plan = ratePlanForRole(role);
        Bandwidth bandwidth = Bandwidth.classic(plan.burst(), Refill.greedy(plan.refillTokensPerMinute(), Duration.ofMinutes(1)));
        return BucketConfiguration.builder()
                .addLimit(bandwidth)
                .build();
    }

    private long classifyRequestCost(String path, String method) {
        String upperMethod = method.toUpperCase(Locale.ROOT);
        if (!"GET".equals(upperMethod)) {
            if (path.contains("upload") || path.contains("import") || path.contains("/api/images")) {
                return 10;
            }
            return 5;
        }

        if (path.contains("/search") || path.contains("/suggest") || path.contains("/stream")) {
            return 3;
        }

        if (path.startsWith("/api/manga") || path.startsWith("/api/chapters") || path.startsWith("/api/comments")) {
            return 2;
        }

        return 1;
    }

    private String metricPath(String path) {
        if (!StringUtils.hasText(path) || "/".equals(path)) {
            return "/";
        }
        String[] segments = path.split("/");
        if (segments.length <= 2) {
            return path;
        }
        return "/" + segments[1] + "/" + segments[2];
    }

    private boolean isStaticResource(String path) {
        return path.equals("/favicon.ico")
                || path.startsWith("/static/")
                || path.startsWith("/css/")
                || path.startsWith("/js/")
                || path.startsWith("/images/")
                || path.startsWith("/assets/");
    }

    private int limitForRole(String role) {
        return switch (role) {
            case "ADMIN" -> rateLimitProperties.getAdminBurst();
            case "USER" -> rateLimitProperties.getUserBurst();
            default -> rateLimitProperties.getAnonBurst();
        };
    }

    private RatePlan ratePlanForRole(String role) {
        return switch (role) {
            case "ADMIN" -> new RatePlan(rateLimitProperties.getAdminBurst(), rateLimitProperties.getAdminRefillPerMinute());
            case "USER" -> new RatePlan(rateLimitProperties.getUserBurst(), rateLimitProperties.getUserRefillPerMinute());
            default -> new RatePlan(rateLimitProperties.getAnonBurst(), rateLimitProperties.getAnonRefillPerMinute());
        };
    }

    private record RatePlan(int burst, int refillTokensPerMinute) {}
}
