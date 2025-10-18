package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.mangaservice.service.ImportTaskService;
import shadowshift.studio.mangaservice.service.AutoParsingService;
import shadowshift.studio.mangaservice.service.MangaUpdateService;
import java.util.Map;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * REST-контроллер для управления прогрессом задач импорта манги.
 *
 * Предоставляет API для обновления статуса и прогресса выполнения задач импорта,
 * позволяя внешним системам (парсерам) сообщать о текущем состоянии обработки.
 * Обеспечивает валидацию входящих данных и корректное обновление состояния задач.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/parser/progress")
public class ProgressController {

    private static final Logger logger = LoggerFactory.getLogger(ProgressController.class);

    @Autowired
    private ImportTaskService importTaskService;

    @Autowired
    private AutoParsingService autoParsingService;

    @Autowired
    private MangaUpdateService mangaUpdateService;

    /**
     * Обновляет прогресс выполнения задачи импорта.
     *
     * Принимает данные о текущем статусе, прогрессе, сообщении и возможной ошибке
     * для указанной задачи импорта. Выполняет валидацию входных данных и обновляет
     * состояние задачи в системе.
     *
     * @param taskId уникальный идентификатор задачи импорта
     * @param payload данные обновления прогресса, содержащие статус, прогресс, сообщение и ошибку
     * @return ResponseEntity с результатом операции обновления
     */
    @PostMapping("/{taskId}")
    public ResponseEntity<?> updateProgress(@PathVariable String taskId, @RequestBody Map<String, Object> payload) {
        logger.info("Получен запрос на обновление прогресса для задачи {}: {}", taskId, payload);
        try {
            String status = (String) payload.get("status");
            Integer progress = payload.get("progress") != null ? ((Number) payload.get("progress")).intValue() : null;
            String message = (String) payload.get("message");
            String error = (String) payload.get("error");
            @SuppressWarnings("unchecked")
            List<String> logs = (List<String>) payload.get("logs");  // Логи из MelonService
            Map<String, Object> metrics = null;
            Object metricsObj = payload.get("metrics");
            if (metricsObj instanceof Map<?, ?> rawMetrics) {
                @SuppressWarnings("unchecked")
                Map<String, Object> castedMetrics = (Map<String, Object>) rawMetrics;
                metrics = castedMetrics;
            }

            // Если есть логи, добавляем их в задачу автопарсинга/автообновления
            if (logs != null && !logs.isEmpty()) {
                logger.info("📋 Получено {} логов от MelonService для задачи {}", logs.size(), taskId);
                for (String log : logs) {
                    autoParsingService.addLogToTask(taskId, log);
                    mangaUpdateService.addLogToUpdateTask(taskId, log);
                }
                logger.info("✅ Логи успешно переданы в AutoParsingService и MangaUpdateService");
            }

            if (status == null) {
                logger.error("Отсутствует обязательное поле 'status'");
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
                logger.error("Некорректное значение статуса: {}", status);
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid status value: " + status));
            }

            if (progress == null) progress = 0;

            importTaskService.updateTask(taskId, ImportTaskService.TaskStatus.valueOf(statusUpper), progress, message != null ? message : "", metrics);

            if ("COMPLETED".equals(statusUpper)) {
                importTaskService.markTaskCompleted(taskId);
            } else if ("FAILED".equals(statusUpper) && error != null) {
                importTaskService.markTaskFailed(taskId, error);
            }

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Ошибка при обработке запроса на обновление прогресса: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
