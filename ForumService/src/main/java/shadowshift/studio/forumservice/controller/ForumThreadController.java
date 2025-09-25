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
import shadowshift.studio.forumservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.forumservice.dto.request.CreateThreadRequest;
import shadowshift.studio.forumservice.dto.request.UpdateThreadRequest;
import shadowshift.studio.forumservice.dto.response.ForumThreadResponse;
import shadowshift.studio.forumservice.service.ForumThreadService;
import shadowshift.studio.forumservice.service.ForumSubscriptionService;

@RestController
@RequestMapping("/api/forum/threads")
@RequiredArgsConstructor
@Slf4j
public class ForumThreadController {

    private final ForumThreadService threadService;
    private final ForumSubscriptionService subscriptionService;

    /**
     * Получить все темы с пагинацией
     */
    @GetMapping
    public ResponseEntity<Page<ForumThreadResponse>> getAllThreads(
            @RequestParam(required = false) Long categoryId,
            @PageableDefault(size = 20) Pageable pageable,
            HttpServletRequest request) {
        
        log.info("GET /api/forum/threads - получение тем, категория: {}", categoryId);
    Long currentUserId = getCurrentUserId(request);
        
        Page<ForumThreadResponse> threads;
        if (categoryId != null) {
            threads = threadService.getThreadsByCategory(categoryId, pageable, currentUserId);
        } else {
            threads = threadService.getAllThreads(pageable, currentUserId);
        }
        
        return ResponseEntity.ok(threads);
    }

    /**
     * Получить тему по ID
     */
    @GetMapping("/{threadId}")
    public ResponseEntity<ForumThreadResponse> getThreadById(
            @PathVariable Long threadId,
            HttpServletRequest request) {
        
        log.info("GET /api/forum/threads/{} - получение темы по ID", threadId);
    Long currentUserId = getCurrentUserId(request);
        String userIp = getClientIpAddress(request);
        
        ForumThreadResponse thread = threadService.getThreadById(threadId, currentUserId, userIp);
        return ResponseEntity.ok(thread);
    }

    /**
     * Создать новую тему
     */
    @PostMapping
    public ResponseEntity<ForumThreadResponse> createThread(
            @Valid @RequestBody CreateThreadRequest request,
            HttpServletRequest httpRequest) {
        
        log.info("POST /api/forum/threads - создание новой темы: {}", request.getTitle());
    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        ForumThreadResponse thread = threadService.createThread(request, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(thread);
    }

    /**
     * Обновить тему
     */
    @PutMapping("/{threadId}")
    public ResponseEntity<ForumThreadResponse> updateThread(
            @PathVariable Long threadId,
            @Valid @RequestBody UpdateThreadRequest request,
            HttpServletRequest httpRequest) {
        
        log.info("PUT /api/forum/threads/{} - обновление темы", threadId);
    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        ForumThreadResponse thread = threadService.updateThread(threadId, request, currentUserId);
        return ResponseEntity.ok(thread);
    }

    /**
     * Удалить тему
     */
    @DeleteMapping("/{threadId}")
    public ResponseEntity<Void> deleteThread(
            @PathVariable Long threadId,
            HttpServletRequest httpRequest) {
        
        log.info("DELETE /api/forum/threads/{} - удаление темы", threadId);
    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        threadService.deleteThread(threadId, currentUserId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Закрепить/открепить тему (только для модераторов)
     */
    @PostMapping("/{threadId}/pin")
    public ResponseEntity<ForumThreadResponse> pinThread(
            @PathVariable Long threadId,
            @RequestParam(defaultValue = "true") boolean pinned,
            HttpServletRequest httpRequest) {
        
        log.info("POST /api/forum/threads/{}/pin - изменение закрепления темы: {}", threadId, pinned);
    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        ForumThreadResponse thread = threadService.pinThread(threadId, pinned, currentUserId);
        return ResponseEntity.ok(thread);
    }

    /**
     * Заблокировать/разблокировать тему (только для модераторов)
     */
    @PostMapping("/{threadId}/lock")
    public ResponseEntity<ForumThreadResponse> lockThread(
            @PathVariable Long threadId,
            @RequestParam(defaultValue = "true") boolean locked,
            HttpServletRequest httpRequest) {
        
        log.info("POST /api/forum/threads/{}/lock - изменение блокировки темы: {}", threadId, locked);
    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        ForumThreadResponse thread = threadService.lockThread(threadId, locked, currentUserId);
        return ResponseEntity.ok(thread);
    }

    /**
     * Поиск тем
     */
    @GetMapping("/search")
    public ResponseEntity<Page<ForumThreadResponse>> searchThreads(
            @RequestParam String q,
            @PageableDefault(size = 20) Pageable pageable,
            HttpServletRequest request) {
        
        log.info("GET /api/forum/threads/search?q={} - поиск тем", q);
    Long currentUserId = getCurrentUserId(request);
        
        Page<ForumThreadResponse> threads = threadService.searchThreads(q, pageable, currentUserId);
        return ResponseEntity.ok(threads);
    }

    /**
     * Получить темы автора
     */
    @GetMapping("/author/{authorId}")
    public ResponseEntity<Page<ForumThreadResponse>> getThreadsByAuthor(
            @PathVariable Long authorId,
            @PageableDefault(size = 20) Pageable pageable,
            HttpServletRequest request) {
        
        log.info("GET /api/forum/threads/author/{} - получение тем автора", authorId);
    Long currentUserId = getCurrentUserId(request);
        
        Page<ForumThreadResponse> threads = threadService.getThreadsByAuthor(authorId, pageable, currentUserId);
        return ResponseEntity.ok(threads);
    }

    /**
     * Подписаться на тему
     */
    @PostMapping("/{threadId}/subscribe")
    public ResponseEntity<Void> subscribeToThread(
            @PathVariable Long threadId,
            HttpServletRequest httpRequest) {
        
        log.info("POST /api/forum/threads/{}/subscribe - подписка на тему", threadId);
    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        subscriptionService.subscribe(threadId, currentUserId);
        return ResponseEntity.ok().build();
    }

    /**
     * Отписаться от темы
     */
    @DeleteMapping("/{threadId}/subscribe")
    public ResponseEntity<Void> unsubscribeFromThread(
            @PathVariable Long threadId,
            HttpServletRequest httpRequest) {
        
        log.info("DELETE /api/forum/threads/{}/subscribe - отписка от темы", threadId);
    Long currentUserId = getCurrentUserId(httpRequest);
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        subscriptionService.unsubscribe(threadId, currentUserId);
        return ResponseEntity.ok().build();
    }

    private Long getCurrentUserId(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof GatewayAuthenticationFilter.AuthUserPrincipal principal) {
            return principal.id();
        }
        String header = request.getHeader("X-User-Id");
        if (header != null) {
            try { return Long.valueOf(header); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    /**
     * Получить IP адрес клиента
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}