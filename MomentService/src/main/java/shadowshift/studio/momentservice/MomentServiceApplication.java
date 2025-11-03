package shadowshift.studio.momentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import shadowshift.studio.momentservice.config.MomentRateLimitProperties;

@SpringBootApplication
@EnableConfigurationProperties(MomentRateLimitProperties.class)
public class MomentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(MomentServiceApplication.class, args);
    }

}
