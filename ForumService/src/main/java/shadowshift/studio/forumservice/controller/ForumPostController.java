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
import shadowshift.studio.forumservice.repository.ForumReactionRepository;
import shadowshift.studio.forumservice.entity.ForumReaction;
import shadowshift.studio.forumservice.service.UserDirectoryClient;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/forum/threads/{threadId}/posts")
@RequiredArgsConstructor
@Slf4j
public class ForumPostController {

    private final ForumPostRepository postRepository;
    private final ForumThreadRepository threadRepository;
    private final ForumReactionRepository reactionRepository;
    private final UserDirectoryClient userDirectoryClient;

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

    /**
     * Древовидная структура постов (ограничение глубины и кол-ва потомков)
     */
    @GetMapping("/tree")
    public ResponseEntity<List<ForumPostResponse>> getPostsTree(
            @PathVariable Long threadId,
            @RequestParam(defaultValue = "5") int maxDepth,
            @RequestParam(defaultValue = "1000") int maxTotal,
            @RequestParam(defaultValue = "50") int pageSize) {
        log.info("GET /api/forum/threads/{}/posts/tree - получение дерева постов", threadId);

        if (!threadRepository.existsById(threadId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        // Получаем корневые посты (первый уровень)
        Pageable rootPageable = PageRequest.of(0, pageSize);
        List<ForumPost> roots = postRepository.findRootPostsByThreadId(threadId, rootPageable).getContent();

        Map<Long, List<ForumPost>> repliesMap = new HashMap<>();
        List<ForumPostResponse> tree = new ArrayList<>();

        // Итеративно строим дерево до maxDepth
        Queue<ForumPostResponse> queue = new ArrayDeque<>();
        for (ForumPost root : roots) {
            ForumPostResponse rootDto = mapToResponse(root).toBuilder().replies(new ArrayList<>()).build();
            tree.add(rootDto);
            queue.add(rootDto);
        }

        int processed = roots.size();
        int depth = 1;
        while (!queue.isEmpty() && depth < maxDepth && processed < maxTotal) {
            int levelSize = queue.size();
            depth++;
            for (int i = 0; i < levelSize; i++) {
                ForumPostResponse current = queue.poll();
                if (current == null) continue;
                Long parentId = current.getId();
                List<ForumPost> replies = postRepository.findRepliesByParentPostId(parentId);
                if (replies.isEmpty()) continue;
                List<ForumPostResponse> replyDtos = new ArrayList<>();
                for (ForumPost rp : replies) {
                    if (processed >= maxTotal) break;
                    ForumPostResponse dto = mapToResponse(rp).toBuilder().replies(new ArrayList<>()).build();
                    replyDtos.add(dto);
                    queue.add(dto);
                    processed++;
                }
                //noinspection unchecked
                ((List<ForumPostResponse>)current.getReplies()).addAll(replyDtos);
            }
        }

        return ResponseEntity.ok(tree);
    }

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
        Long currentUserId = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof GatewayAuthenticationFilter.AuthUserPrincipal principal) {
            currentUserId = principal.id();
        }
        String userReaction = null;
        if (currentUserId != null) {
            userReaction = reactionRepository.findByUserIdAndTargetTypeAndTargetId(currentUserId, ForumReaction.TargetType.POST, post.getId())
                    .map(r -> r.getReactionType().name())
                    .orElse(null);
        }
    boolean isAuthor = currentUserId != null && currentUserId.equals(post.getAuthorId());
    boolean withinEditWindow = java.time.Duration.between(post.getCreatedAt(), LocalDateTime.now()).toDays() < 7;

    // Enrich author
    String authorName = "Пользователь " + post.getAuthorId();
    String authorAvatar = null;
    try {
        Map<Long, UserDirectoryClient.UserBasic> users = userDirectoryClient.fetchUsers(java.util.Collections.singleton(post.getAuthorId()));
        UserDirectoryClient.UserBasic ub = users.get(post.getAuthorId());
        if (ub != null) {
            if (ub.displayName() != null && !ub.displayName().isBlank()) authorName = ub.displayName();
            else if (ub.username() != null) authorName = ub.username();
            authorAvatar = ub.avatar();
        }
    } catch (Exception e) {
        log.debug("Не удалось получить данные автора поста {}: {}", post.getAuthorId(), e.getMessage());
    }

    return ForumPostResponse.builder()
                .id(post.getId())
                .threadId(post.getThreadId())
                .content(post.getContent())
                .authorId(post.getAuthorId())
                .authorName(authorName)
                .authorAvatar(authorAvatar)
                .parentPostId(post.getParentPostId())
                .replies(null) // вложенные ответы реализовать позже
                .isDeleted(post.getIsDeleted())
                .isEdited(post.getIsEdited())
                .likesCount(post.getLikesCount())
                .dislikesCount(post.getDislikesCount())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .userReaction(userReaction)
        .canEdit(isAuthor && withinEditWindow)
        .canDelete(isAuthor)
                .build();
    }

}
