package shadowshift.studio.parserservice.web.dto;

import java.util.List;
import java.util.UUID;

public class TaskLogsResponse {

    private final UUID taskId;
    private final List<TaskLogDto> logs;

    public TaskLogsResponse(UUID taskId, List<TaskLogDto> logs) {
        this.taskId = taskId;
        this.logs = logs;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public List<TaskLogDto> getLogs() {
        return logs;
    }
}
