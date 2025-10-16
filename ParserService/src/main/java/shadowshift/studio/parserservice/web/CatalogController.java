package shadowshift.studio.parserservice.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.parserservice.dto.CatalogResult;
import shadowshift.studio.parserservice.service.MangaLibParserService;

import java.util.concurrent.CompletableFuture;

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
    public ResponseEntity<CatalogResult> getCatalog(
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
                result = createEmptyCatalog(page);
            } else if (result.getItems() == null) {
                logger.warn("Catalog items are null for page {}", page);
                result.setItems(java.util.Collections.emptyList());
            } else if (result.getItems().size() > limit) {
                // Limit results if needed
                result.setItems(result.getItems().subList(0, limit));
            }
            
            logger.info("Catalog page {} returned {} items", page, 
                result.getItems() != null ? result.getItems().size() : 0);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Error fetching catalog page {}: {}", page, e.getMessage(), e);
            return ResponseEntity.ok(createEmptyCatalog(page));
        }
    }
    
    private CatalogResult createEmptyCatalog(int page) {
        CatalogResult emptyResult = new CatalogResult();
        emptyResult.setPage(page);
        emptyResult.setTotal(0);
        emptyResult.setItems(java.util.Collections.emptyList());
        return emptyResult;
    }
}
