package shadowshift.studio.forumservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.forumservice.dto.request.CreateMangaDiscussionRequest;
import shadowshift.studio.forumservice.dto.response.ForumThreadResponse;
import shadowshift.studio.forumservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.forumservice.service.ForumThreadService;

@RestController
@RequestMapping("/api/forum/manga")
@RequiredArgsConstructor
@Slf4j
public class MangaDiscussionController {

    private final ForumThreadService threadService;

    @GetMapping("/{mangaId}/threads")
    public ResponseEntity<Page<ForumThreadResponse>> getMangaThreads(
            @PathVariable Long mangaId,
            @RequestParam(defaultValue = "popular") String sort,
            @PageableDefault(size = 10) Pageable pageable,
            HttpServletRequest request) {

        log.info("GET /api/forum/manga/{}/threads?sort={} - получение обсуждений", mangaId, sort);
        Long currentUserId = getCurrentUserId(request);

        Page<ForumThreadResponse> threads = threadService.getThreadsForManga(mangaId, pageable, currentUserId, sort);
        return ResponseEntity.ok(threads);
    }

    @PostMapping("/{mangaId}/threads")
    public ResponseEntity<ForumThreadResponse> createMangaDiscussion(
            @PathVariable Long mangaId,
            @Valid @RequestBody CreateMangaDiscussionRequest requestBody,
            HttpServletRequest httpRequest) {

        log.info("POST /api/forum/manga/{}/threads - создание обсуждения", mangaId);
        Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        ForumThreadResponse created = threadService.createMangaDiscussion(
                mangaId,
                requestBody.getCategoryName(),
                requestBody.getTitle(),
                requestBody.getContent(),
                currentUserId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    private Long getCurrentUserId(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof GatewayAuthenticationFilter.AuthUserPrincipal principal) {
            return principal.id();
        }
        String header = request.getHeader("X-User-Id");
        if (header != null) {
            try {
                return Long.valueOf(header);
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }
}
