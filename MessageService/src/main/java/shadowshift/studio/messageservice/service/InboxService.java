package shadowshift.studio.messageservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.messageservice.dto.InboxSummaryView;
import shadowshift.studio.messageservice.integration.FriendServiceClient;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InboxService {

    private final MessagingService messagingService;
    private final CategoryService categoryService;
    private final FriendServiceClient friendServiceClient;

    public InboxSummaryView getSummary(Long userId, String role) {
        if (userId == null || userId <= 0) {
            return new InboxSummaryView(0, 0, 0);
        }
        long directUnread = messagingService.getDirectUnreadCount(userId);
        long channelUnread = categoryService.getUnreadMap(userId).values().stream()
                .mapToLong(Long::longValue)
                .sum();
        long pendingRequests = friendServiceClient.fetchIncomingPending(userId, role);
        return new InboxSummaryView(directUnread, channelUnread, pendingRequests);
    }
}
