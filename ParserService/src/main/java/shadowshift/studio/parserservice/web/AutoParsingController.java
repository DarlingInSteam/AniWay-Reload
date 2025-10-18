package shadowshift.studio.parserservice.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.parserservice.service.AutoParsingService;
import shadowshift.studio.parserservice.service.MaintenanceService;

import java.util.*;

/**
 * Контроллер для автопарсинга и обслуживания
 */
@RestController
@RequestMapping("/api")
public class AutoParsingController {

    private static final Logger logger = LoggerFactory.getLogger(AutoParsingController.class);

    @Autowired
    private AutoParsingService autoParsingService;
    
    @Autowired
    private MaintenanceService maintenanceService;

    /**
     * Запуск автопарсинга каталога
     * POST /api/auto-parse/start
     */
    @PostMapping("/auto-parse/start")
    public ResponseEntity<Map<String, Object>> startAutoParsing(@RequestBody Map<String, Object> request) {
        Integer page = request.containsKey("page") ? (Integer) request.get("page") : 1;
        Integer limit = request.containsKey("limit") ? (Integer) request.get("limit") : null;
        Integer minChapters = request.containsKey("min_chapters") ? (Integer) request.get("min_chapters") : null;
        Integer maxChapters = request.containsKey("max_chapters") ? (Integer) request.get("max_chapters") : null;

        logger.info("Запуск автопарсинга: page={}, limit={}, minChapters={}, maxChapters={}", 
            page, limit, minChapters, maxChapters);

        try {
            String taskId = autoParsingService.startAutoParsing(page, limit, minChapters, maxChapters);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("task_id", taskId);
            response.put("message", "Автопарсинг запущен");
            response.put("page", page);
            response.put("limit", limit);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Ошибка запуска автопарсинга", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Получение статуса задачи автопарсинга
     * GET /api/auto-parse/status/{taskId}
     */
    @GetMapping("/auto-parse/status/{taskId}")
    public ResponseEntity<Map<String, Object>> getAutoParseStatus(@PathVariable String taskId) {
        logger.debug("Запрос статуса автопарсинга: {}", taskId);

        try {
            Map<String, Object> status = autoParsingService.getAutoParseTaskStatus(taskId);
            return ResponseEntity.ok(status);

        } catch (Exception e) {
            logger.error("Ошибка получения статуса автопарсинга", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Очистка старых данных
     * POST /api/maintenance/mangalib/cleanup
     */
    @PostMapping("/maintenance/mangalib/cleanup")
    public ResponseEntity<Map<String, Object>> cleanup() {
        logger.info("Запуск очистки данных...");

        try {
            Map<String, Object> result = maintenanceService.cleanup();
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("Ошибка очистки данных", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Получение списка спарсенных манг
     * GET /api/list-parsed
     */
    @GetMapping("/list-parsed")
    public ResponseEntity<Map<String, Object>> listParsed() {
        logger.debug("Получение списка спарсенных манг");

        try {
            List<String> parsedSlugs = maintenanceService.listParsedMangas();

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", parsedSlugs.size());
            response.put("mangas", parsedSlugs);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Ошибка получения списка манг", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
