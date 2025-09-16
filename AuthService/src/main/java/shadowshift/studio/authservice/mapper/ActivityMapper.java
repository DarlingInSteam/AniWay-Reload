package shadowshift.studio.authservice.mapper;

import shadowshift.studio.authservice.dto.ActivityDTO;
import shadowshift.studio.authservice.entity.ReadingProgress;
import shadowshift.studio.authservice.entity.Review;

public class ActivityMapper {

    private ActivityMapper() {}

    public static ActivityDTO fromReadingProgress(ReadingProgress progress) {
        if (progress == null) return null;

        String message = String.format("Прочитана глава %.1f", progress.getChapterNumber());

        String mangaTitle = "манги"; // заглушка, если потребуется - получить из внешнего сервиса
        if (mangaTitle != null && !mangaTitle.equals("манги")) {
            message = String.format("Прочитана глава %.1f манги '%s'", progress.getChapterNumber(), mangaTitle);
        }

        return ActivityDTO.builder()
                .id(progress.getId())
                .userId(progress.getUserId())
                .activityType("CHAPTER_COMPLETED")
                .message(message)
                .timestamp(progress.getUpdatedAt())
                .mangaId(progress.getMangaId())
                .mangaTitle(mangaTitle)
                .chapterId(progress.getChapterId())
                .chapterNumber(progress.getChapterNumber())
                .actionUrl(String.format("/manga/%d/chapter/%d", progress.getMangaId(), progress.getChapterId()))
                .build();
    }

    public static ActivityDTO fromReview(Review review) {
        if (review == null) return null;

        String message = String.format("Оставлен отзыв с оценкой %d/10", review.getRating());

        String mangaTitle = "манги"; // заглушка
        if (mangaTitle != null && !mangaTitle.equals("манги")) {
            message = String.format("Оставлен отзыв с оценкой %d/10 для манги '%s'", review.getRating(), mangaTitle);
        }

        return ActivityDTO.builder()
                .id(review.getId())
                .userId(review.getUserId())
                .activityType("REVIEW_CREATED")
                .message(message)
                .timestamp(review.getCreatedAt())
                .mangaId(review.getMangaId())
                .mangaTitle(mangaTitle)
                .reviewId(review.getId())
                .actionUrl(String.format("/manga/%d#review-%d", review.getMangaId(), review.getId()))
                .build();
    }
}
