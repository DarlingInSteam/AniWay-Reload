package shadowshift.studio.parserservice.dto;

import lombok.Data;
import java.util.*;

/**
 * Задача билда манги (сборка глав с изображениями)
 */
@Data
public class BuildTask {
    private String taskId;
    private String slug;
    private String parser;
    private String status = "pending";
    private int progress = 0;
    private String message = "";
    private Date createdAt;
    private Date updatedAt;
    private List<String> logs = Collections.synchronizedList(new ArrayList<>());
    private int totalChapters = 0;
    private int completedChapters = 0;
    private int totalImages = 0;
    private int downloadedImages = 0;
    
    public BuildTask(String taskId, String slug, String parser) {
        this.taskId = taskId;
        this.slug = slug;
        this.parser = parser;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    public void updateStatus(String status, int progress, String message) {
        this.status = status;
        this.progress = progress;
        this.message = message;
        this.updatedAt = new Date();
        addLog(message);
    }
    
    public void updateProgress(int progress, String message) {
        this.progress = progress;
        this.message = message;
        this.updatedAt = new Date();
        addLog(message);
    }
    
    public void addLog(String log) {
        String timestamp = new java.text.SimpleDateFormat("HH:mm:ss").format(new Date());
        logs.add(String.format("[%s] %s", timestamp, log));
    }
}
