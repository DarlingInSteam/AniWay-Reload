package shadowshift.studio.forumservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import shadowshift.studio.forumservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.forumservice.entity.ForumPost;
import shadowshift.studio.forumservice.dto.response.ForumPostResponse;
import shadowshift.studio.forumservice.repository.ForumPostRepository;
import shadowshift.studio.forumservice.repository.ForumThreadRepository;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/forum/threads/{threadId}/posts")
@RequiredArgsConstructor
@Slf4j
public class ForumPostController {

    private final ForumPostRepository postRepository;
    private final ForumThreadRepository threadRepository;

    @GetMapping
    public ResponseEntity<Page<ForumPostResponse>> getPosts(
            @PathVariable Long threadId,
            @PageableDefault(size = 20) Pageable pageable) {
        log.info("GET /api/forum/threads/{}/posts - получение постов", threadId);

        if (!threadRepository.existsById(threadId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Page<ForumPost> page = postRepository.findByThreadIdAndNotDeleted(threadId, pageable);
        Page<ForumPostResponse> dtoPage = page.map(this::mapToResponse);
        return ResponseEntity.ok(dtoPage);
    }

    public record CreatePostRequest(String content, Long parentPostId) {}

    @PostMapping
    public ResponseEntity<ForumPostResponse> createPost(
            @PathVariable Long threadId,
            @Valid @RequestBody CreatePostRequest request,
            HttpServletRequest httpRequest) {
        log.info("POST /api/forum/threads/{}/posts - создание поста", threadId);

        if (!threadRepository.existsById(threadId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        ForumPost post = ForumPost.builder()
                .threadId(threadId)
                .content(request.content())
                .authorId(currentUserId)
                .parentPostId(request.parentPostId())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        ForumPost saved = postRepository.save(post);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    private Long getCurrentUserId(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof GatewayAuthenticationFilter.AuthUserPrincipal principal) {
            return principal.id();
        }
        // Fallback: напрямую из заголовка (если SecurityContext не заполнился)
        String header = request.getHeader("X-User-Id");
        if (header != null) {
            try { return Long.valueOf(header); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    private ForumPostResponse mapToResponse(ForumPost post) {
        return ForumPostResponse.builder()
                .id(post.getId())
                .threadId(post.getThreadId())
                .content(post.getContent())
                .authorId(post.getAuthorId())
                .authorName("Пользователь " + post.getAuthorId()) // TODO AuthService
                .authorAvatar(null) // TODO avatar
                .parentPostId(post.getParentPostId())
                .replies(null) // вложенные ответы реализовать позже
                .isDeleted(post.getIsDeleted())
                .isEdited(post.getIsEdited())
                .likesCount(post.getLikesCount())
                .dislikesCount(post.getDislikesCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .userReaction(null) // TODO реакция пользователя
                .canEdit(false) // TODO вычисление прав
                .canDelete(false) // TODO вычисление прав
                .build();
    }
}
