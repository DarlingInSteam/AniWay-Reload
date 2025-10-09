package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.mangaservice.service.ImportQueueService;

import java.util.List;
import java.util.Map;

/**
 * REST API для управления очередью импорта манги
 */
@RestController
@RequestMapping("/api/import-queue")
public class ImportQueueController {
    
    @Autowired
    private ImportQueueService importQueueService;
    
    /**
     * Получить статистику очереди импорта
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getQueueStats() {
        Map<String, Object> stats = importQueueService.getQueueStats();
        return ResponseEntity.ok(stats);
    }
    
    /**
     * Получить список всех активных импортов
     */
    @GetMapping("/active")
    public ResponseEntity<List<ImportQueueService.ImportQueueItem>> getActiveImports() {
        List<ImportQueueService.ImportQueueItem> activeImports = importQueueService.getActiveImports();
        return ResponseEntity.ok(activeImports);
    }
    
    /**
     * Получить статус конкретного импорта
     */
    @GetMapping("/status/{importTaskId}")
    public ResponseEntity<ImportQueueService.ImportQueueItem> getImportStatus(@PathVariable String importTaskId) {
        ImportQueueService.ImportQueueItem item = importQueueService.getImportStatus(importTaskId);
        if (item != null) {
            return ResponseEntity.ok(item);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Отменить импорт
     */
    @DeleteMapping("/{importTaskId}")
    public ResponseEntity<Map<String, Object>> cancelImport(@PathVariable String importTaskId) {
        boolean cancelled = importQueueService.cancelImport(importTaskId);
        return ResponseEntity.ok(Map.of(
            "success", cancelled,
            "message", cancelled ? "Импорт отменен" : "Импорт не найден или уже выполняется"
        ));
    }
}