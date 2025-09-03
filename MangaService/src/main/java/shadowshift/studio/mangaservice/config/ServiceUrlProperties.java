package shadowshift.studio.mangaservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "services")
public class ServiceUrlProperties {
    
    private String authServiceUrl = "http://auth-service:8085";
    private String chapterServiceUrl = "http://chapter-service:8082";
    private String imageStorageServiceUrl = "http://image-storage-service:8083";
    private String melonServiceUrl = "http://melon-service:8084";
    private String melonServicePublicUrl = "http://localhost:8084";
    
    public String getAuthServiceUrl() {
        return authServiceUrl;
    }
    
    public void setAuthServiceUrl(String authServiceUrl) {
        this.authServiceUrl = authServiceUrl;
    }
    
    public String getChapterServiceUrl() {
        return chapterServiceUrl;
    }
    
    public void setChapterServiceUrl(String chapterServiceUrl) {
        this.chapterServiceUrl = chapterServiceUrl;
    }
    
    public String getImageStorageServiceUrl() {
        return imageStorageServiceUrl;
    }
    
    public void setImageStorageServiceUrl(String imageStorageServiceUrl) {
        this.imageStorageServiceUrl = imageStorageServiceUrl;
    }
    
    public String getMelonServiceUrl() {
        return melonServiceUrl;
    }
    
    public void setMelonServiceUrl(String melonServiceUrl) {
        this.melonServiceUrl = melonServiceUrl;
    }
    
    public String getMelonServicePublicUrl() {
        return melonServicePublicUrl;
    }
    
    public void setMelonServicePublicUrl(String melonServicePublicUrl) {
        this.melonServicePublicUrl = melonServicePublicUrl;
    }
}
