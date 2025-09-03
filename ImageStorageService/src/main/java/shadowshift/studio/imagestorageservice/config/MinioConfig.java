package shadowshift.studio.imagestorageservice.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

    @Autowired
    private YandexStorageProperties yandexProperties;

    @Bean
    public MinioClient minioClient() {
        System.out.println("Configuring MinioClient for Yandex Object Storage");
        System.out.println("Endpoint: " + yandexProperties.getEndpoint());
        System.out.println("Region: " + yandexProperties.getRegion());
        System.out.println("Access Key: " + (yandexProperties.getAccessKey() != null ? 
            yandexProperties.getAccessKey().substring(0, Math.min(yandexProperties.getAccessKey().length(), 8)) + "..." : "null"));
        
        return MinioClient.builder()
                .endpoint(yandexProperties.getEndpoint())
                .credentials(yandexProperties.getAccessKey(), yandexProperties.getSecretKey())
                .region(yandexProperties.getRegion())
                .build();
    }
}
