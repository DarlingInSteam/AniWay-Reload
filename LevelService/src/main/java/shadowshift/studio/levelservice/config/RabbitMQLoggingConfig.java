package shadowshift.studio.levelservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Adds extra startup logging for RabbitMQ connection parameters (excluding password)
 * to simplify diagnosing authentication issues in container environments.
 */
@Configuration
public class RabbitMQLoggingConfig {

    private static final Logger log = LoggerFactory.getLogger(RabbitMQLoggingConfig.class);

    @Value("${spring.rabbitmq.host}")
    private String host;
    @Value("${spring.rabbitmq.port}")
    private int port;
    @Value("${spring.rabbitmq.username}")
    private String username;
    @Value("${spring.rabbitmq.virtual-host:/}")
    private String vhost;

    @Bean
    public ConnectionFactory rabbitConnectionFactory(org.springframework.boot.autoconfigure.amqp.RabbitProperties props) {
        CachingConnectionFactory cf = new CachingConnectionFactory(host, port);
        cf.setUsername(username);
        cf.setPassword(props.getPassword());
        if (vhost != null) {
            cf.setVirtualHost(vhost);
        }
        // Enable publisher confirms/returns for reliability
        cf.setPublisherConfirmType(CachingConnectionFactory.ConfirmType.CORRELATED);
        cf.setPublisherReturns(true);

        log.info("[RabbitMQ] Initializing connection factory host={} port={} username={} vhost={}", host, port, username, vhost);
        return cf;
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMandatory(true);
        return template;
    }
}