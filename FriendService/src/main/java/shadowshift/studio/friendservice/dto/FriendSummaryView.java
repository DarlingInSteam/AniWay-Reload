package shadowshift.studio.friendservice.dto;

public record FriendSummaryView(
        long friends,
        long incomingPending,
        long outgoingPending
) {}
