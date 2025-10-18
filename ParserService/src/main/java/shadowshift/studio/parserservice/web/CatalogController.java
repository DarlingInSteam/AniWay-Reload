package shadowshift.studio.parserservice.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.parserservice.dto.CatalogResult;
import shadowshift.studio.parserservice.dto.CatalogItem;
import shadowshift.studio.parserservice.service.MangaLibParserService;

import java.util.concurrent.CompletableFuture;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Legacy catalog endpoint for MangaService compatibility
 */
@RestController
@RequestMapping("/catalog")
public class CatalogController {
    
    private static final Logger logger = LoggerFactory.getLogger(CatalogController.class);
    
    @Autowired
    private MangaLibParserService parserService;
    
    /**
     * Get MangaLib catalog page (legacy endpoint for MangaService)
     * GET /catalog/{page}?parser=mangalib&limit=60
     */
    @GetMapping("/{page}")
    public ResponseEntity<Map<String, Object>> getCatalog(
            @PathVariable int page,
            @RequestParam(required = false, defaultValue = "mangalib") String parser,
            @RequestParam(required = false, defaultValue = "60") int limit) {
        
        try {
            logger.info("Catalog request: page={}, parser={}, limit={}", page, parser, limit);
            
            // Fetch catalog from MangaLib
            CompletableFuture<CatalogResult> future = parserService.fetchCatalog(page, 0, Integer.MAX_VALUE);
            CatalogResult result = future.join();
            
            // Check if result is valid
            if (result == null) {
                logger.warn("Catalog fetch returned null for page {}", page);
                return ResponseEntity.ok(createErrorResponse("Catalog fetch returned null"));
            } else if (result.getItems() == null) {
                logger.warn("Catalog items are null for page {}", page);
                return ResponseEntity.ok(createSuccessResponse(page, List.of()));
            }
            
            // Extract slugUrls from items (format: "id--slug")
            List<String> slugs = result.getItems().stream()
                    .limit(limit)
                    .map(CatalogItem::getSlugUrl)  // Используем slugUrl вместо slug
                    .collect(Collectors.toList());
            
            logger.info("Catalog page {} returned {} items", page, slugs.size());
            return ResponseEntity.ok(createSuccessResponse(page, slugs));
            
        } catch (Exception e) {
            logger.error("Error fetching catalog page {}: {}", page, e.getMessage(), e);
            return ResponseEntity.ok(createErrorResponse(e.getMessage()));
        }
    }
    
    /**
     * Create success response in MangaService-compatible format
     */
    private Map<String, Object> createSuccessResponse(int page, List<String> slugs) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("page", page);
        response.put("count", slugs.size());
        response.put("slugs", slugs);
        return response;
    }
    
    /**
     * Create error response in MangaService-compatible format
     */
    private Map<String, Object> createErrorResponse(String errorMessage) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", errorMessage != null ? errorMessage : "Unknown error");
        return response;
    }
}
