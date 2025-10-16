package shadowshift.studio.parserservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.http.client.HttpClientAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication(exclude = {HttpClientAutoConfiguration.class})
@ConfigurationPropertiesScan
public class ParserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ParserServiceApplication.class, args);
    }

}
