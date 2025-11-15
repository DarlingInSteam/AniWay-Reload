package com.example.recommendationservice.messaging;

import com.example.recommendationservice.entity.MangaMetadata;
import com.example.recommendationservice.repository.MangaMetadataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MangaEventConsumer {

    private final MangaMetadataRepository mangaRepository;

    @RabbitListener(queues = "manga.recommendation.queue")
    public void handleMangaEvent(MangaEvent event) {
        try {
            log.info("Received manga event: {} for mangaId: {}", event.getEventType(), event.getData().getMangaId());

            switch (event.getEventType()) {
                case "MANGA_CREATED" -> handleMangaCreated(event.getData());
                case "MANGA_UPDATED" -> handleMangaUpdated(event.getData());
                case "MANGA_DELETED" -> handleMangaDeleted(event.getData());
                default -> log.warn("Unknown manga event type: {}", event.getEventType());
            }
        } catch (Exception e) {
            log.error("Error processing manga event: {}", e.getMessage(), e);
            throw e; // Перебросить для DLQ
        }
    }

    private void handleMangaCreated(MangaEvent.MangaEventData data) {
        // Сохраняем только mangaId в локальной entity
        // Полные данные будут кешироваться в MangaMetadataDto при необходимости
        MangaMetadata metadata = new MangaMetadata();
        metadata.setMangaId(data.getMangaId());

        mangaRepository.save(metadata);
        log.info("Saved manga metadata reference for mangaId: {}", data.getMangaId());
    }

    private void handleMangaUpdated(MangaEvent.MangaEventData data) {
        // Для обновления нам нужно только убедиться, что запись существует
        // Полные данные манги мы будем получать из MangaService по требованию
        mangaRepository.findByMangaId(data.getMangaId())
            .ifPresentOrElse(
                metadata -> {
                    // Entity уже существует, никаких изменений не требуется
                    // так как мы храним только mangaId
                    log.info("Manga metadata reference exists for mangaId: {}", data.getMangaId());
                },
                () -> {
                    log.warn("Manga not found for update, creating reference: {}", data.getMangaId());
                    handleMangaCreated(data); // Создаем запись, если не найдена
                }
            );
    }

    private void handleMangaDeleted(MangaEvent.MangaEventData data) {
        mangaRepository.findByMangaId(data.getMangaId())
            .ifPresent(metadata -> {
                mangaRepository.delete(metadata);
                log.info("Deleted manga metadata reference for mangaId: {}", data.getMangaId());
            });
    }
}
