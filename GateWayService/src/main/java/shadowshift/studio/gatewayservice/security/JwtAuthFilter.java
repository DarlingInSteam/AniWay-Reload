package shadowshift.studio.gatewayservice.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JwtAuthFilter теперь использует introspect endpoint AuthService и кеширует результаты на configurable TTL.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class JwtAuthFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtAuthFilter.class);

    private final AuthProperties authProperties;
    private final WebClient webClient;

    // cache token -> (valid, userId, username, role, expiryInstant)
    private final ConcurrentHashMap<String, CachedIntrospect> cache = new ConcurrentHashMap<>();

    public JwtAuthFilter(AuthProperties authProperties, WebClient.Builder webClientBuilder) {
        this.authProperties = authProperties;
        this.webClient = webClientBuilder.build();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        // check public paths
        for (String p : authProperties.getPublicPaths()) {
            String trimmed = p.trim();
            if (trimmed.endsWith("/**")) {
                String prefix = trimmed.substring(0, trimmed.length() - 3);
                if (path.startsWith(prefix)) {
                    logger.debug("Path {} is public (matches {})", path, trimmed);
                    return chain.filter(exchange);
                }
            } else {
                if (path.equals(trimmed) || path.startsWith(trimmed)) {
                    logger.debug("Path {} is public (matches {})", path, trimmed);
                    return chain.filter(exchange);
                }
            }
        }

        List<String> auth = exchange.getRequest().getHeaders().get(HttpHeaders.AUTHORIZATION);
        if (auth == null || auth.isEmpty() || !auth.get(0).startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = auth.get(0).substring("Bearer ".length());

        CachedIntrospect cached = cache.get(token);
        if (cached != null && cached.getExpiry().isAfter(Instant.now())) {
            // token cached and valid
            exchange.getRequest().mutate().header("X-User-Id", String.valueOf(cached.getUserId())).header("X-User-Role", String.valueOf(cached.getRole())).build();
            return chain.filter(exchange);
        }

        // Call introspection endpoint
        return webClient.post()
                .uri(authProperties.getIntrospectUrl())
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .onStatus(s -> s.value() == 401, resp -> Mono.error(new RuntimeException("Invalid token")))
                .bodyToMono(Map.class)
                .flatMap(map -> {
                    Boolean valid = (Boolean) ((Map<String, Object>) map).getOrDefault("valid", false);
                    if (Boolean.TRUE.equals(valid)) {
                        Object uid = map.get("userId");
                        Object role = map.get("role");
                        long ttl = authProperties.getCacheTtlSeconds();
                        CachedIntrospect ci = new CachedIntrospect(true, uid, map.get("username"), role, Instant.now().plusSeconds(ttl));
                        cache.put(token, ci);
                        exchange.getRequest().mutate().header("X-User-Id", String.valueOf(uid)).header("X-User-Role", String.valueOf(role)).build();
                        return chain.filter(exchange);
                    } else {
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    }
                })
                .onErrorResume(e -> {
                    logger.warn("Introspect call failed: {}", e.getMessage());
                    // fallback: deny access to be safe
                    exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
                    return exchange.getResponse().setComplete();
                });
    }

    private static class CachedIntrospect {
        private final boolean valid;
        private final Object userId;
        private final Object username;
        private final Object role;
        private final Instant expiry;

        CachedIntrospect(boolean valid, Object userId, Object username, Object role, Instant expiry) {
            this.valid = valid;
            this.userId = userId;
            this.username = username;
            this.role = role;
            this.expiry = expiry;
        }

        public boolean isValid() {
            return valid;
        }

        public Object getUserId() {
            return userId;
        }

        public Object getUsername() {
            return username;
        }

        public Object getRole() {
            return role;
        }

        public Instant getExpiry() {
            return expiry;
        }
    }
}
