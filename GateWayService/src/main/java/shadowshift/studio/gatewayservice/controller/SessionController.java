package shadowshift.studio.gatewayservice.controller;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;

import reactor.core.publisher.Mono;
import shadowshift.studio.gatewayservice.security.SessionCookieProperties;

@RestController
@RequestMapping("/api/session")
public class SessionController {

    private static final Logger logger = LoggerFactory.getLogger(SessionController.class);

    private final SessionCookieProperties properties;

    public SessionController(SessionCookieProperties properties) {
        this.properties = properties;
    }

    @PostMapping("/issue")
    public Mono<ResponseEntity<Void>> issue(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
                                            ServerWebExchange exchange) {
        String token = extractBearer(authorization);
        if (!StringUtils.hasText(token)) {
            return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).build());
        }

        ResponseCookie cookie = buildCookie(token, Duration.ofSeconds(Math.max(60, properties.getMaxAgeSeconds())));
        exchange.getResponse().addCookie(cookie);
        logger.debug("Issued session cookie {} for client", properties.getCookieName());
        return Mono.just(ResponseEntity.noContent().build());
    }

    @PostMapping("/revoke")
    public Mono<ResponseEntity<Void>> revoke(ServerWebExchange exchange) {
        ResponseCookie cookie = buildCookie("", Duration.ZERO);
        exchange.getResponse().addCookie(cookie);
        logger.debug("Revoked session cookie {}", properties.getCookieName());
        return Mono.just(ResponseEntity.noContent().build());
    }

    private ResponseCookie buildCookie(String value, Duration maxAge) {
    ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(properties.getCookieName(), value)
        .httpOnly(true)
        .secure(properties.isSecure())
        .path(properties.getPath())
        .sameSite(properties.getSameSite())
        .maxAge(maxAge);

    if (StringUtils.hasText(properties.getDomain())) {
        builder = builder.domain(properties.getDomain());
    }

    return builder.build();
    }

    private String extractBearer(String header) {
        if (!StringUtils.hasText(header)) {
            return null;
        }
        String trimmed = header.trim();
        if (!trimmed.toLowerCase().startsWith("bearer ")) {
            return null;
        }
        return trimmed.substring(7).trim();
    }
}