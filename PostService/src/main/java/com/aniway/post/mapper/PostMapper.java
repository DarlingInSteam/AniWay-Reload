package com.aniway.post.mapper;

import com.aniway.post.dto.PostDtos;
import com.aniway.post.model.Post;
import com.aniway.post.model.PostAttachment;
import com.aniway.post.model.PostReference;
import com.aniway.post.model.PostVote;

import java.util.List;
import java.util.stream.Collectors;

public class PostMapper {
    public static PostDtos.PostResponse toResponse(Post post, Long currentUserId) {
        int up = (int) post.getVotes().stream().filter(v -> v.getValue() == 1).count();
        int down = (int) post.getVotes().stream().filter(v -> v.getValue() == -1).count();
        Integer userVote = null;
        if (currentUserId != null) {
            userVote = post.getVotes().stream()
                    .filter(v -> v.getUserId().equals(currentUserId))
                    .map(PostVote::getValue)
                    .findFirst().orElse(null);
        }
        List<PostDtos.AttachmentDto> attachments = post.getAttachments().stream()
                .map(a -> new PostDtos.AttachmentDto(a.getId(), a.getFilename(), a.getUrl(), a.getSizeBytes()))
                .collect(Collectors.toList());
        List<PostDtos.ReferenceDto> refs = post.getReferences().stream()
                .map(r -> new PostDtos.ReferenceDto(r.getId(), r.getType(), r.getRefId()))
                .collect(Collectors.toList());
        return new PostDtos.PostResponse(
                post.getId(),
                post.getAuthorId(),
                post.getContent(),
                post.getCreatedAt(),
                post.getUpdatedAt(),
                post.getEditedUntil(),
                up,
                down,
                userVote,
                attachments,
                refs
        );
    }

    public static PostDtos.FrontendPost toFrontend(Post post, Long currentUserId) {
    int up = (int) post.getVotes().stream().filter(v -> v.getValue() == 1).count();
    int down = (int) post.getVotes().stream().filter(v -> v.getValue() == -1).count();
    Integer userVote = null;
    if (currentUserId != null) {
        userVote = post.getVotes().stream()
            .filter(v -> v.getUserId().equals(currentUserId))
            .map(PostVote::getValue)
            .findFirst().orElse(null);
    }
    List<PostDtos.AttachmentDto> attachments = post.getAttachments().stream()
        .map(a -> new PostDtos.AttachmentDto(a.getId(), a.getFilename(), a.getUrl(), a.getSizeBytes()))
        .collect(Collectors.toList());
    List<PostDtos.ReferenceDto> refs = post.getReferences().stream()
        .map(r -> new PostDtos.ReferenceDto(r.getId(), r.getType(), r.getRefId()))
        .collect(Collectors.toList());
    int score = up - down;
    boolean canEdit = post.getEditedUntil() == null || post.getEditedUntil().isAfter(java.time.Instant.now());
    long commentsCount = 0L; // placeholder until integrated with CommentService aggregation
    return new PostDtos.FrontendPost(
            post.getId(),
            post.getAuthorId(),
            post.getContent(),
            post.getCreatedAt(),
            post.getUpdatedAt(),
            post.getEditedUntil(),
            canEdit,
            attachments,
            refs,
            new PostDtos.FrontendPost.Stats(score, up, down, userVote, commentsCount)
    );
    }

    public static void applyAttachments(Post post, List<PostDtos.AttachmentRequest> attachmentRequests) {
        post.getAttachments().clear();
        if (attachmentRequests == null) return;
        for (PostDtos.AttachmentRequest req : attachmentRequests) {
            PostAttachment att = new PostAttachment();
            att.setPost(post);
            att.setFilename(req.filename());
            att.setUrl(req.url());
            att.setSizeBytes(req.sizeBytes());
            post.getAttachments().add(att);
        }
    }
}
