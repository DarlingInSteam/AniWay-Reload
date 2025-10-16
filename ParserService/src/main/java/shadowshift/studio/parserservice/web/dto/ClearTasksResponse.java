package shadowshift.studio.parserservice.web.dto;

import java.util.List;
import java.util.UUID;

public class ClearTasksResponse {

    private final int cleared;
    private final List<UUID> taskIds;

    public ClearTasksResponse(int cleared, List<UUID> taskIds) {
        this.cleared = cleared;
        this.taskIds = taskIds;
    }

    public int getCleared() {
        return cleared;
    }

    public List<UUID> getTaskIds() {
        return taskIds;
    }
}
