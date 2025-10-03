package shadowshift.studio.messageservice.dto;

public record InboxSummaryView(
        long directUnread,
        long channelUnread,
        long pendingFriendRequests
) {
}
