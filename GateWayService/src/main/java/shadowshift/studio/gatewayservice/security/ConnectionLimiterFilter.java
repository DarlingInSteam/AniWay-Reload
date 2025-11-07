package shadowshift.studio.gatewayservice.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import reactor.core.publisher.Mono;

/**
 * Limits the number of concurrent SSE/WebSocket connections per user or IP to prevent abuse
 * of long-lived transports.
 */
@Component
@Order(-15)
@ConditionalOnProperty(name = "ratelimit.enabled", havingValue = "true", matchIfMissing = true)
public class ConnectionLimiterFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(ConnectionLimiterFilter.class);

    private final ReactiveRedisConnectionFacade redisFacade;
    private final TokenIntrospectionService tokenIntrospectionService;
    private final ClientIpResolver clientIpResolver;
    private final RateLimitProperties properties;
    private final MeterRegistry meterRegistry;

    public ConnectionLimiterFilter(ReactiveRedisConnectionFacade redisFacade,
                                   TokenIntrospectionService tokenIntrospectionService,
                                   ClientIpResolver clientIpResolver,
                                   RateLimitProperties properties,
                                   MeterRegistry meterRegistry) {
        this.redisFacade = redisFacade;
        this.tokenIntrospectionService = tokenIntrospectionService;
        this.clientIpResolver = clientIpResolver;
        this.properties = properties;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        Optional<TransportKind> transportKind = detectTransport(exchange.getRequest());
        if (transportKind.isEmpty()) {
            return chain.filter(exchange);
        }

        return tokenIntrospectionService.resolveToken(exchange)
                .onErrorResume(ex -> {
                    TokenDetails errorDetails = TokenDetails.error(ex, Instant.now().plusSeconds(5));
                    exchange.getAttributes().put(TokenIntrospectionService.ATTRIBUTE_TOKEN_DETAILS, errorDetails);
                    return Mono.just(errorDetails);
                })
                .defaultIfEmpty(TokenDetails.anonymous())
                .flatMap(details -> enforceLimit(details, transportKind.get(), exchange, chain));
    }

    private Mono<Void> enforceLimit(TokenDetails details, TransportKind kind, ServerWebExchange exchange, WebFilterChain chain) {
        boolean authenticated = details.isValid();
    int limit = authenticated ? properties.getConnection().getMaxPerUser() : properties.getConnection().getMaxPerIp();
        String identifier = authenticated ? "user:" + details.getUserId() : "ip:" + clientIpResolver.resolve(exchange.getRequest());
        String redisKey = "gw:conn:" + kind.key + ':' + identifier;
    Duration ttl = properties.getConnection().ttl();

        return redisFacade.increment(redisKey)
                .flatMap(count -> redisFacade.expire(redisKey, ttl)
                        .then(Mono.defer(() -> {
                            if (count > limit) {
                                meterRegistry.counter("gateway.connection.rejections",
                                        Tags.of("transport", kind.key, "reason", "too_many", "subject", authenticated ? "user" : "ip"))
                                        .increment();
                                logger.warn("Connection rejection for {} ({}), limit={}, current={}, transport={}",
                                        identifier, authenticated ? "auth" : "anon", limit, count, kind.key);
                                return redisFacade.decrement(redisKey)
                                        .then(sendTooManyConnections(exchange, kind, limit));
                            }

                            long started = System.nanoTime();
                            meterRegistry.counter("gateway.connection.accepted",
                                    Tags.of("transport", kind.key, "subject", authenticated ? "user" : "ip"))
                                    .increment();

                            return chain.filter(exchange)
                                    .doFinally(signal -> {
                                        long duration = System.nanoTime() - started;
                                        meterRegistry.timer("gateway.connection.duration",
                                                Tags.of("transport", kind.key, "subject", authenticated ? "user" : "ip"))
                                                .record(duration, TimeUnit.NANOSECONDS);
                                        redisFacade.decrement(redisKey).subscribe();
                                    });
                        })));
    }

    private Mono<Void> sendTooManyConnections(ServerWebExchange exchange, TransportKind kind, int limit) {
        exchange.getResponse().setStatusCode(kind.responseStatus);
    exchange.getResponse().getHeaders().set("Retry-After", String.valueOf(properties.getConnection().getKeyTtlSeconds()));
        exchange.getResponse().getHeaders().set("X-Connection-Limit", String.valueOf(limit));
        return exchange.getResponse().setComplete();
    }

    private Optional<TransportKind> detectTransport(ServerHttpRequest request) {
        HttpHeaders headers = request.getHeaders();
        String upgrade = headers.getUpgrade();
        if (upgrade != null && "websocket".equalsIgnoreCase(upgrade)) {
            return Optional.of(TransportKind.WEBSOCKET);
        }
        if (headers.containsKey("Sec-WebSocket-Key")) {
            return Optional.of(TransportKind.WEBSOCKET);
        }
        if (headers.getAccept() != null && headers.getAccept().stream().anyMatch(mediaType -> mediaType.isCompatibleWith(MediaType.TEXT_EVENT_STREAM))) {
            return Optional.of(TransportKind.SSE);
        }
        return Optional.empty();
    }

    private enum TransportKind {
        WEBSOCKET("ws", HttpStatus.TOO_MANY_REQUESTS),
        SSE("sse", HttpStatus.TOO_MANY_REQUESTS);

        private final String key;
        private final HttpStatus responseStatus;

        TransportKind(String key, HttpStatus responseStatus) {
            this.key = key;
            this.responseStatus = responseStatus;
        }
    }
}
