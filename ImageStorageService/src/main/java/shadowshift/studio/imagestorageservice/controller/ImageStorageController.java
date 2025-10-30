package shadowshift.studio.imagestorageservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import shadowshift.studio.imagestorageservice.dto.ChapterImageResponseDTO;
import shadowshift.studio.imagestorageservice.dto.MomentImageUploadResponseDTO;
import shadowshift.studio.imagestorageservice.dto.UserAvatarResponseDTO;
import shadowshift.studio.imagestorageservice.service.ImageStorageService;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST контроллер для управления хранением и получением изображений.
 * Предоставляет API для загрузки, получения, удаления и управления изображениями глав манги,
 * включая обложки и страницы контента.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = "*")
public class ImageStorageController {

    @Autowired
    private ImageStorageService imageStorageService;

    /**
     * Получает список всех изображений для указанной главы.
     *
     * @param chapterId идентификатор главы
     * @return список изображений главы
     */
    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<List<ChapterImageResponseDTO>> getImagesByChapterId(@PathVariable Long chapterId) {
        List<ChapterImageResponseDTO> images = imageStorageService.getImagesByChapterId(chapterId);
        return ResponseEntity.ok(images);
    }

    /**
     * Получает изображение по номеру страницы для указанной главы.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @return изображение страницы или 404 если не найдено
     */
    @GetMapping("/chapter/{chapterId}/page/{pageNumber}")
    public ResponseEntity<ChapterImageResponseDTO> getImageByChapterAndPage(
            @PathVariable Long chapterId,
            @PathVariable Integer pageNumber) {
        return imageStorageService.getImageByChapterAndPage(chapterId, pageNumber)
                .map(image -> ResponseEntity.ok(image))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получает количество страниц в указанной главе.
     *
     * @param chapterId идентификатор главы
     * @return количество страниц
     */
    @GetMapping("/chapter/{chapterId}/count")
    public ResponseEntity<Integer> getPageCountByChapterId(@PathVariable Long chapterId) {
        Integer count = imageStorageService.getPageCountByChapterId(chapterId);
        return ResponseEntity.ok(count);
    }

    /**
     * Загружает одиночное изображение для указанной страницы главы.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @param file файл изображения для загрузки
     * @return загруженное изображение или сообщение об ошибке
     */
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

    /**
     * Загружает несколько изображений для главы с автоматической нумерацией страниц.
     *
     * @param chapterId идентификатор главы
     * @param files список файлов изображений
     * @return список загруженных изображений или сообщение об ошибке
     */
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

    /**
     * Загружает несколько изображений для главы с указанием начального номера страницы.
     *
     * @param chapterId идентификатор главы
     * @param files список файлов изображений
     * @param startPage начальный номер страницы
     * @return список загруженных изображений или сообщение об ошибке
     */
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

    /**
     * Изменяет порядок страниц в главе на основе предоставленного списка идентификаторов изображений.
     *
     * @param chapterId идентификатор главы
     * @param imageIds список идентификаторов изображений в новом порядке
     * @return список изображений с обновленным порядком или сообщение об ошибке
     */
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

    /**
     * Получает превью изображений для указанной главы.
     *
     * @param chapterId идентификатор главы
     * @return список изображений для превью
     */
    @GetMapping("/chapter/{chapterId}/preview")
    public ResponseEntity<List<ChapterImageResponseDTO>> getChapterPreview(@PathVariable Long chapterId) {
        List<ChapterImageResponseDTO> images = imageStorageService.getImagesByChapterId(chapterId);
        return ResponseEntity.ok(images);
    }

    /**
     * Загружает изображение по URL для указанной страницы главы.
     *
     * @param request объект с параметрами: chapterId, pageNumber, imageUrl
     * @return загруженное изображение или сообщение об ошибке
     */
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

    /**
     * Удаляет изображение по его идентификатору.
     *
     * @param imageId идентификатор изображения для удаления
     * @return 204 No Content при успешном удалении или сообщение об ошибке
     */
    @DeleteMapping("/{imageId}")
    public ResponseEntity<?> deleteImage(@PathVariable Long imageId) {
        try {
            imageStorageService.deleteImage(imageId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Delete failed: " + e.getMessage());
        }
    }

    /**
     * Удаляет все изображения для указанной главы.
     *
     * @param chapterId идентификатор главы
     * @return 204 No Content при успешном удалении или сообщение об ошибке
     */
    @DeleteMapping("/chapter/{chapterId}")
    public ResponseEntity<?> deleteAllChapterImages(@PathVariable Long chapterId) {
        try {
            imageStorageService.deleteAllChapterImages(chapterId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Delete failed: " + e.getMessage());
        }
    }

    /**
     * Проксирует изображение по его ключу в хранилище.
     * Предоставляет прямой доступ к изображениям с настройками кэширования.
     *
     * @param request HTTP запрос с путем к изображению
     * @return байты изображения с соответствующими заголовками или 404 если не найдено
     */
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

    /**
     * Импортирует изображение из локального файла системы.
     *
     * @param request объект с параметрами: chapterId, pageNumber, localImagePath
     * @return импортированное изображение или сообщение об ошибке
     */
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

    /**
     * Загружает обложку манги.
     * Использует специальный идентификатор главы (-1) для обложек.
     *
     * @param file файл обложки для загрузки
     * @return загруженная обложка или сообщение об ошибке
     */
    @PostMapping("/cover")
    public ResponseEntity<?> uploadCover(@RequestParam("file") MultipartFile file) {
        try {
            ChapterImageResponseDTO uploadedCover = imageStorageService.uploadImage(-1L, 0, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploadedCover);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    /**
     * Загружает обложку для конкретной манги.
     *
     * @param mangaId идентификатор манги
     * @param file файл обложки для загрузки
     * @return загруженная обложка или сообщение об ошибке
     */
    @PostMapping("/cover/{mangaId}")
    public ResponseEntity<?> uploadCoverForManga(@PathVariable Long mangaId, @RequestParam("file") MultipartFile file) {
        try {
            ChapterImageResponseDTO uploadedCover = imageStorageService.uploadCoverForManga(mangaId, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploadedCover);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Upload failed: " + e.getMessage());
        }
    }

    /**
     * Получает обложку для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @return обложка манги или 404 если не найдена
     */
    @GetMapping("/cover/{mangaId}")
    public ResponseEntity<?> getCoverByMangaId(@PathVariable Long mangaId) {
        try {
            Optional<ChapterImageResponseDTO> cover = imageStorageService.getCoverByMangaId(mangaId);
            if (cover.isPresent()) {
                return ResponseEntity.ok(cover.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error getting cover: " + e.getMessage());
        }
    }

    /**
     * Загружает аватар пользователя.
     *
     * @param userId идентификатор пользователя
     * @param file файл аватара для загрузки
     * @return загруженный аватар или сообщение об ошибке
     */
    @PostMapping("/avatars/{userId}")
    public ResponseEntity<?> uploadAvatar(@PathVariable Long userId, @RequestParam("file") MultipartFile file) {
        try {
            UserAvatarResponseDTO avatar = imageStorageService.uploadUserAvatar(userId, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(avatar);
        } catch (shadowshift.studio.imagestorageservice.exception.AvatarUploadRateLimitException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Получает аватар пользователя по его идентификатору.
     *
     * @param userId идентификатор пользователя
     * @return аватар пользователя или 404 если не найден
     */
    @GetMapping("/avatars/{userId}")
    public ResponseEntity<?> getAvatar(@PathVariable Long userId) {
        return imageStorageService.getUserAvatar(userId)
                .map(a -> ResponseEntity.ok(new UserAvatarResponseDTO(a)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(value = "/moments", consumes = {"multipart/form-data"})
    public ResponseEntity<?> uploadMomentImage(@RequestParam("file") MultipartFile file,
                                               @RequestParam(value = "mangaId", required = false) Long mangaId,
                                               @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        try {
            MomentImageUploadResponseDTO response = imageStorageService.uploadMomentImage(file, mangaId, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    // === Post Images Upload ===
    @PostMapping(value = "/posts", consumes = {"multipart/form-data"})
    public ResponseEntity<?> uploadPostImages(@RequestParam("files") List<MultipartFile> files,
                                              @RequestParam(value = "userId", required = false) Long userId) {
        try {
            var uploaded = imageStorageService.uploadPostImages(files, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(uploaded);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
