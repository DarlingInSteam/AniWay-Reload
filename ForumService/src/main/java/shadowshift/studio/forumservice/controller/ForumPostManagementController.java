package shadowshift.studio.forumservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.forumservice.entity.ForumPost;
import shadowshift.studio.forumservice.repository.ForumPostRepository;
import shadowshift.studio.forumservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.forumservice.dto.response.ForumPostResponse;

import java.time.Duration;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/forum/posts")
@RequiredArgsConstructor
@Slf4j
public class ForumPostManagementController {

    private final ForumPostRepository postRepository;

    public record UpdatePostRequest(@NotBlank String content) {}

    @PutMapping("/{postId}")
    public ResponseEntity<ForumPostResponse> updatePost(
            @PathVariable Long postId,
            @RequestBody UpdatePostRequest request,
            HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        ForumPost post = postRepository.findByIdAndNotDeleted(postId)
                .orElseThrow(() -> new RuntimeException("Пост не найден"));

        if (!post.getAuthorId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        if (Duration.between(post.getCreatedAt(), LocalDateTime.now()).toDays() >= 7) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(null);
        }

        post.setContent(request.content());
        post.setIsEdited(true);
        post.setUpdatedAt(LocalDateTime.now());
        ForumPost saved = postRepository.save(post);
        return ResponseEntity.ok(mapToResponse(saved));
    }

    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable Long postId, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        ForumPost post = postRepository.findByIdAndNotDeleted(postId)
                .orElseThrow(() -> new RuntimeException("Пост не найден"));

        if (!post.getAuthorId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        post.setIsDeleted(true);
        postRepository.save(post);
        return ResponseEntity.noContent().build();
    }

    private Long getCurrentUserId(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof GatewayAuthenticationFilter.AuthUserPrincipal p) {
            return p.id();
        }
        String header = request.getHeader("X-User-Id");
        if (header != null) {
            try { return Long.valueOf(header); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private ForumPostResponse mapToResponse(ForumPost post) {
    boolean isAuthor = true; // already verified
    boolean withinEditWindow = java.time.Duration.between(post.getCreatedAt(), LocalDateTime.now()).toDays() < 7;
    String authorName = "Пользователь " + post.getAuthorId();
    String authorAvatar = null; // фронтенд подтянет

    return ForumPostResponse.builder()
                .id(post.getId())
                .threadId(post.getThreadId())
                .content(post.getContent())
                .authorId(post.getAuthorId())
                .authorName(authorName)
                .authorAvatar(authorAvatar)
                .parentPostId(post.getParentPostId())
                .replies(null)
                .isDeleted(post.getIsDeleted())
                .isEdited(post.getIsEdited())
                .likesCount(post.getLikesCount())
                .dislikesCount(post.getDislikesCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .userReaction(null)
        .canEdit(isAuthor && withinEditWindow)
        .canDelete(isAuthor)
                .build();
    }
}
