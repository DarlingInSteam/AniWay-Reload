package shadowshift.studio.gatewayservice.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RateLimitProperties {

    @Value("${ratelimit.anon.burst:60}")
    private int anonBurst;
    @Value("${ratelimit.anon.refill:30}")
    private int anonRefillPerMinute;

    @Value("${ratelimit.user.burst:300}")
    private int userBurst;
    @Value("${ratelimit.user.refill:150}")
    private int userRefillPerMinute;

    @Value("${ratelimit.admin.burst:600}")
    private int adminBurst;
    @Value("${ratelimit.admin.refill:300}")
    private int adminRefillPerMinute;

    @Value("${ratelimit.connection.max-per-user:5}")
    private int maxConnectionsPerUser;

    @Value("${ratelimit.connection.max-per-ip:3}")
    private int maxConnectionsPerIp;

    @Value("${ratelimit.connection.key-ttl-seconds:30}")
    private int connectionKeyTtlSeconds;

    public int getAnonBurst() { return anonBurst; }
    public int getAnonRefillPerMinute() { return anonRefillPerMinute; }
    public int getUserBurst() { return userBurst; }
    public int getUserRefillPerMinute() { return userRefillPerMinute; }
    public int getAdminBurst() { return adminBurst; }
    public int getAdminRefillPerMinute() { return adminRefillPerMinute; }
    public int getMaxConnectionsPerUser() { return maxConnectionsPerUser; }
    public int getMaxConnectionsPerIp() { return maxConnectionsPerIp; }
    public int getConnectionKeyTtlSeconds() { return connectionKeyTtlSeconds; }
}
