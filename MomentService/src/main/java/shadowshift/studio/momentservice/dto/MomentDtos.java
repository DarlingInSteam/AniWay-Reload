package shadowshift.studio.momentservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

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
        ImagePayload image
    ) { }

    public record MomentPageResponse(
        List<MomentResponse> items,
        int page,
        int size,
        long total,
        boolean hasNext
    ) { }
}
