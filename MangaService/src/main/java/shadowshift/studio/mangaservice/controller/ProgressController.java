package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.mangaservice.service.ImportTaskService;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/parser/progress")
public class ProgressController {

    private static final Logger logger = LoggerFactory.getLogger(ProgressController.class);

    @Autowired
    private ImportTaskService importTaskService;

    @PostMapping("/{taskId}")
    public ResponseEntity<?> updateProgress(@PathVariable String taskId, @RequestBody Map<String, Object> payload) {
        logger.info("ProgressController: received payload for task {}: {}", taskId, payload);
        try {
            String status = (String) payload.get("status");
            Integer progress = payload.get("progress") != null ? ((Number) payload.get("progress")).intValue() : null;
            String message = (String) payload.get("message");
            String error = (String) payload.get("error");

            if (status == null) {
                logger.error("ProgressController: missing status field");
                return ResponseEntity.badRequest().body(Map.of("error", "Missing status field"));
            }
            String statusUpper = status.toUpperCase();
            boolean validStatus = false;
            for (ImportTaskService.TaskStatus s : ImportTaskService.TaskStatus.values()) {
                if (s.name().equals(statusUpper)) {
                    validStatus = true;
                    break;
                }
            }
            if (!validStatus) {
                logger.error("ProgressController: invalid status value: {}", status);
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status value: " + status));
            }

            if (progress == null) progress = 0;

            importTaskService.updateTask(taskId, ImportTaskService.TaskStatus.valueOf(statusUpper), progress, message != null ? message : "");

            if ("COMPLETED".equals(statusUpper)) {
                importTaskService.markTaskCompleted(taskId);
            } else if ("FAILED".equals(statusUpper) && error != null) {
                importTaskService.markTaskFailed(taskId, error);
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("ProgressController: error processing payload: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
