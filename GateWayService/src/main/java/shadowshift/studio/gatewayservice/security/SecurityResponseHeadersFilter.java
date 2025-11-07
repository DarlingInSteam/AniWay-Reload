package shadowshift.studio.gatewayservice.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import reactor.core.publisher.Mono;

/**
 * Adds hardened security headers to every response.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class SecurityResponseHeadersFilter implements WebFilter {

    private final String hsts;
    private final String csp;
    private final String permissionsPolicy;
    private final String referrerPolicy;

    public SecurityResponseHeadersFilter(
            @Value("${security.headers.strict-transport-security:max-age=31536000; includeSubDomains; preload}") String hsts,
            @Value("${security.headers.content-security-policy:default-src 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests}") String csp,
            @Value("${security.headers.permissions-policy:accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()}") String permissionsPolicy,
            @Value("${security.headers.referrer-policy:no-referrer}") String referrerPolicy) {
        this.hsts = hsts;
        this.csp = csp;
        this.permissionsPolicy = permissionsPolicy;
        this.referrerPolicy = referrerPolicy;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        exchange.getResponse().beforeCommit(() -> {
            HttpHeaders headers = exchange.getResponse().getHeaders();

            if (isSecure(exchange)) {
                headers.set("Strict-Transport-Security", hsts);
            }

            headers.addIfAbsent("X-Content-Type-Options", "nosniff");
            headers.addIfAbsent("X-Frame-Options", "DENY");
            headers.addIfAbsent("Referrer-Policy", referrerPolicy);
            headers.addIfAbsent("Permissions-Policy", permissionsPolicy);

            if (StringUtils.hasText(csp)) {
                headers.set("Content-Security-Policy", csp);
            }

            headers.remove(HttpHeaders.SERVER);
            headers.remove("X-Powered-By");

            return Mono.empty();
        });

        return chain.filter(exchange);
    }

    private boolean isSecure(ServerWebExchange exchange) {
        String forwardedProto = exchange.getRequest().getHeaders().getFirst("X-Forwarded-Proto");
        if (StringUtils.hasText(forwardedProto)) {
            return "https".equalsIgnoreCase(forwardedProto);
        }
        return exchange.getRequest().getURI().getScheme() != null
                && exchange.getRequest().getURI().getScheme().equalsIgnoreCase("https");
    }
}