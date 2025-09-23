package shadowshift.studio.notificationservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class MarkReadRequest {
    private List<Long> ids;
}
