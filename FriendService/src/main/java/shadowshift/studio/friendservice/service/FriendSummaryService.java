package shadowshift.studio.friendservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.friendservice.dto.FriendSummaryView;

@Service
@RequiredArgsConstructor
public class FriendSummaryService {

    private final FriendshipService friendshipService;
    private final FriendRequestService friendRequestService;

    @Transactional(readOnly = true)
    public FriendSummaryView getSummary(Long userId) {
        long friends = friendshipService.countFriends(userId);
        long incoming = friendRequestService.countIncoming(userId);
        long outgoing = friendRequestService.countOutgoing(userId);
        return new FriendSummaryView(friends, incoming, outgoing);
    }
}
