package shadowshift.studio.notificationservice.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class NotificationResponseDTO {
    Long id;
    String type;
    String status;
    String payload;
    long createdAtEpoch;
    Long readAtEpoch;
}
