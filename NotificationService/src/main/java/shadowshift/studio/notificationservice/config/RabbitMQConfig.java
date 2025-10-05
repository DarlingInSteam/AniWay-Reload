package shadowshift.studio.notificationservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Bean
    public MessageConverter jackson2JsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }

    @Bean
    public TopicExchange friendNotificationExchange(@Value("${notifications.friend.exchange:notifications.friend.exchange}") String exchange) {
        return new TopicExchange(exchange, true, false);
    }

    @Bean
    public Queue friendNotificationQueue(@Value("${notifications.friend.queue:notifications.friend.events}") String queueName) {
        return new Queue(queueName, true);
    }

    @Bean
    public Binding friendNotificationBinding(Queue friendNotificationQueue,
                                             TopicExchange friendNotificationExchange,
                                             @Value("${notifications.friend.routing-key:notifications.friend.event}") String routingKey) {
        return BindingBuilder.bind(friendNotificationQueue).to(friendNotificationExchange).with(routingKey);
    }
}
