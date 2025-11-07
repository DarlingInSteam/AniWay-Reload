package shadowshift.studio.gatewayservice.security;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

/**
 * Strongly typed wrapper over configuration values under {@code ratelimit.*}.
 */
@Component
@ConfigurationProperties(prefix = "ratelimit")
public class RateLimitProperties {

    private boolean enabled = true;

    private BucketConfig anon = BucketConfig.ofDefaults(60, 30);
    private BucketConfig user = BucketConfig.ofDefaults(300, 150);
    private BucketConfig admin = BucketConfig.ofDefaults(600, 300);

    private ConnectionConfig connection = new ConnectionConfig();

    private List<SpecialPathRule> specialPaths = new ArrayList<>();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public BucketConfig getAnon() {
        return anon;
    }

    public void setAnon(BucketConfig anon) {
        this.anon = anon;
    }

    public BucketConfig getUser() {
        return user;
    }

    public void setUser(BucketConfig user) {
        this.user = user;
    }

    public BucketConfig getAdmin() {
        return admin;
    }

    public void setAdmin(BucketConfig admin) {
        this.admin = admin;
    }

    public ConnectionConfig getConnection() {
        return connection;
    }

    public void setConnection(ConnectionConfig connection) {
        this.connection = connection;
    }

    public List<SpecialPathRule> getSpecialPaths() {
        return Collections.unmodifiableList(specialPaths);
    }

    public void setSpecialPaths(List<SpecialPathRule> specialPaths) {
        this.specialPaths = specialPaths != null ? new ArrayList<>(specialPaths) : new ArrayList<>();
    }

    public BucketConfig lookupRoleBucket(String role) {
        if (!StringUtils.hasText(role)) {
            return anon;
        }
        String normalized = role.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "ADMIN" -> admin;
            case "USER" -> user;
            default -> anon;
        };
    }

    public static final class BucketConfig {
        private int burst;
    private int refillPerMinute;

        public BucketConfig() {}

        private BucketConfig(int burst, int refillPerMinute) {
            this.burst = burst;
            this.refillPerMinute = refillPerMinute;
        }

        public static BucketConfig ofDefaults(int burst, int refill) {
            return new BucketConfig(burst, refill);
        }

        public int getBurst() {
            return burst;
        }

        public void setBurst(int burst) {
            this.burst = burst;
        }

        public int getRefillPerMinute() {
            return refillPerMinute;
        }

        public void setRefillPerMinute(int refillPerMinute) {
            this.refillPerMinute = refillPerMinute;
        }

        public Duration refillInterval() {
            return Duration.ofMinutes(1);
        }
    }

    public static final class ConnectionConfig {
        private int maxPerUser = 5;
        private int maxPerIp = 3;
        private int keyTtlSeconds = 120;

        public int getMaxPerUser() {
            return maxPerUser;
        }

        public void setMaxPerUser(int maxPerUser) {
            this.maxPerUser = maxPerUser;
        }

        public int getMaxPerIp() {
            return maxPerIp;
        }

        public void setMaxPerIp(int maxPerIp) {
            this.maxPerIp = maxPerIp;
        }

        public int getKeyTtlSeconds() {
            return keyTtlSeconds;
        }

        public void setKeyTtlSeconds(int keyTtlSeconds) {
            this.keyTtlSeconds = keyTtlSeconds;
        }

        public Duration ttl() {
            return Duration.ofSeconds(Math.max(10, keyTtlSeconds));
        }
    }

    public static final class SpecialPathRule {
        private String id;
        private String pattern;
        private List<String> methods = new ArrayList<>();
        private Scope scope = Scope.IP;
        private Integer burst;
    private Integer refillPerMinute;
        private Long weight;
        private Set<String> roles = Collections.emptySet();

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getPattern() {
            return pattern;
        }

        public void setPattern(String pattern) {
            this.pattern = pattern;
        }

        public List<String> getMethods() {
            return methods;
        }

        public void setMethods(List<String> methods) {
            this.methods = methods != null ? new ArrayList<>(methods) : new ArrayList<>();
        }

        public Scope getScope() {
            return scope;
        }

        public void setScope(Scope scope) {
            this.scope = scope != null ? scope : Scope.IP;
        }

        public Integer getBurst() {
            return burst;
        }

        public void setBurst(Integer burst) {
            this.burst = burst;
        }

        public Integer getRefillPerMinute() {
            return refillPerMinute;
        }

        public void setRefillPerMinute(Integer refillPerMinute) {
            this.refillPerMinute = refillPerMinute;
        }

        public Long getWeight() {
            return weight;
        }

        public void setWeight(Long weight) {
            this.weight = weight;
        }

        public Set<String> getRoles() {
            return roles;
        }

        public void setRoles(List<String> roles) {
            if (CollectionUtils.isEmpty(roles)) {
                this.roles = Collections.emptySet();
                return;
            }

            Set<String> normalized = new java.util.LinkedHashSet<>();
            for (String role : roles) {
                if (!StringUtils.hasText(role)) {
                    continue;
                }
                normalized.add(role.trim().toUpperCase(Locale.ROOT));
            }
            this.roles = Collections.unmodifiableSet(normalized);
        }

        public boolean matchesRole(String role) {
            if (CollectionUtils.isEmpty(roles)) {
                return true;
            }
            if (!StringUtils.hasText(role)) {
                return roles.contains("ANON") || roles.contains("ANONYMOUS");
            }
            return roles.contains(role.trim().toUpperCase(Locale.ROOT));
        }
    }

    public enum Scope {
        IP,
        USER,
        BOTH
    }
}
