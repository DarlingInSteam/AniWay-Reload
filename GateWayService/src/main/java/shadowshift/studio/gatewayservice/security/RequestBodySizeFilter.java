package shadowshift.studio.gatewayservice.security;

import java.util.Locale;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import reactor.core.publisher.Mono;

/**
 * Quick pre-flight guard against oversized payloads before they reach downstream services.
 */
@Component
@Order(-30)
@ConditionalOnProperty(name = "security.request-size.enabled", havingValue = "true", matchIfMissing = true)
public class RequestBodySizeFilter implements WebFilter {

    private static final Logger logger = LoggerFactory.getLogger(RequestBodySizeFilter.class);
    private static final Set<HttpMethod> GUARDED_METHODS = Set.of(HttpMethod.POST, HttpMethod.PUT, HttpMethod.PATCH);

    private final long jsonLimitBytes;
    private final long uploadLimitBytes;
    private final MeterRegistry meterRegistry;

    public RequestBodySizeFilter(@Value("${security.request-size.json-max-mb:20}") int jsonMaxMb,
                                 @Value("${security.request-size.upload-max-mb:200}") int uploadMaxMb,
                                 MeterRegistry meterRegistry) {
        this.jsonLimitBytes = megabytesToBytes(jsonMaxMb);
        this.uploadLimitBytes = megabytesToBytes(uploadMaxMb);
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        HttpMethod method = exchange.getRequest().getMethod();
        if (method == null || !GUARDED_METHODS.contains(method)) {
            return chain.filter(exchange);
        }

        long contentLength = exchange.getRequest().getHeaders().getContentLength();
        if (contentLength <= 0) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest().getURI().getPath();
        MediaType contentType = exchange.getRequest().getHeaders().getContentType();
        long limit = determineLimit(path, contentType);

        if (contentLength > limit) {
            meterRegistry.counter("gateway.request.rejected.payload",
                            Tags.of("path", truncatePath(path),
                                    "method", method.name(),
                                    "limit", String.valueOf(limit)))
                    .increment();

            logger.warn("Rejecting payload size={}B limit={}B path={} method={} contentType={}",
                    contentLength, limit, path, method.name(), contentType);

            exchange.getResponse().setStatusCode(HttpStatus.PAYLOAD_TOO_LARGE);
            exchange.getResponse().getHeaders().set("X-Payload-Limit", Long.toString(limit));
            exchange.getResponse().getHeaders().set(HttpHeaders.RETRY_AFTER, "5");
            return exchange.getResponse().setComplete();
        }

        return chain.filter(exchange);
    }

    private long determineLimit(String path, MediaType contentType) {
        if (contentType != null) {
            String type = contentType.toString().toLowerCase(Locale.ROOT);
            if (type.contains("multipart/")) {
                return uploadLimitBytes;
            }
            if (type.contains("octet-stream")) {
                return uploadLimitBytes;
            }
        }

        if (matchesUploadPath(path)) {
            return uploadLimitBytes;
        }

        return jsonLimitBytes;
    }

    private boolean matchesUploadPath(String path) {
        if (!StringUtils.hasText(path)) {
            return false;
        }
        String lower = path.toLowerCase(Locale.ROOT);
        return lower.contains("/upload")
                || lower.contains("/api/images/")
                || lower.contains("/api/import-queue/")
                || lower.contains("/api/moments");
    }

    private long megabytesToBytes(int megabytes) {
        int sanitized = Math.max(1, megabytes);
        return sanitized * 1024L * 1024L;
    }

    private String truncatePath(String path) {
        if (!StringUtils.hasText(path)) {
            return "/";
        }
        String[] segments = path.split("/");
        if (segments.length <= 2) {
            return path;
        }
        return "/" + segments[1] + "/" + segments[2];
    }
}