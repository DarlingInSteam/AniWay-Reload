package shadowshift.studio.notificationservice;

import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;
import shadowshift.studio.notificationservice.service.telegram.TelegramNotificationProperties;

@SpringBootApplication
@EnableRabbit
@EnableConfigurationProperties(TelegramNotificationProperties.class)
@EnableScheduling
public class NotificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }

}
