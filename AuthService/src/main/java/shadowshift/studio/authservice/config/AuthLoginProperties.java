package shadowshift.studio.authservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "auth.login.two-step")
public class AuthLoginProperties {
    /** Enable two-step login (password + email code) globally */
    private boolean enabled = true;
}
