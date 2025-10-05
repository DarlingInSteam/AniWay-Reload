package shadowshift.studio.messageservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.messageservice.dto.ConversationView;
import shadowshift.studio.messageservice.dto.CreateConversationRequest;
import shadowshift.studio.messageservice.dto.MarkConversationReadRequest;
import shadowshift.studio.messageservice.dto.MessagePageView;
import shadowshift.studio.messageservice.dto.MessageView;
import shadowshift.studio.messageservice.dto.SendMessageRequest;
import shadowshift.studio.messageservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.messageservice.service.MessagingService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Validated
public class ConversationController {

    private final MessagingService messagingService;

    @GetMapping("/conversations")
    public List<ConversationView> listConversations(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                                    @RequestParam(name = "page", defaultValue = "0") int page,
                                                    @RequestParam(name = "size", defaultValue = "20") int size) {
        return messagingService.listConversations(principal.id(), page, size);
    }

    @PostMapping("/conversations")
    public ConversationView createPrivateConversation(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                                       @Valid @RequestBody CreateConversationRequest request) {
        return messagingService.createOrGetPrivateConversation(principal.id(), request.targetUserId());
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public MessagePageView getMessages(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                       @PathVariable UUID conversationId,
                                       @RequestParam(name = "before", required = false) UUID before,
                                       @RequestParam(name = "after", required = false) UUID after,
                                       @RequestParam(name = "size", required = false) Integer size) {
        return messagingService.getMessages(principal.id(), conversationId, before, after, size);
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public MessageView sendMessage(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                   @PathVariable UUID conversationId,
                                   @Valid @RequestBody SendMessageRequest request) {
        return messagingService.sendMessage(principal.id(), conversationId, request);
    }

    @PostMapping("/conversations/{conversationId}/read")
    public void markConversationRead(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                     @PathVariable UUID conversationId,
                                     @Valid @RequestBody MarkConversationReadRequest request) {
        messagingService.markConversationRead(principal.id(), conversationId, request);
    }

    @GetMapping("/conversations/unread-count")
    public long getUnreadCount(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        return messagingService.getDirectUnreadCount(principal.id());
    }
}
