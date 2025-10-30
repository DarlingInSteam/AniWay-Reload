package shadowshift.studio.momentservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import shadowshift.studio.momentservice.entity.ReactionType;

public final class MomentDtos {

    private MomentDtos() {
    }

    public record ImagePayload(
        @NotBlank String url,
        @NotBlank String key,
        @NotNull @Positive Integer width,
        @NotNull @Positive Integer height,
        @NotNull @Positive Long sizeBytes
    ) { }

    public record CreateMomentRequest(
        @NotNull Long mangaId,
        @Positive Long chapterId,
        @Positive Integer pageNumber,
        @NotBlank @Size(max = 280) String caption,
        boolean spoiler,
        boolean nsfw,
        @Valid @NotNull ImagePayload image
    ) { }

    public record MomentResponse(
        Long id,
        Long mangaId,
        Long chapterId,
        Integer pageNumber,
        Long uploaderId,
        String caption,
        boolean spoiler,
        boolean nsfw,
        boolean hidden,
        boolean reported,
        int likesCount,
        int likesCount7d,
        int dislikesCount,
        int commentsCount,
        int commentsCount7d,
        Instant lastActivityAt,
        Instant createdAt,
        Instant updatedAt,
        ImagePayload image,
        ReactionType userReaction
    ) { }

    public record MomentPageResponse(
        List<MomentResponse> items,
        int page,
        int size,
        long total,
        boolean hasNext
    ) { }

    public record ReactionRequest(
        @NotNull ReactionType reaction
    ) { }

    public record CommentCountUpdateRequest(
        @PositiveOrZero int count,
        Instant lastActivityAt
    ) { }

    public record InternalMomentResponse(
        Long id,
        Long mangaId,
        Long chapterId,
        Integer pageNumber,
        Long uploaderId,
        boolean hidden,
        boolean spoiler,
        boolean nsfw,
        boolean reported,
        int likesCount,
        int dislikesCount,
        int commentsCount,
        Instant lastActivityAt,
        Instant createdAt,
        Instant updatedAt,
        ImagePayload image
    ) { }
}
