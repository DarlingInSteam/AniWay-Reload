package shadowshift.studio.gatewayservice.security;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import reactor.core.publisher.Mono;

/**
 * JwtAuthFilter теперь использует introspect endpoint AuthService и кеширует результаты на configurable TTL.
 */
@Component
@Order(-10)
public class JwtAuthFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final AuthProperties authProperties;
    private final TokenIntrospectionService tokenIntrospectionService;
    private final MeterRegistry meterRegistry;
    private final SessionCookieProperties sessionCookieProperties;

    public JwtAuthFilter(AuthProperties authProperties,
                         TokenIntrospectionService tokenIntrospectionService,
                         MeterRegistry meterRegistry,
                         SessionCookieProperties sessionCookieProperties) {
        this.authProperties = authProperties;
        this.tokenIntrospectionService = tokenIntrospectionService;
        this.meterRegistry = meterRegistry;
        this.sessionCookieProperties = sessionCookieProperties;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerWebExchange workingExchange = exchange;
        String path = workingExchange.getRequest().getURI().getPath();

        if (path.startsWith("/actuator")) {
            // Let Spring Boot actuator endpoints (e.g. Prometheus scrape) bypass auth completely
            return chain.filter(exchange);
        }

        HttpMethod method = workingExchange.getRequest().getMethod();
        if (path.startsWith("/api/moments")) {
            if (method == null || HttpMethod.GET.equals(method) || HttpMethod.HEAD.equals(method) || HttpMethod.OPTIONS.equals(method)) {
                logger.debug("Allowing unauthenticated {} request for {}", method != null ? method.name() : "GET", path);
                return chain.filter(exchange);
            }
        }

        // check public paths (fix handling of patterns ending with /** so /api/auth/** matches /api/auth/...)
        for (String p : authProperties.getPublicPaths()) {
            String trimmed = p.trim();
            if (trimmed.isEmpty()) continue;

            boolean wildcard = trimmed.endsWith("/**");
            String base = wildcard ? trimmed.substring(0, trimmed.length() - 3) : trimmed; // remove /**
            if (base.endsWith("/")) base = base.substring(0, base.length() - 1); // normalize

            if (path.equals(base) || path.startsWith(base + "/")) {
                if (path.contains("/api/levels")) {
                    logger.info("[JwtAuthFilter] Public match for levels path {} via pattern {}", path, trimmed);
                } else {
                    logger.debug("Path {} is public (matches pattern {})", path, trimmed);
                }
                return chain.filter(exchange);
            }
        }

        ServerHttpRequest request = workingExchange.getRequest();
        String authorization = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (!hasBearerToken(authorization)) {
            String cookieToken = extractTokenFromCookie(workingExchange);
            if (cookieToken != null) {
                ServerHttpRequest mutatedRequest = request.mutate()
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + cookieToken)
                        .build();
                workingExchange = workingExchange.mutate().request(mutatedRequest).build();
                authorization = mutatedRequest.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            }
        }

        if (!hasBearerToken(authorization)) {
            recordFailure("missing_token", path, methodOf(exchange));
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        ServerWebExchange finalExchange = workingExchange;
        return tokenIntrospectionService.resolveToken(finalExchange)
                .switchIfEmpty(Mono.defer(() -> {
                    recordFailure("missing_token", path, methodOf(exchange));
                    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                    return exchange.getResponse().setComplete()
                            .then(Mono.empty());
                }))
                .flatMap(details -> handleDetails(details, finalExchange, chain, path));
    }

    private Mono<Void> handleDetails(TokenDetails details, ServerWebExchange exchange, WebFilterChain chain, String path) {
        if (details.isError()) {
            Throwable error = details.getError();
            logger.warn("Introspection error for {}: {}", path, error != null ? error.getMessage() : "unknown");
            recordFailure("introspection_error", path, methodOf(exchange));
            exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
            return exchange.getResponse().setComplete();
        }

        if (!details.isValid()) {
            recordFailure("invalid_token", path, methodOf(exchange));
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header("X-User-Id", details.getUserId())
                .header("X-User-Role", details.roleOrDefault())
                .build();
        ServerWebExchange mutatedExchange = exchange.mutate().request(mutatedRequest).build();
        return chain.filter(mutatedExchange);
    }

    private void recordFailure(String reason, String path, String method) {
        meterRegistry.counter("gateway.auth.failures", Tags.of("reason", reason, "method", method, "path", shortenPath(path)))
                .increment();
    }

    private String methodOf(ServerWebExchange exchange) {
        return Optional.ofNullable(exchange.getRequest().getMethod())
                .map(HttpMethod::name)
                .orElse("UNKNOWN");
    }

    private String shortenPath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        String[] segments = path.split("/");
        if (segments.length <= 2) {
            return path;
        }
        return "/" + segments[1] + "/" + segments[2];
    }

    private boolean hasBearerToken(String authorization) {
        return authorization != null && authorization.startsWith("Bearer ");
    }

    private String extractTokenFromCookie(ServerWebExchange exchange) {
        var cookie = exchange.getRequest().getCookies().getFirst(sessionCookieProperties.getCookieName());
        if (cookie == null) {
            return null;
        }
        String value = cookie.getValue();
        return StringUtils.hasText(value) ? value : null;
    }
}
