package shadowshift.studio.parserservice.dto;

import lombok.Data;
import java.util.*;

/**
 * Задача автопарсинга
 */
@Data
public class AutoParseTask {
    private String taskId;
    private int page;
    private Integer limit;
    private String status = "pending";
    private int progress = 0;
    private String message = "";
    private Date createdAt;
    private Date updatedAt;
    private List<String> logs = Collections.synchronizedList(new ArrayList<>());
    private int totalSlugs = 0;
    private int processedSlugs = 0;
    private List<String> skippedSlugs = new ArrayList<>();
    private List<String> importedSlugs = new ArrayList<>();
    private List<String> failedSlugs = new ArrayList<>();
    
    public AutoParseTask(String taskId, int page, Integer limit) {
        this.taskId = taskId;
        this.page = page;
        this.limit = limit;
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
    
    public void addLog(String log) {
        String timestamp = new java.text.SimpleDateFormat("HH:mm:ss").format(new Date());
        logs.add(String.format("[%s] %s", timestamp, log));
    }
}
