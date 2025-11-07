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
                default -> log.warn("Unknown manga event type: {}", event.getEventType());
            }
        } catch (Exception e) {
            log.error("Error processing manga event: {}", e.getMessage(), e);
            throw e; // Перебросить для DLQ
        }
    }

    private void handleMangaCreated(MangaEvent.MangaEventData data) {
        MangaMetadata metadata = new MangaMetadata();
        metadata.setMangaId(data.getMangaId());
        metadata.setTitle(data.getTitle());
        metadata.setGenres(data.getGenres());
        metadata.setTags(data.getTags());
        metadata.setAverageRating(data.getAverageRating());
        metadata.setViews(data.getViews());

        mangaRepository.save(metadata);
        log.info("Saved new manga metadata for mangaId: {}", data.getMangaId());
    }

    private void handleMangaUpdated(MangaEvent.MangaEventData data) {
        mangaRepository.findByMangaId(data.getMangaId())
            .ifPresentOrElse(
                metadata -> {
                    metadata.setTitle(data.getTitle());
                    metadata.setGenres(data.getGenres());
                    metadata.setTags(data.getTags());
                    metadata.setAverageRating(data.getAverageRating());
                    metadata.setViews(data.getViews());
                    mangaRepository.save(metadata);
                    log.info("Updated manga metadata for mangaId: {}", data.getMangaId());
                },
                () -> {
                    log.warn("Manga not found for update: {}", data.getMangaId());
                    handleMangaCreated(data); // Создаем, если не найдена
                }
            );
    }

    private void handleMangaDeleted(MangaEvent.MangaEventData data) {
        mangaRepository.findByMangaId(data.getMangaId())
            .ifPresent(metadata -> {
                mangaRepository.delete(metadata);
                log.info("Deleted manga metadata for mangaId: {}", data.getMangaId());
            });
    }
}
