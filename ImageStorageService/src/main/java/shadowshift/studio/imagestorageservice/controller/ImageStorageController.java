package shadowshift.studio.imagestorageservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import shadowshift.studio.imagestorageservice.dto.ChapterImageResponseDTO;
import shadowshift.studio.imagestorageservice.service.ImageStorageService;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "*")
public class ImageStorageController {

    @Autowired
    private ImageStorageService imageStorageService;

    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<List<ChapterImageResponseDTO>> getImagesByChapterId(@PathVariable Long chapterId) {
        List<ChapterImageResponseDTO> images = imageStorageService.getImagesByChapterId(chapterId);
        return ResponseEntity.ok(images);
    }

    @GetMapping("/chapter/{chapterId}/page/{pageNumber}")
    public ResponseEntity<ChapterImageResponseDTO> getImageByChapterAndPage(
            @PathVariable Long chapterId,
            @PathVariable Integer pageNumber) {
        return imageStorageService.getImageByChapterAndPage(chapterId, pageNumber)
                .map(image -> ResponseEntity.ok(image))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/chapter/{chapterId}/count")
    public ResponseEntity<Integer> getPageCountByChapterId(@PathVariable Long chapterId) {
        Integer count = imageStorageService.getPageCountByChapterId(chapterId);
        return ResponseEntity.ok(count);
    }

    @PostMapping("/chapter/{chapterId}/page/{pageNumber}")
    public ResponseEntity<?> uploadSingleImage(
            @PathVariable Long chapterId,
            @PathVariable Integer pageNumber,
            @RequestParam("file") MultipartFile file) {
        try {
            ChapterImageResponseDTO uploadedImage = imageStorageService.uploadImage(chapterId, pageNumber, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploadedImage);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @PostMapping("/chapter/{chapterId}/multiple")
    public ResponseEntity<?> uploadMultipleImages(
            @PathVariable Long chapterId,
            @RequestParam("files") List<MultipartFile> files) {
        try {
            List<ChapterImageResponseDTO> uploadedImages = imageStorageService.uploadMultipleImages(chapterId, files);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploadedImages);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @PostMapping("/chapter/{chapterId}/multiple-ordered")
    public ResponseEntity<?> uploadMultipleImagesWithOrder(
            @PathVariable Long chapterId,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam("startPage") Integer startPage) {
        try {
            List<ChapterImageResponseDTO> uploadedImages = imageStorageService.uploadMultipleImagesWithOrder(chapterId, files, startPage);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploadedImages);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @PostMapping("/chapter/{chapterId}/reorder")
    public ResponseEntity<?> reorderPages(
            @PathVariable Long chapterId,
            @RequestBody List<Long> imageIds) {
        try {
            List<ChapterImageResponseDTO> reorderedImages = imageStorageService.reorderPages(chapterId, imageIds);
            return ResponseEntity.ok(reorderedImages);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Reorder failed: " + e.getMessage());
        }
    }

    @GetMapping("/chapter/{chapterId}/preview")
    public ResponseEntity<List<ChapterImageResponseDTO>> getChapterPreview(@PathVariable Long chapterId) {
        List<ChapterImageResponseDTO> images = imageStorageService.getImagesByChapterId(chapterId);
        return ResponseEntity.ok(images);
    }

    // Новый эндпоинт для загрузки изображений по URL из MelonService
    @PostMapping("/upload-from-url")
    public ResponseEntity<?> uploadImageFromUrl(@RequestBody Map<String, Object> request) {
        try {
            Long chapterId = Long.valueOf(request.get("chapterId").toString());
            Integer pageNumber = Integer.valueOf(request.get("pageNumber").toString());
            String imageUrl = request.get("imageUrl").toString();

            ChapterImageResponseDTO uploadedImage = imageStorageService.uploadImageFromUrl(chapterId, pageNumber, imageUrl);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploadedImage);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Invalid chapterId or pageNumber format");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<?> deleteImage(@PathVariable Long imageId) {
        try {
            imageStorageService.deleteImage(imageId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Delete failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/chapter/{chapterId}")
    public ResponseEntity<?> deleteAllChapterImages(@PathVariable Long chapterId) {
        try {
            imageStorageService.deleteAllChapterImages(chapterId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Delete failed: " + e.getMessage());
        }
    }

    @GetMapping("/proxy/**")
    public ResponseEntity<byte[]> proxyImage(HttpServletRequest request) {
        try {
            String imageKey = request.getRequestURI().substring("/api/images/proxy/".length());
            byte[] imageBytes = imageStorageService.getImageBytes(imageKey);
            if (imageBytes != null) {
                return ResponseEntity.ok()
                        .header("Content-Type", "image/jpeg")
                        .header("Cache-Control", "public, max-age=3600")
                        .body(imageBytes);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/import-from-local-file")
    public ResponseEntity<?> importFromLocalFile(@RequestBody Map<String, Object> request) {
        try {
            Long chapterId = Long.parseLong(request.get("chapterId").toString());
            Integer pageNumber = Integer.parseInt(request.get("pageNumber").toString());
            String localImagePath = (String) request.get("localImagePath");

            ChapterImageResponseDTO importedImage = imageStorageService.importFromLocalFile(chapterId, pageNumber, localImagePath);
            return ResponseEntity.status(HttpStatus.CREATED).body(importedImage);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Import failed: " + e.getMessage());
        }
    }
}
