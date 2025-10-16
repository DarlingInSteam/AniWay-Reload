package shadowshift.studio.parserservice.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.parserservice.service.MaintenanceService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Legacy maintenance endpoints for MangaService compatibility
 */
@RestController
@RequestMapping
public class LegacyMaintenanceController {
    
    private static final Logger logger = LoggerFactory.getLogger(LegacyMaintenanceController.class);
    
    @Autowired
    private MaintenanceService maintenanceService;
    
    /**
     * Legacy cleanup endpoint (without /api prefix)
     * POST /maintenance/mangalib/cleanup
     */
    @PostMapping("/maintenance/mangalib/cleanup")
    public ResponseEntity<Map<String, Object>> cleanup() {
        logger.info("Legacy cleanup endpoint called");
        
        try {
            Map<String, Object> result = maintenanceService.cleanup();
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Cleanup error", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Legacy list-parsed endpoint
     * GET /list-parsed
     */
    @GetMapping("/list-parsed")
    public ResponseEntity<Map<String, Object>> listParsed() {
        logger.debug("Legacy list-parsed endpoint called");
        
        try {
            List<String> parsedSlugs = maintenanceService.listParsedMangas();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", parsedSlugs.size());
            response.put("mangas", parsedSlugs);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("List parsed error", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    
    /**
     * Root health check (legacy)
     * GET /
     */
    @GetMapping("/")
    public ResponseEntity<Map<String, String>> root() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "running");
        response.put("service", "ParserService");
        response.put("version", "1.0.0");
        return ResponseEntity.ok(response);
    }
}
