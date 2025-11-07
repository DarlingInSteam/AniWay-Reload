package shadowshift.studio.gatewayservice.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ServerWebExchange;

import java.util.concurrent.TimeUnit;

import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import reactor.util.retry.Retry;

/**
 * Centralised token introspection service that caches AuthService responses and shares
 * the results across gateway filters during a single request.
 */
@Component
public class TokenIntrospectionService {

    public static final String ATTRIBUTE_TOKEN_DETAILS = TokenIntrospectionService.class.getName() + ".TOKEN_DETAILS";

    private static final Logger logger = LoggerFactory.getLogger(TokenIntrospectionService.class);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(3);

    private final AuthProperties authProperties;
    private final WebClient webClient;
    private final ConcurrentHashMap<String, TokenDetails> cache = new ConcurrentHashMap<>();
    private final Duration cacheTtl;
    private final Duration negativeCacheTtl;

    public TokenIntrospectionService(AuthProperties authProperties, WebClient.Builder webClientBuilder) {
        this.authProperties = authProperties;

        HttpClient httpClient = HttpClient.create()
                .compress(true)
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2000)
                .responseTimeout(REQUEST_TIMEOUT)
        .doOnConnected(conn -> conn
            .addHandlerLast(new ReadTimeoutHandler(REQUEST_TIMEOUT.getSeconds(), TimeUnit.SECONDS))
            .addHandlerLast(new WriteTimeoutHandler(REQUEST_TIMEOUT.getSeconds(), TimeUnit.SECONDS)));

        this.webClient = webClientBuilder.clone()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
        this.cacheTtl = Duration.ofSeconds(Math.max(60, authProperties.getCacheTtlSeconds()));
        // cache invalid tokens for a shorter window to avoid hammering the auth service
        this.negativeCacheTtl = Duration.ofSeconds(Math.max(10, Math.min(120, authProperties.getCacheTtlSeconds() / 4)));
    }

    /**
     * Resolve (and cache) token details for the current exchange. May return {@link Mono#empty()}
     * if no bearer token is present.
     */
    public Mono<TokenDetails> resolveToken(ServerWebExchange exchange) {
        return Mono.defer(() -> {
            TokenDetails details = exchange.getAttribute(ATTRIBUTE_TOKEN_DETAILS);
            if (details != null && !details.isExpired()) {
                return Mono.just(details);
            }

            String token = extractBearerToken(exchange);
            if (token == null) {
                return Mono.empty();
            }

            TokenDetails cached = cache.get(token);
            if (cached != null && !cached.isExpired()) {
                exchange.getAttributes().put(ATTRIBUTE_TOKEN_DETAILS, cached);
                return Mono.just(cached);
            }

            return callIntrospect(token)
                .doOnNext(resolved -> {
                    cache.put(token, resolved);
                    exchange.getAttributes().put(ATTRIBUTE_TOKEN_DETAILS, resolved);
                })
                .doOnError(ex -> logger.warn("Introspection failed: {}", ex.getMessage()));
        });
    }

    private Mono<TokenDetails> callIntrospect(String token) {
        return webClient.post()
                .uri(authProperties.getIntrospectUrl())
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .onStatus(status -> status.value() == 401,
                        response -> Mono.error(new TokenIntrospectionException("Invalid token")))
                .bodyToMono(Map.class)
                .map(raw -> mapToDetails(raw))
                .timeout(REQUEST_TIMEOUT.plusSeconds(1))
                .retryWhen(Retry.backoff(1, Duration.ofMillis(150)).filter(this::isTransientFailure))
                .onErrorMap(ex -> {
                    if (ex instanceof TokenIntrospectionException) {
                        return ex;
                    }
                    if (ex instanceof WebClientResponseException wcre) {
                        return new TokenIntrospectionException("Introspection HTTP " + wcre.getStatusCode(), wcre);
                    }
                    return new TokenIntrospectionException("Failed to introspect token", ex);
                });
    }

    @SuppressWarnings("unchecked")
    private TokenDetails mapToDetails(Map<?, ?> raw) {
        boolean valid = Optional.ofNullable(raw.get("valid")).map(Boolean.class::cast).orElse(false);
        String userId = nullSafeToString(raw.get("userId"));
        String username = nullSafeToString(raw.get("username"));
        String role = nullSafeToString(raw.get("role"));

        if (!valid) {
            Instant expiry = Instant.now().plus(negativeCacheTtl);
            return TokenDetails.invalid(expiry);
        }

        if (userId == null || userId.isBlank()) {
            logger.warn("Introspection returned valid token without userId, treating as invalid");
            return TokenDetails.invalid(Instant.now().plus(negativeCacheTtl));
        }

        Instant expiry = Instant.now().plus(cacheTtl);
        return TokenDetails.valid(userId.trim(), username, normalizeRole(role), expiry);
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return null;
        }
        return role.trim().toUpperCase(Locale.ROOT);
    }

    private String nullSafeToString(Object value) {
        if (value == null) {
            return null;
        }
        String str = Objects.toString(value, null);
        return (str == null || str.isBlank()) ? null : str;
    }

    private String extractBearerToken(ServerWebExchange exchange) {
        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        String token = authorization.substring("Bearer ".length()).trim();
        return token.isEmpty() ? null : token;
    }

    private boolean isTransientFailure(Throwable throwable) {
        if (throwable instanceof TokenIntrospectionException) {
            return false;
        }
        if (throwable instanceof WebClientResponseException wcre) {
            return wcre.getStatusCode().is5xxServerError();
        }
        return true;
    }
}
