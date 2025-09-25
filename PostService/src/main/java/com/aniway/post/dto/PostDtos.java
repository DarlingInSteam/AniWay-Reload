package com.aniway.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public class PostDtos {
    public record CreatePostRequest(
            @NotBlank @Size(max = 5000) String content,
            List<AttachmentRequest> attachments
    ) {}

    public record UpdatePostRequest(
            @NotBlank @Size(max = 5000) String content,
            List<AttachmentRequest> attachments
    ) {}

    public record AttachmentRequest(String filename, String url, long sizeBytes) {}

    public record AttachmentDto(Long id, String filename, String url, long sizeBytes) {}

    public record ReferenceDto(Long id, String type, Long refId) {}

    public record PostResponse(
            Long id,
            Long authorId,
            String content,
            Instant createdAt,
            Instant updatedAt,
            Instant editedUntil,
            int upVotes,
            int downVotes,
            Integer userVote,
            List<AttachmentDto> attachments,
            List<ReferenceDto> references
    ) {}

    // Frontend-aligned flattened shape
    public record FrontendPost(
            Long id,
            Long userId,
            String content,
            Instant createdAt,
            Instant updatedAt,
            Instant editedUntil,
                        boolean canEdit,
            List<AttachmentDto> attachments,
            List<ReferenceDto> references,
            Stats stats
    ) {
                public record Stats(int score, int up, int down, Integer userVote, Long commentsCount) {}
    }
}
