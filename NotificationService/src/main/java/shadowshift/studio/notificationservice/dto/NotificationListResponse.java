package shadowshift.studio.notificationservice.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class NotificationListResponse {
    List<NotificationResponseDTO> items;
    Long nextCursor;
    long unreadCount;
}
