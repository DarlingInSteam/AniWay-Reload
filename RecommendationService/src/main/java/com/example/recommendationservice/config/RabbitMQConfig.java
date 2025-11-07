package com.example.recommendationservice.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // Exchanges
    public static final String MANGA_EXCHANGE = "manga.events";
    public static final String BOOKMARK_EXCHANGE = "bookmark.events";

    // Queues
    public static final String MANGA_RECOMMENDATION_QUEUE = "manga.recommendation.queue";
    public static final String BOOKMARK_RECOMMENDATION_QUEUE = "bookmark.recommendation.queue";

    // Dead Letter Queues
    public static final String MANGA_DLQ = "manga.recommendation.dlq";
    public static final String BOOKMARK_DLQ = "bookmark.recommendation.dlq";

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setDefaultRequeueRejected(false); // Отклоненные сообщения идут в DLQ
        return factory;
    }

    // Manga Events Configuration
    @Bean
    public TopicExchange mangaExchange() {
        return new TopicExchange(MANGA_EXCHANGE);
    }

    @Bean
    public Queue mangaRecommendationQueue() {
        return QueueBuilder.durable(MANGA_RECOMMENDATION_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", MANGA_DLQ)
                .withArgument("x-message-ttl", 86400000) // 24 часа TTL
                .build();
    }

    @Bean
    public Queue mangaDlq() {
        return QueueBuilder.durable(MANGA_DLQ).build();
    }

    @Bean
    public Binding mangaCreatedBinding() {
        return BindingBuilder.bind(mangaRecommendationQueue())
                .to(mangaExchange())
                .with("manga.created");
    }

    @Bean
    public Binding mangaUpdatedBinding() {
        return BindingBuilder.bind(mangaRecommendationQueue())
                .to(mangaExchange())
                .with("manga.updated");
    }

    // Bookmark Events Configuration
    @Bean
    public TopicExchange bookmarkExchange() {
        return new TopicExchange(BOOKMARK_EXCHANGE);
    }

    @Bean
    public Queue bookmarkRecommendationQueue() {
        return QueueBuilder.durable(BOOKMARK_RECOMMENDATION_QUEUE)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", BOOKMARK_DLQ)
                .withArgument("x-message-ttl", 86400000) // 24 часа TTL
                .build();
    }

    @Bean
    public Queue bookmarkDlq() {
        return QueueBuilder.durable(BOOKMARK_DLQ).build();
    }

    @Bean
    public Binding bookmarkAddedBinding() {
        return BindingBuilder.bind(bookmarkRecommendationQueue())
                .to(bookmarkExchange())
                .with("bookmark.added");
    }

    @Bean
    public Binding bookmarkRemovedBinding() {
        return BindingBuilder.bind(bookmarkRecommendationQueue())
                .to(bookmarkExchange())
                .with("bookmark.removed");
    }

    @Bean
    public Binding bookmarkStatusChangedBinding() {
        return BindingBuilder.bind(bookmarkRecommendationQueue())
                .to(bookmarkExchange())
                .with("bookmark.status.changed");
    }
}
