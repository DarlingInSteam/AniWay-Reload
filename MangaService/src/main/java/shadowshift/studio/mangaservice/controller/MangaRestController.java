package shadowshift.studio.mangaservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import shadowshift.studio.mangaservice.dto.ChapterDTO;
import shadowshift.studio.mangaservice.dto.ChapterImageDTO;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.service.MangaService;
import shadowshift.studio.mangaservice.service.external.ChapterServiceClient;

import java.util.ArrayList;
import java.util.List;

/**
 * REST-контроллер для управления мангой через API.
 *
 * Предостав��яет полный набор RESTful эндпоинтов для выполнения операций
 * создания, чтения, обновления и удаления (CRUD) над сущностями манги.
 * Контроллер сосредоточен исключительно на обработке HTTP-запросов и
 * делегирует бизнес-логику соответствующим сервисным слоям.
 *
 * Поддерживаемые операции:
 * - GET /api/manga - получение списка всех манг
 * - GET /api/manga/{id} - получение конкретной манги
 * - POST /api/manga - создание новой манги
 * - PUT /api/manga/{id} - обновление существующе�� манги
 * - DELETE /api/manga/{id} - удаление манги
 * - PUT /api/manga/{id}/cover - обновление обложки манги
 * - GET /api/manga/{id}/chapters - получение глав конкретной манги
 *
 * @author AniWay Development Team
 * @version 2.0.0
 * @since 1.0.0
 */
@RestController
@RequestMapping("/api/manga")
@CrossOrigin(origins = "*")
public class MangaRestController {

    private static final Logger logger = LoggerFactory.getLogger(MangaRestController.class);

    private final MangaService mangaService;
    private final ChapterServiceClient chapterServiceClient;

    /**
     * Конструктор контроллера с внедрением зависимостей.
     *
     * @param mangaService сервис для работы с мангой
     * @param chapterServiceClient клиент для работы с сервисом глав
     */
    @Autowired
    public MangaRestController(MangaService mangaService, ChapterServiceClient chapterServiceClient) {
        this.mangaService = mangaService;
        this.chapterServiceClient = chapterServiceClient;
        logger.info("Инициализирован MangaRestController");
    }

    /**
     * Получает список всех манг в системе.
     *
     * Возвращает отсортированный список всех доступных манг
     * с актуальной информацией о количестве глав.
     *
     * @return ResponseEntity со списком манг и HTTP статусом 200
     */
    @GetMapping
    public ResponseEntity<List<MangaResponseDTO>> getAllManga() {
        logger.debug("API запрос: получение списка всех манг");

        List<MangaResponseDTO> mangaList = mangaService.getAllManga();

        logger.debug("API ответ: возвращается {} манг", mangaList.size());
        return ResponseEntity.ok(mangaList);
    }

    /**
     * Получает информацию о конкретной манге по её идентификатору.
     *
     * @param id идентификатор манги
     * @return ResponseEntity с данными манги (200) или 404 если не найдена
     */
    @GetMapping("/{id}")
    public ResponseEntity<MangaResponseDTO> getMangaById(@PathVariable Long id) {
        logger.debug("API запрос: получение манги с ID {}", id);

        return mangaService.getMangaById(id)
                .map(manga -> {
                    logger.debug("API ответ: манга '{}' найдена", manga.getTitle());
                    return ResponseEntity.ok(manga);
                })
                .orElseGet(() -> {
                    logger.debug("API ответ: манга с ID {} ��е найдена", id);
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * Создает новую мангу в системе.
     *
     * @param createDTO вал��дированные данные для создания манги
     * @return ResponseEntity с созданной мангой и HTTP статусом 201
     */
    @PostMapping
    public ResponseEntity<MangaResponseDTO> createManga(@Valid @RequestBody MangaCreateDTO createDTO) {
        logger.info("API запрос: создание новой манги '{}'", createDTO.getTitle());

        MangaResponseDTO createdManga = mangaService.createManga(createDTO);

        logger.info("API ответ: манга '{}' создана с ID {}",
                   createdManga.getTitle(), createdManga.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdManga);
    }

    /**
     * Обновляет существующую мангу.
     *
     * @param id идентификатор обновляемой манги
     * @param updateDTO валидированные данные для обновления
     * @return ResponseEntity с обновленной мангой (200) или 404 если не найдена
     */
    @PutMapping("/{id}")
    public ResponseEntity<MangaResponseDTO> updateManga(
            @PathVariable Long id,
            @Valid @RequestBody MangaCreateDTO updateDTO) {

        logger.info("API запрос: обновление манги с ID {}", id);

        return mangaService.updateManga(id, updateDTO)
                .map(updatedManga -> {
                    logger.info("API ответ: манга '{}' обновлена", updatedManga.getTitle());
                    return ResponseEntity.ok(updatedManga);
                })
                .orElseGet(() -> {
                    logger.debug("API ответ: манга с ID {} не найдена для обновления", id);
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * Удаляет мангу из системы.
     *
     * @param id ����дентификатор удаляем��й манги
     * @return ResponseEntity с HTTP статусом 204 (No Content)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteManga(@PathVariable Long id) {
        logger.info("API запрос: удаление манги с ID {}", id);

        mangaService.deleteManga(id);

        logger.info("API ответ: манга с ID {} удалена", id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Обновляет URL изображения обложки манги.
     *
     * @param id идентификатор манги
     * @param imageUrl новый URL изображения обложки
     * @return ResponseEntity с HTTP статусом 200
     */
    @PutMapping("/{id}/cover")
    public ResponseEntity<Void> updateCoverImage(
            @PathVariable Long id,
            @RequestBody String imageUrl) {

        logger.info("API ��апрос: обновление обложки манги с ID {}", id);

        mangaService.updateCoverImage(id, imageUrl);

        logger.info("API ответ: ��бложка манги с ID {} обно��лена", id);
        return ResponseEntity.ok().build();
    }

    /**
     * Получает список глав для конкретной манги.
     *
     * Делегирует запрос в ChapterService через клиент,
     * обеспечивая ра����еление ответственности между микросервисами.
     *
     * @param id идентификатор манги
     * @return ResponseEntity со списком глав манги
     */
    @GetMapping("/{id}/chapters")
    public ResponseEntity<List<ChapterDTO>> getMangaChapters(@PathVariable Long id) {
        logger.debug("API запрос: получение глав для манги с ID {}", id);

        List<ChapterDTO> chapters = chapterServiceClient.getChaptersByMangaId(id);

        logger.debug("API ответ: найдено {} глав для манги {}", chapters.size(), id);
        return ResponseEntity.ok(chapters);
    }
}

// Временное решение: возвращаем ImageProxy функциональность в MangaRestController
@RestController
@CrossOrigin(origins = "*")
class ImageProxyControllerTemp {

    private static final Logger logger = LoggerFactory.getLogger(ImageProxyControllerTemp.class);

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    @GetMapping("/api/images/chapter/{chapterId}")
    public ResponseEntity<List<ChapterImageDTO>> getChapterImages(@PathVariable Long chapterId) {
        logger.debug("API запрос: получение изображений для главы с ID {}", chapterId);

        try {
            WebClient webClient = webClientBuilder.build();
            List<ChapterImageDTO> images = webClient.get()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId)
                    .retrieve()
                    .bodyToFlux(ChapterImageDTO.class)
                    .collectList()
                    .block();

            List<ChapterImageDTO> result = images != null ? images : new ArrayList<>();
            logger.debug("API ответ: найдено {} изображений для главы {}", result.size(), chapterId);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            logger.error("Ошибка при получении изображений для главы {}: {}", chapterId, e.getMessage(), e);
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/api/images/proxy/**")
    public ResponseEntity<byte[]> proxyImage(HttpServletRequest request) {
        try {
            String imageKey = request.getRequestURI().substring("/api/images/proxy/".length());
            logger.debug("API запрос: прокси изображения с ключом '{}'", imageKey);

            WebClient webClient = webClientBuilder.build();
            byte[] imageBytes = webClient.get()
                    .uri(imageStorageServiceUrl + "/api/images/proxy/" + imageKey)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();

            if (imageBytes != null) {
                return ResponseEntity.ok()
                        .header("Content-Type", "image/jpeg")
                        .header("Cache-Control", "public, max-age=3600")
                        .body(imageBytes);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Ошибка при получении изображения: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }
}
