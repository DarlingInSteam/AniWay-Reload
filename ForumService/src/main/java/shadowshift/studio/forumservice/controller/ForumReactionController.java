package shadowshift.studio.forumservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import shadowshift.studio.forumservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.forumservice.entity.ForumReaction;
import shadowshift.studio.forumservice.service.ForumReactionService;

@RestController
@RequestMapping("/api/forum")
@RequiredArgsConstructor
@Slf4j
public class ForumReactionController {

    private final ForumReactionService reactionService;

    @PostMapping("/threads/{threadId}/reactions")
    public ResponseEntity<Void> reactToThread(@PathVariable Long threadId,
                                              @RequestParam("type") ForumReaction.ReactionType type,
                                              HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        reactionService.setReactionToThread(threadId, userId, type);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/threads/{threadId}/reactions")
    public ResponseEntity<Void> removeReactionFromThread(@PathVariable Long threadId, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        reactionService.removeReactionFromThread(threadId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{postId}/reactions")
    public ResponseEntity<Void> reactToPost(@PathVariable Long postId,
                                            @RequestParam("type") ForumReaction.ReactionType type,
                                            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        reactionService.setReactionToPost(postId, userId, type);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/posts/{postId}/reactions")
    public ResponseEntity<Void> removeReactionFromPost(@PathVariable Long postId, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        reactionService.removeReactionFromPost(postId, userId);
        return ResponseEntity.noContent().build();
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
}
