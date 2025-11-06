package shadowshift.studio.gatewayservice.security;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

/**
 * Lightweight value object describing the result of token introspection. Used by multiple
 * gateway filters to share authentication context without re-querying AuthService.
 */
public final class TokenDetails {

    private final boolean valid;
    private final String userId;
    private final String username;
    private final String role;
    private final Instant expiresAt;
    private final Throwable error;

    private TokenDetails(boolean valid, String userId, String username, String role, Instant expiresAt, Throwable error) {
        this.valid = valid;
        this.userId = userId;
        this.username = username;
        this.role = role;
        this.expiresAt = expiresAt;
        this.error = error;
    }

    public static TokenDetails valid(String userId, String username, String role, Instant expiresAt) {
        Objects.requireNonNull(expiresAt, "expiresAt");
        return new TokenDetails(true, userId, username, role, expiresAt, null);
    }

    public static TokenDetails invalid(Instant expiresAt) {
        Objects.requireNonNull(expiresAt, "expiresAt");
        return new TokenDetails(false, null, null, null, expiresAt, null);
    }

    public static TokenDetails error(Throwable error, Instant expiresAt) {
        Objects.requireNonNull(error, "error");
        Objects.requireNonNull(expiresAt, "expiresAt");
        return new TokenDetails(false, null, null, null, expiresAt, error);
    }

    public static TokenDetails anonymous() {
        return new TokenDetails(false, null, null, null, Instant.EPOCH, null);
    }

    public boolean isValid() {
        return valid && !isExpired() && error == null && userId != null;
    }

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isError() {
        return error != null;
    }

    public Throwable getError() {
        return error;
    }

    public String getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public String roleOrDefault() {
        if (role == null || role.isBlank()) {
            return "ANON";
        }
        return role.trim().toUpperCase(Locale.ROOT);
    }

    @Override
    public String toString() {
        return "TokenDetails{" +
                "valid=" + valid +
                ", userId='" + userId + '\'' +
                ", role='" + role + '\'' +
                ", expiresAt=" + expiresAt +
                ", error=" + (error != null ? error.getClass().getSimpleName() : "null") +
                '}';
    }
}
