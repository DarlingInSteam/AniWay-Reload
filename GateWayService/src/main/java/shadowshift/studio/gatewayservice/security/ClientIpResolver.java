package shadowshift.studio.gatewayservice.security;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Utility component that extracts the most trustworthy client IP address, preferring the first
 * public entry from {@code X-Forwarded-For} and falling back to the remote address.
 */
@Component
public class ClientIpResolver {

    private static final Pattern FORWARDED_PATTERN = Pattern.compile("for=\\\"?([^;,\\\"]+)\\\"?");

    public String resolve(ServerHttpRequest request) {
        var headers = request.getHeaders();
        String xForwardedFor = headers.getFirst("X-Forwarded-For");
        if (StringUtils.hasText(xForwardedFor)) {
            String candidate = pickPublicIp(Arrays.asList(xForwardedFor.split(",")));
            if (candidate != null) {
                return candidate;
            }
        }

        String forwarded = headers.getFirst("Forwarded");
        if (StringUtils.hasText(forwarded)) {
            Matcher matcher = FORWARDED_PATTERN.matcher(forwarded);
            while (matcher.find()) {
                String raw = matcher.group(1);
                String cleaned = cleanForwardedIp(raw);
                if (isPublicIp(cleaned)) {
                    return cleaned;
                }
            }
        }

        String realIp = headers.getFirst("X-Real-IP");
        if (isPublicIp(realIp)) {
            return realIp;
        }

        return Optional.ofNullable(request.getRemoteAddress())
                .map(addr -> addr.getAddress().getHostAddress())
                .orElse("unknown");
    }

    private String pickPublicIp(List<String> candidates) {
        for (String raw : candidates) {
            String candidate = cleanForwardedIp(raw);
            if (isPublicIp(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    private String cleanForwardedIp(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("\"")) {
            trimmed = trimmed.substring(1);
        }
        if (trimmed.endsWith("\"")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            // IPv6 address in Forwarded header
            trimmed = trimmed.substring(1, trimmed.length() - 1);
        }
        // Strip port suffix if present
        int portIdx = trimmed.indexOf(':');
        if (portIdx > 0 && trimmed.chars().filter(ch -> ch == ':').count() == 1L) {
            return trimmed.substring(0, portIdx);
        }
        return trimmed;
    }

    private boolean isPublicIp(String ip) {
        if (!StringUtils.hasText(ip)) {
            return false;
        }
        try {
            InetAddress address = InetAddress.getByName(ip);
            return !(address.isAnyLocalAddress()
                    || address.isLoopbackAddress()
                    || address.isLinkLocalAddress()
                    || address.isSiteLocalAddress()
                    || address.isMulticastAddress());
        } catch (UnknownHostException ex) {
            return false;
        }
    }
}
