package shadowshift.studio.gatewayservice.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.time.Instant;

@Component
public class RouteTimingFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(RouteTimingFilter.class);
    private static final String ATTR_START = RouteTimingFilter.class.getName() + ".START";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        exchange.getAttributes().put(ATTR_START, Instant.now());
        return chain.filter(exchange).doOnSuccess(v -> log(exchange)).doOnError(e -> log(exchange));
    }

    private void log(ServerWebExchange exchange) {
        Instant start = exchange.getAttribute(ATTR_START);
        Instant end = Instant.now();
        Duration d = start != null ? Duration.between(start, end) : Duration.ZERO;
    Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
    String routeId = route != null ? route.getId() : "n/a";
        ServerHttpResponse resp = exchange.getResponse();
        int status = resp.getStatusCode() != null ? resp.getStatusCode().value() : 0;
        String path = exchange.getRequest().getURI().getPath();
        InetSocketAddress remote = exchange.getRequest().getRemoteAddress();
        log.info("GW_REQ path={} route={} status={} timeMs={} remote={} " +
                        "ua=\"{}\"", path, routeId, status, d.toMillis(),
                remote != null ? remote.getAddress().getHostAddress() : "?",
                exchange.getRequest().getHeaders().getFirst("User-Agent"));
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE - 10; // run late but before RateLimit (which is LOWEST) logging after downstream
    }
}
