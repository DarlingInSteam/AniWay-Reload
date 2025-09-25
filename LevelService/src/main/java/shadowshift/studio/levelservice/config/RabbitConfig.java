package shadowshift.studio.levelservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {

    public static final String XP_EXCHANGE = "xp.events.exchange";
    public static final String XP_QUEUE = "xp.events.queue";
    public static final String XP_ROUTING_KEY = "xp.events.#";

    @Bean
    public TopicExchange xpExchange() {
        return new TopicExchange(XP_EXCHANGE, true, false);
    }

    @Bean
    public Queue xpQueue() {
        return QueueBuilder.durable(XP_QUEUE).build();
    }

    @Bean
    public Binding xpBinding(TopicExchange xpExchange, Queue xpQueue) {
        // Bind to all xp events
        return BindingBuilder.bind(xpQueue).to(xpExchange).with(XP_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jacksonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory,
                                                                               MessageConverter jacksonMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jacksonMessageConverter);
        // Tune prefetch if high throughput later: factory.setPrefetchCount(50);
        return factory;
    }
}
