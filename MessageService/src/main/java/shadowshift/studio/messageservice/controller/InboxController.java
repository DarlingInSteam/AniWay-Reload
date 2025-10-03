package shadowshift.studio.messageservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.messageservice.dto.InboxSummaryView;
import shadowshift.studio.messageservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.messageservice.service.InboxService;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Validated
public class InboxController {

    private final InboxService inboxService;

    @GetMapping("/summary")
    public InboxSummaryView getSummary(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        Long userId = principal != null ? principal.id() : null;
        String role = principal != null ? principal.role() : null;
        return inboxService.getSummary(userId, role);
    }
}
