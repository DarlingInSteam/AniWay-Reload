package shadowshift.studio.friendservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.friendservice.dto.CreateFriendRequestPayload;
import shadowshift.studio.friendservice.dto.FriendRequestView;
import shadowshift.studio.friendservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.friendservice.service.FriendRequestService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/friends/requests")
@RequiredArgsConstructor
public class FriendRequestController {

    private final FriendRequestService friendRequestService;

    @PostMapping
    public FriendRequestView createRequest(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                           @RequestBody @Valid CreateFriendRequestPayload payload) {
        Long userId = requireUser(principal);
        return friendRequestService.createRequest(userId, payload);
    }

    @GetMapping("/incoming")
    public List<FriendRequestView> incomingRequests(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        Long userId = requireUser(principal);
        return friendRequestService.getIncomingRequests(userId);
    }

    @GetMapping("/outgoing")
    public List<FriendRequestView> outgoingRequests(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        Long userId = requireUser(principal);
        return friendRequestService.getOutgoingRequests(userId);
    }

    @PostMapping("/{requestId}/accept")
    public FriendRequestView accept(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                    @PathVariable UUID requestId) {
        Long userId = requireUser(principal);
        return friendRequestService.acceptRequest(userId, requestId);
    }

    @PostMapping("/{requestId}/decline")
    public FriendRequestView decline(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                     @PathVariable UUID requestId) {
        Long userId = requireUser(principal);
        return friendRequestService.declineRequest(userId, requestId);
    }

    private Long requireUser(GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        if (principal == null || principal.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Необходима авторизация");
        }
        return principal.id();
    }
}
