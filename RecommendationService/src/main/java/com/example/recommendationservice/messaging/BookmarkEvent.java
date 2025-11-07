package com.example.recommendationservice.messaging;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BookmarkEvent {
    private String eventId;
    private String eventType;
    private LocalDateTime timestamp;
    private BookmarkEventData data;

    @Data
    public static class BookmarkEventData {
        private Long userId;
        private Long mangaId;
        private String status;
        private Boolean isFavorite;
    }
}
