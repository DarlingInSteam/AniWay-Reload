package shadowshift.studio.friendservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.friendservice.dto.FriendSummaryView;
import shadowshift.studio.friendservice.dto.FriendView;
import shadowshift.studio.friendservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.friendservice.service.FriendSummaryService;
import shadowshift.studio.friendservice.service.FriendshipService;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendController {

    private final FriendshipService friendshipService;
    private final FriendSummaryService friendSummaryService;

    @GetMapping
    public List<FriendView> getMyFriends(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        Long userId = requireUser(principal);
        return friendshipService.listFriends(userId);
    }

    @GetMapping("/users/{userId}")
    public List<FriendView> getFriendsOfUser(@PathVariable Long userId) {
        return friendshipService.listFriends(userId);
    }

    @GetMapping("/summary")
    public FriendSummaryView getSummary(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        Long userId = requireUser(principal);
        return friendSummaryService.getSummary(userId);
    }

    @DeleteMapping("/{friendUserId}")
    public void removeFriend(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                              @PathVariable Long friendUserId) {
        Long userId = requireUser(principal);
        friendshipService.removeFriendship(userId, friendUserId);
    }

    private Long requireUser(GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        if (principal == null || principal.id() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Необходима авторизация");
        }
        return principal.id();
    }
}
