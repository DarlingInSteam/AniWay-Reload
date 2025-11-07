package shadowshift.studio.gatewayservice.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
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
import reactor.core.publisher.Flux;
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

    private final Map<String, BucketConfiguration> configurationCache = new ConcurrentHashMap<>();
    private final Map<String, byte[]> redisKeyCache = new ConcurrentHashMap<>();
    private final List<CompiledRule> compiledRules;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

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
        this.compiledRules = compileRules(rateLimitProperties.getSpecialPaths());
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
        String method = Optional.ofNullable(exchange.getRequest().getMethod()).map(HttpMethod::name).orElse("GET").toUpperCase(Locale.ROOT);
        String path = exchange.getRequest().getURI().getPath();
        boolean authenticated = details.isValid();
        String role = authenticated ? details.roleOrDefault() : "ANON";
        String subject = authenticated ? "user" : "ip";
        String ip = clientIpResolver.resolve(exchange.getRequest());
        String identifier = authenticated ? "user:" + details.getUserId() : "ip:" + ip;

        List<CompiledRule> matchedRules = findMatchingRules(path, method, role);
        long baseWeight = classifyRequestCost(path, method);
        long ruleWeightOverride = matchedRules.stream()
                .map(rule -> Optional.ofNullable(rule.rule().getWeight()).orElse(0L))
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);
        long weight = Math.max(baseWeight, ruleWeightOverride);

        return enforceSpecialRules(matchedRules, details, ip, exchange, path, method, weight)
                .flatMap(decision -> {
                    if (!decision.allowed()) {
                        recordSpecialRejection(decision, path, method, role);
                        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
                        exchange.getResponse().getHeaders().set("Retry-After", String.valueOf(decision.waitSeconds()));
                        exchange.getResponse().getHeaders().set("X-RateLimit-Rule", decision.ruleId());
                        exchange.getResponse().getHeaders().set("X-RateLimit-Remaining", String.valueOf(decision.remainingTokens()));
                        return exchange.getResponse().setComplete();
                    }

                    return applyRoleBucket(subject, role, identifier, weight, exchange, chain, path, method);
                });
    }

    private Mono<SpecialDecision> enforceSpecialRules(List<CompiledRule> rules,
                                                      TokenDetails details,
                                                      String ip,
                                                      ServerWebExchange exchange,
                                                      String path,
                                                      String method,
                                                      long weight) {
        if (rules.isEmpty()) {
          return Mono.just(SpecialDecision.permitted());
        }

        return Flux.fromIterable(rules)
                .concatMap(rule -> applyRule(rule, details, ip, exchange, path, method, weight))
                .filter(decision -> !decision.allowed())
                .next()
             .defaultIfEmpty(SpecialDecision.permitted());
    }

    private Mono<SpecialDecision> applyRule(CompiledRule rule,
                                            TokenDetails details,
                                            String ip,
                                            ServerWebExchange exchange,
                                            String path,
                                            String method,
                                            long weight) {
        List<ScopeCheck> scopeChecks = determineScopes(rule.rule().getScope(), details, ip);
        if (scopeChecks.isEmpty()) {
              return Mono.just(SpecialDecision.permitted());
        }

        return Flux.fromIterable(scopeChecks)
                .concatMap(scope -> enforceScope(rule, scope, details, exchange, path, method, weight))
                .filter(decision -> !decision.allowed())
                .next()
                 .defaultIfEmpty(SpecialDecision.permitted());
    }

    private Mono<SpecialDecision> enforceScope(CompiledRule rule,
                                               ScopeCheck scope,
                                               TokenDetails details,
                                               ServerWebExchange exchange,
                                               String path,
                                               String method,
                                               long weight) {
        RateLimitProperties.BucketConfig fallbackBucket = fallbackBucketFor(scope.subject(), details);
    int burst = Optional.ofNullable(rule.rule().getBurst()).orElse(fallbackBucket.getBurst());
    int refill = Optional.ofNullable(rule.rule().getRefillPerMinute()).orElse(fallbackBucket.getRefillPerMinute());
        long appliedWeight = Optional.ofNullable(rule.rule().getWeight()).orElse(weight);

        String configurationKey = "RULE:" + rule.id() + ':' + scope.subject();
        String redisKey = configurationKey + ':' + scope.identifier();

        AsyncBucketProxy bucket = resolveBucket(redisKey, configurationKey, burst, refill);

        return Mono.fromFuture(bucket.tryConsumeAndReturnRemaining(appliedWeight))
                .flatMap(probe -> {
                    meterRegistry.counter("gateway.ratelimit.rule.attempts",
                                    Tags.of("rule", rule.id(),
                                            "scope", scope.subject(),
                                            "path", metricPath(path),
                                            "method", method))
                            .increment();

                    if (!probe.isConsumed()) {
                        long waitSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
                        meterRegistry.counter("gateway.ratelimit.rule.rejections",
                                        Tags.of("rule", rule.id(),
                                                "scope", scope.subject(),
                                                "path", metricPath(path),
                                                "method", method))
                                .increment();

                        logger.warn("Special rate limit {} hit for scope={} identifier={} remaining={} path={} method={} weight={}",
                                rule.id(), scope.subject(), scope.identifier(), probe.getRemainingTokens(), path, method, appliedWeight);

                        return Mono.just(new SpecialDecision(false, rule.id(), scope.subject(), waitSeconds, probe.getRemainingTokens()));
                    }

            return Mono.just(SpecialDecision.permitted());
                });
    }

    private Mono<Void> applyRoleBucket(String subject,
                                       String role,
                                       String identifier,
                                       long weight,
                                       ServerWebExchange exchange,
                                       WebFilterChain chain,
                                       String path,
                                       String method) {
        RateLimitProperties.BucketConfig bucketConfig = rateLimitProperties.lookupRoleBucket(role);
        int burst = bucketConfig.getBurst();
    int refill = bucketConfig.getRefillPerMinute();

        String configurationKey = "ROLE:" + role;
        AsyncBucketProxy bucket = resolveBucket(configurationKey + ':' + identifier, configurationKey, burst, refill);

        return Mono.fromFuture(bucket.tryConsumeAndReturnRemaining(weight))
                .flatMap(probe -> {
                    meterRegistry.counter("gateway.ratelimit.attempts",
                                    Tags.of("role", role,
                                            "subject", subject,
                                            "path", metricPath(path),
                                            "method", method))
                            .increment();

                    exchange.getResponse().getHeaders().set("X-RateLimit-Limit", String.valueOf(burst));
                    exchange.getResponse().getHeaders().set("X-RateLimit-Role", role);

                    if (!probe.isConsumed()) {
                        long waitSeconds = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()));
                        exchange.getResponse().getHeaders().set("Retry-After", String.valueOf(waitSeconds));
                        exchange.getResponse().getHeaders().set("X-RateLimit-Remaining", String.valueOf(Math.max(0L, probe.getRemainingTokens())));
                        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);

                        meterRegistry.counter("gateway.ratelimit.rejections",
                                        Tags.of("role", role,
                                                "subject", subject,
                                                "path", metricPath(path),
                                                "method", method))
                                .increment();

                        logger.warn("Role rate limit exceeded for role={} identifier={} remaining={} path={} method={} weight={}",
                                role, identifier, probe.getRemainingTokens(), path, method, weight);
                        return exchange.getResponse().setComplete();
                    }

                    exchange.getResponse().getHeaders().set("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
                    return chain.filter(exchange);
                });
    }

    private AsyncBucketProxy resolveBucket(String redisKeyRaw, String configurationKey, int burst, int refillPerMinute) {
        BucketConfiguration configuration = configurationCache.computeIfAbsent(configurationKey, key -> buildConfiguration(burst, refillPerMinute));
        byte[] redisKey = redisKeyCache.computeIfAbsent(redisKeyRaw, key -> key.getBytes(StandardCharsets.UTF_8));
        return asyncProxyManager.builder().build(redisKey, () -> CompletableFuture.completedFuture(configuration));
    }

    private BucketConfiguration buildConfiguration(int burst, int refillPerMinute) {
        int positiveBurst = Math.max(1, burst);
        int positiveRefill = Math.max(1, refillPerMinute);
        Bandwidth bandwidth = Bandwidth.classic(positiveBurst, Refill.greedy(positiveRefill, Duration.ofMinutes(1)));
        return BucketConfiguration.builder().addLimit(bandwidth).build();
    }

    private List<CompiledRule> compileRules(List<RateLimitProperties.SpecialPathRule> rawRules) {
        if (rawRules == null || rawRules.isEmpty()) {
            return List.of();
        }
        List<CompiledRule> compiled = new ArrayList<>();
        int counter = 0;
        for (RateLimitProperties.SpecialPathRule raw : rawRules) {
            if (raw == null || !StringUtils.hasText(raw.getPattern())) {
                continue;
            }
            String id = StringUtils.hasText(raw.getId()) ? raw.getId().trim() : "rule-" + (++counter);
            Set<String> methods = raw.getMethods().stream()
                    .filter(StringUtils::hasText)
                    .map(value -> value.trim().toUpperCase(Locale.ROOT))
                    .collect(Collectors.toSet());
            compiled.add(new CompiledRule(id, raw.getPattern().trim(), methods, raw));
        }
        logger.info("Compiled {} special rate limit rules", compiled.size());
        return List.copyOf(compiled);
    }

    private List<CompiledRule> findMatchingRules(String path, String method, String role) {
        if (compiledRules.isEmpty()) {
            return List.of();
        }
        return compiledRules.stream()
                .filter(rule -> rule.methods().isEmpty() || rule.methods().contains(method))
                .filter(rule -> pathMatcher.match(rule.pattern(), path))
                .filter(rule -> rule.rule().matchesRole(role))
                .collect(Collectors.toList());
    }

    private RateLimitProperties.BucketConfig fallbackBucketFor(String subject, TokenDetails details) {
        if ("user".equals(subject) && details.isValid()) {
            return rateLimitProperties.lookupRoleBucket(details.roleOrDefault());
        }
        return rateLimitProperties.getAnon();
    }

    private List<ScopeCheck> determineScopes(RateLimitProperties.Scope scope, TokenDetails details, String ip) {
        List<ScopeCheck> scopes = new ArrayList<>();
        switch (scope) {
            case USER -> {
                if (details.isValid() && StringUtils.hasText(details.getUserId())) {
                    scopes.add(new ScopeCheck("user", details.getUserId()));
                } else if (StringUtils.hasText(ip)) {
                    scopes.add(new ScopeCheck("ip", ip));
                }
            }
            case IP -> {
                if (StringUtils.hasText(ip)) {
                    scopes.add(new ScopeCheck("ip", ip));
                }
            }
            case BOTH -> {
                if (details.isValid() && StringUtils.hasText(details.getUserId())) {
                    scopes.add(new ScopeCheck("user", details.getUserId()));
                }
                if (StringUtils.hasText(ip)) {
                    scopes.add(new ScopeCheck("ip", ip));
                }
            }
            default -> {}
        }
        return scopes;
    }

    private long classifyRequestCost(String path, String method) {
        if (!"GET".equals(method)) {
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
        return Objects.equals(path, "/favicon.ico")
                || path.startsWith("/static/")
                || path.startsWith("/css/")
                || path.startsWith("/js/")
                || path.startsWith("/images/")
                || path.startsWith("/assets/");
    }

    private void recordSpecialRejection(SpecialDecision decision, String path, String method, String role) {
        meterRegistry.counter("gateway.ratelimit.rejections",
                        Tags.of("role", role,
                                "subject", Optional.ofNullable(decision.subject()).orElse("rule"),
                                "path", metricPath(path),
                                "method", method,
                                "rule", Optional.ofNullable(decision.ruleId()).orElse("unknown")))
                .increment();
    }

    private record CompiledRule(String id, String pattern, Set<String> methods, RateLimitProperties.SpecialPathRule rule) {}

    private record ScopeCheck(String subject, String identifier) {}

    private record SpecialDecision(boolean allowed, String ruleId, String subject, long waitSeconds, long remainingTokens) {
        static SpecialDecision permitted() {
            return new SpecialDecision(true, null, null, 0, 0);
        }
    }
}
