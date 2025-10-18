package shadowshift.studio.parserservice.web;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.parserservice.config.ParserProperties;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Controller for serving chapter images to MangaService
 */
@RestController
@RequestMapping("/chapter-images")
public class ChapterImagesController {
    
    private static final Logger logger = LoggerFactory.getLogger(ChapterImagesController.class);
    
    @Autowired
    private ParserProperties properties;
    
    /**
     * Get all images for a specific chapter in batch
     * GET /chapter-images/{slug}/{chapterFolder}
     * 
     * Response format:
     * {
     *   "images": [
     *     {
     *       "filename": "001.jpg",
     *       "data": "base64_encoded_image_data",
     *       "contentType": "image/jpeg",
     *       "pageNumber": 1
     *     },
     *     ...
     *   ],
     *   "totalPages": 10
     * }
     */
    @GetMapping("/{slug}/{chapterFolder}")
    public ResponseEntity<Map<String, Object>> getChapterImages(
            @PathVariable String slug,
            @PathVariable String chapterFolder) {
        
        try {
            logger.info("Chapter images request: slug={}, chapterFolder={}", slug, chapterFolder);
            
            // Декодируем chapterFolder (может содержать URL-encoded символы вроде %20)
            String decodedChapterFolder = java.net.URLDecoder.decode(chapterFolder, "UTF-8");
            
            Path archivesDir = Paths.get(properties.getOutputPath(), "archives", slug, decodedChapterFolder);
            
            logger.debug("Ищем изображения в директории: {}", archivesDir);
            
            if (!Files.exists(archivesDir) || !Files.isDirectory(archivesDir)) {
                logger.warn("Директория с главой не найдена: {}", archivesDir);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Chapter folder not found: " + decodedChapterFolder));
            }
            
            // Получаем все файлы изображений из директории
            List<ImageData> images = new ArrayList<>();
            
            try (Stream<Path> files = Files.list(archivesDir)) {
                List<Path> imageFiles = files
                    .filter(Files::isRegularFile)
                    .filter(f -> isImageFile(f.getFileName().toString()))
                    .sorted(Comparator.comparing(p -> p.getFileName().toString()))
                    .collect(Collectors.toList());
                
                logger.debug("Найдено {} изображений в {}", imageFiles.size(), decodedChapterFolder);
                
                int pageNumber = 1;
                for (Path imageFile : imageFiles) {
                    byte[] imageBytes = Files.readAllBytes(imageFile);
                    String base64Data = Base64.getEncoder().encodeToString(imageBytes);
                    String contentType = getContentType(imageFile.getFileName().toString());
                    String filename = imageFile.getFileName().toString();
                    
                    images.add(new ImageData(filename, base64Data, contentType, pageNumber));
                    pageNumber++;
                    
                    logger.debug("Загружено изображение: {} ({} bytes, page {})", 
                        filename, imageBytes.length, pageNumber - 1);
                }
            }
            
            if (images.isEmpty()) {
                logger.warn("Нет изображений в директории: {}", archivesDir);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No images found in chapter folder"));
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("images", images);
            response.put("totalPages", images.size());
            
            logger.info("✅ Отдано {} изображений для {}/{}", images.size(), slug, decodedChapterFolder);
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            logger.error("Ошибка чтения изображений главы {}/{}: {}", slug, chapterFolder, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to read chapter images: " + e.getMessage()));
        }
    }
    
    /**
     * Check if file is an image
     */
    private boolean isImageFile(String filename) {
        String lower = filename.toLowerCase();
        return lower.endsWith(".jpg") || 
               lower.endsWith(".jpeg") || 
               lower.endsWith(".png") || 
               lower.endsWith(".webp") ||
               lower.endsWith(".gif");
    }
    
    /**
     * Get Content-Type by file extension
     */
    private String getContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "image/jpeg"; // default
    }
    
    /**
     * Image data DTO
     */
    public static class ImageData {
        @JsonProperty("filename")
        private String filename;
        
        @JsonProperty("data")
        private String data; // base64
        
        @JsonProperty("contentType")
        private String contentType;
        
        @JsonProperty("page")
        private int pageNumber;
        
        public ImageData(String filename, String data, String contentType, int pageNumber) {
            this.filename = filename;
            this.data = data;
            this.contentType = contentType;
            this.pageNumber = pageNumber;
        }
        
        public String getFilename() { return filename; }
        public String getData() { return data; }
        public String getContentType() { return contentType; }
        public int getPage() { return pageNumber; }
        public int getPageNumber() { return pageNumber; }
    }
}
