package shadowshift.studio.mangaservice.controller;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.service.MangaService;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/manga")
@CrossOrigin(origins = "*")
public class MangaRestController {

    @Autowired
    private MangaService mangaService;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    @GetMapping
    public ResponseEntity<List<MangaResponseDTO>> getAllManga() {
        List<MangaResponseDTO> mangaList = mangaService.getAllManga();
        return ResponseEntity.ok(mangaList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MangaResponseDTO> getMangaById(@PathVariable Long id) {
        return mangaService.getMangaById(id)
                .map(manga -> ResponseEntity.ok(manga))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MangaResponseDTO> createManga(@Valid @RequestBody MangaCreateDTO createDTO) {
        MangaResponseDTO createdManga = mangaService.createManga(createDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdManga);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MangaResponseDTO> updateManga(
            @PathVariable Long id,
            @Valid @RequestBody MangaCreateDTO updateDTO) {
        return mangaService.updateManga(id, updateDTO)
                .map(manga -> ResponseEntity.ok(manga))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteManga(@PathVariable Long id) {
        mangaService.deleteManga(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/cover")
    public ResponseEntity<Void> updateCoverImage(
            @PathVariable Long id,
            @RequestBody String imageUrl) {
        mangaService.updateCoverImage(id, imageUrl);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/chapters")
    public ResponseEntity<List<Object>> getMangaChapters(@PathVariable Long id) {
        try {
            WebClient webClient = webClientBuilder.build();
            List<Object> chapters = webClient.get()
                    .uri(chapterServiceUrl + "/api/chapters/manga/" + id)
                    .retrieve()
                    .bodyToFlux(Object.class)
                    .collectList()
                    .block();

            return ResponseEntity.ok(chapters != null ? chapters : new ArrayList<>());
        } catch (Exception e) {
            System.err.println("Error fetching chapters: " + e.getMessage());
            return ResponseEntity.ok(new ArrayList<>());
        }
    }
}

// Добавляем отдельный контроллер для API изображений
@RestController
@CrossOrigin(origins = "*")
class ImageProxyController {

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    @GetMapping("/api/images/chapter/{chapterId}")
    public ResponseEntity<List<Object>> getChapterImages(@PathVariable Long chapterId) {
        try {
            WebClient webClient = webClientBuilder.build();
            List<Object> images = webClient.get()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId)
                    .retrieve()
                    .bodyToFlux(Object.class)
                    .collectList()
                    .block();

            return ResponseEntity.ok(images != null ? images : new ArrayList<>());
        } catch (Exception e) {
            System.err.println("Error fetching chapter images: " + e.getMessage());
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/api/images/proxy/**")
    public ResponseEntity<byte[]> proxyImage(HttpServletRequest request) {
        try {
            String imageKey = request.getRequestURI().substring("/api/images/proxy/".length());
            // Прокси для изображений из MinIO через ImageStorageService
            WebClient webClient = webClientBuilder.build();
            byte[] imageBytes = webClient.get()
                    .uri(imageStorageServiceUrl + "/api/images/proxy/" + imageKey)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();

            if (imageBytes != null) {
                return ResponseEntity.ok()
                        .header("Content-Type", "image/jpeg")
                        .body(imageBytes);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("Error proxying image: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}
