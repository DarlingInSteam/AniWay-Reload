package com.example.recommendationservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Queue;

@Configuration
@EnableRabbit
public class RabbitConfig {

    @Bean
    public Queue mangaEventsQueue() {
        return QueueBuilder.durable("recommendation.manga.events").build();
    }

    @Bean
    public Queue bookmarkEventsQueue() {
        return QueueBuilder.durable("recommendation.bookmark.events").build();
    }

    @Bean
    public TopicExchange mangaExchange() {
        return new TopicExchange("manga.events");
    }

    @Bean
    public Binding mangaBinding() {
        return BindingBuilder
                .bind(mangaEventsQueue())
                .to(mangaExchange())
                .with("manga.*");
    }
}