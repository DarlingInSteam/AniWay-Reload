package com.example.recommendationservice.messaging;

import com.example.recommendationservice.entity.BookmarkStatus;
import com.example.recommendationservice.entity.UserBookmark;
import com.example.recommendationservice.entity.UserPreferenceProfile;
import com.example.recommendationservice.repository.UserBookmarkRepository;
import com.example.recommendationservice.repository.UserPreferenceProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookmarkEventConsumer {

    private final UserBookmarkRepository userBookmarkRepository;
    private final UserPreferenceProfileRepository profileRepository;

    @RabbitListener(queues = "bookmark.recommendation.queue")
    public void handleBookmarkEvent(BookmarkEvent event) {
        try {
            log.info("Received bookmark event: {} for userId: {}, mangaId: {}",
                event.getEventType(), event.getData().getUserId(), event.getData().getMangaId());

            switch (event.getEventType()) {
                case "BOOKMARK_ADDED" -> handleBookmarkAdded(event.getData());
                case "BOOKMARK_REMOVED" -> handleBookmarkRemoved(event.getData());
                case "BOOKMARK_STATUS_CHANGED" -> handleBookmarkStatusChanged(event.getData());
                default -> log.warn("Unknown bookmark event type: {}", event.getEventType());
            }

            // Помечаем профиль пользователя как устаревший
            invalidateUserProfile(event.getData().getUserId());

        } catch (Exception e) {
            log.error("Error processing bookmark event: {}", e.getMessage(), e);
            throw e; // Перебросить для DLQ
        }
    }

    private void handleBookmarkAdded(BookmarkEvent.BookmarkEventData data) {
        UserBookmark bookmark = new UserBookmark();
        bookmark.setUserId(data.getUserId());
        bookmark.setMangaId(data.getMangaId());
        bookmark.setStatus(BookmarkStatus.valueOf(data.getStatus()));
        bookmark.setIsFavorite(data.getIsFavorite());
        bookmark.setCreatedAt(LocalDateTime.now());

        userBookmarkRepository.save(bookmark);
        log.info("Added bookmark for userId: {}, mangaId: {}", data.getUserId(), data.getMangaId());
    }

    private void handleBookmarkRemoved(BookmarkEvent.BookmarkEventData data) {
        userBookmarkRepository.findByUserIdAndMangaId(data.getUserId(), data.getMangaId())
            .ifPresent(bookmark -> {
                userBookmarkRepository.delete(bookmark);
                log.info("Removed bookmark for userId: {}, mangaId: {}", data.getUserId(), data.getMangaId());
            });
    }

    private void handleBookmarkStatusChanged(BookmarkEvent.BookmarkEventData data) {
        userBookmarkRepository.findByUserIdAndMangaId(data.getUserId(), data.getMangaId())
            .ifPresentOrElse(
                bookmark -> {
                    bookmark.setStatus(BookmarkStatus.valueOf(data.getStatus()));
                    bookmark.setIsFavorite(data.getIsFavorite());
                    userBookmarkRepository.save(bookmark);
                    log.info("Updated bookmark status for userId: {}, mangaId: {} to {}",
                        data.getUserId(), data.getMangaId(), data.getStatus());
                },
                () -> {
                    log.warn("Bookmark not found for status change: userId={}, mangaId={}",
                        data.getUserId(), data.getMangaId());
                    handleBookmarkAdded(data); // Создаем, если не найдена
                }
            );
    }

    private void invalidateUserProfile(Long userId) {
        Optional<UserPreferenceProfile> profile = profileRepository.findByUserId(userId);
        if (profile.isPresent()) {
            UserPreferenceProfile userProfile = profile.get();
            userProfile.setLastUpdated(null); // Помечаем как устаревший
            profileRepository.save(userProfile);
            log.info("Invalidated user profile for userId: {}", userId);
        }
    }
}
