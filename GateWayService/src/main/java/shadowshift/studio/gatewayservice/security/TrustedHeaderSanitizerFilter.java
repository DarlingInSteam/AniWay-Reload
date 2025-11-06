package shadowshift.studio.gatewayservice.security;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import reactor.core.publisher.Mono;

/**
 * Strips any caller-supplied internal headers (X-User-*, X-Internal-*) before they reach
 * authentication and rate-limiting filters. This ensures downstream services can trust the
 * headers injected by the gateway alone.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TrustedHeaderSanitizerFilter implements WebFilter {

    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String USER_ROLE_HEADER = "X-User-Role";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        HttpHeaders headers = exchange.getRequest().getHeaders();
        boolean hasTrustedHeaders = headers.containsKey(USER_ID_HEADER) || headers.containsKey(USER_ROLE_HEADER);
        List<String> internalHeaders = new ArrayList<>();
        headers.forEach((name, values) -> {
            String lower = name.toLowerCase(Locale.ROOT);
            if (lower.startsWith("x-internal-")) {
                internalHeaders.add(name);
            }
        });

        if (!hasTrustedHeaders && internalHeaders.isEmpty()) {
            return chain.filter(exchange);
        }

        ServerHttpRequest mutated = exchange.getRequest().mutate()
                .headers(mutable -> {
                    mutable.remove(USER_ID_HEADER);
                    mutable.remove(USER_ROLE_HEADER);
                    if (!CollectionUtils.isEmpty(internalHeaders)) {
                        internalHeaders.forEach(mutable::remove);
                    }
                })
                .build();

        return chain.filter(exchange.mutate().request(mutated).build());
    }
}
