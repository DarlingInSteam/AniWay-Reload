package shadowshift.studio.parserservice.web.dto;

import java.util.UUID;

public class TaskCreatedResponse {

    private final UUID taskId;
    private final String status;

    public TaskCreatedResponse(UUID taskId, String status) {
        this.taskId = taskId;
        this.status = status;
    }

    public UUID getTaskId() {
        return taskId;
    }

    public String getStatus() {
        return status;
    }
}
