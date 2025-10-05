package shadowshift.studio.messageservice.dto;

import java.util.List;
import java.util.UUID;

public record MessagePageView(
        List<MessageView> messages,
        boolean hasMore,
        UUID nextCursor
) {
}
