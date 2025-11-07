package com.example.recommendationservice.messaging;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MangaEvent {
    private String eventId;
    private String eventType;
    private LocalDateTime timestamp;
    private MangaEventData data;

    @Data
    public static class MangaEventData {
        private Long mangaId;
        private String title;
        private List<String> genres;
        private List<String> tags;
        private Double averageRating;
        private Long views;
    }
}
