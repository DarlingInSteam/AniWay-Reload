package shadowshift.studio.momentservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "moments.rate-limit")
public class MomentRateLimitProperties {

    private boolean enabled = true;
    private int maxPerWindow = 10;
    private int windowHours = 24;
    private long maxBytesPerWindow = 64L * 1024L * 1024L; // 64 MB

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getMaxPerWindow() {
        return maxPerWindow;
    }

    public void setMaxPerWindow(int maxPerWindow) {
        this.maxPerWindow = maxPerWindow;
    }

    public int getWindowHours() {
        return windowHours;
    }

    public void setWindowHours(int windowHours) {
        this.windowHours = windowHours;
    }

    public long getMaxBytesPerWindow() {
        return maxBytesPerWindow;
    }

    public void setMaxBytesPerWindow(long maxBytesPerWindow) {
        this.maxBytesPerWindow = maxBytesPerWindow;
    }
}
