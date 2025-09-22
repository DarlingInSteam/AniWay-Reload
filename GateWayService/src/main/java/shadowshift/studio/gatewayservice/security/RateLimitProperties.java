package shadowshift.studio.gatewayservice.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RateLimitProperties {

    @Value("${ratelimit.anon.burst:120}")
    private int anonBurst;
    @Value("${ratelimit.anon.refill:60}")
    private int anonRefillPerMinute;

    @Value("${ratelimit.user.burst:600}")
    private int userBurst;
    @Value("${ratelimit.user.refill:300}")
    private int userRefillPerMinute;

    @Value("${ratelimit.admin.burst:1200}")
    private int adminBurst;
    @Value("${ratelimit.admin.refill:600}")
    private int adminRefillPerMinute;

    public int getAnonBurst() { return anonBurst; }
    public int getAnonRefillPerMinute() { return anonRefillPerMinute; }
    public int getUserBurst() { return userBurst; }
    public int getUserRefillPerMinute() { return userRefillPerMinute; }
    public int getAdminBurst() { return adminBurst; }
    public int getAdminRefillPerMinute() { return adminRefillPerMinute; }
}
