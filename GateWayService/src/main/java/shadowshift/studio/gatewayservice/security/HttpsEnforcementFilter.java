package shadowshift.studio.gatewayservice.security;

import java.net.URI;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import org.springframework.web.util.UriComponentsBuilder;

import reactor.core.publisher.Mono;

/**
 * Enforces HTTPS for external clients. Allows opt-out for development hosts.
 */
@Component
@Order(-45)
@ConditionalOnProperty(name = "security.enforce-https.enabled", havingValue = "true", matchIfMissing = true)
public class HttpsEnforcementFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(HttpsEnforcementFilter.class);

    private final int httpsPort;
    private final Set<String> skipHosts;

    public HttpsEnforcementFilter(@Value("${security.enforce-https.port:443}") int httpsPort,
                                  @Value("${security.enforce-https.skip-hosts:localhost,127.0.0.1}") String skipHosts) {
        this.httpsPort = httpsPort;
        this.skipHosts = Arrays.stream(skipHosts.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(String::toLowerCase)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String hostHeader = request.getHeaders().getFirst(HttpHeaders.HOST);
        String host = resolveHost(request, hostHeader);

        if (shouldBypass(host)) {
            return chain.filter(exchange);
        }

        String forwardedProto = request.getHeaders().getFirst("X-Forwarded-Proto");
        boolean secure = request.getURI().getScheme() != null && request.getURI().getScheme().equalsIgnoreCase("https");
        if (StringUtils.hasText(forwardedProto)) {
            secure = forwardedProto.equalsIgnoreCase("https");
        }

        if (!secure) {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUri(request.getURI())
                    .scheme("https");

            if (StringUtils.hasText(host)) {
                builder.host(host);
            }

            if (httpsPort != 443) {
                builder.port(httpsPort);
            } else {
                builder.port((String) null);
            }

            URI redirectUri = builder
                    .build(true)
                    .toUri();

            logger.debug("Redirecting insecure request {} to HTTPS", request.getURI());
            exchange.getResponse().setStatusCode(HttpStatus.PERMANENT_REDIRECT);
            exchange.getResponse().getHeaders().setLocation(redirectUri);
            return exchange.getResponse().setComplete();
        }

        return chain.filter(exchange);
    }

    private String resolveHost(ServerHttpRequest request, String hostHeader) {
        if (StringUtils.hasText(hostHeader)) {
            return hostHeader.split(":")[0];
        }
        if (request.getURI().getHost() != null) {
            return request.getURI().getHost();
        }
        return "";
    }

    private boolean shouldBypass(String host) {
        if (!StringUtils.hasText(host)) {
            return false;
        }
        return skipHosts.contains(host.toLowerCase());
    }
}