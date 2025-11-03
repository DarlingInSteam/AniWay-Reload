package shadowshift.studio.mangaservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.multipart.MultipartFile;
import shadowshift.studio.mangaservice.dto.ChapterDTO;
import shadowshift.studio.mangaservice.dto.ChapterImageDTO;
import shadowshift.studio.mangaservice.dto.MangaCharacterDTO;
import shadowshift.studio.mangaservice.dto.MangaCharacterModerationDTO;
import shadowshift.studio.mangaservice.dto.MangaCharacterRequestDTO;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.dto.PageResponseDTO;
import shadowshift.studio.mangaservice.service.MangaService;
import shadowshift.studio.mangaservice.service.MangaCharacterService;
import shadowshift.studio.mangaservice.service.external.ChapterServiceClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST-контроллер для управления мангой через API.
 *
 * Предоставляет полный набор RESTful эндпоинтов для выполнения операций
 * создания, чтения, обновления и удаления (CRUD) над сущностями манги.
 * Контроллер сосредоточен исключительно на обработке HTTP-запросов и
 * делегирует бизнес-логику соответствующим сервисным слоям.
 *
 * Поддерживаемые операции:
 * - GET /api/manga - получение списка всех манг
 * - GET /api/manga/{id} - получение конкретной манги
 * - POST /api/manga - создание новой манги
 * - PUT /api/manga/{id} - обновление существующей манги
 * - DELETE /api/manga/{id} - удаление манги
 * - PUT /api/manga/{id}/cover - обновление обложки манги
 * - GET /api/manga/{id}/chapters - получение глав конкретной манги
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/manga")
@CrossOrigin(origins = "*")
public class MangaRestController {

    private static final Logger logger = LoggerFactory.getLogger(MangaRestController.class);

    private final MangaService mangaService;
    private final MangaCharacterService mangaCharacterService;
    private final ChapterServiceClient chapterServiceClient;

    /**
     * Конструктор контроллера с внедрением зависимостей.
     *
     * @param mangaService сервис для работы с мангой
     * @param chapterServiceClient клиент для работы с сервисом глав
     */
    public MangaRestController(MangaService mangaService,
                               MangaCharacterService mangaCharacterService,
                               ChapterServiceClient chapterServiceClient) {
        this.mangaService = mangaService;
        this.mangaCharacterService = mangaCharacterService;
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
     * Поиск манги по различным критериям.
     *
     * Позволяет искать мангу по названию, автору, жанру и статусу.
     * Все параметры поиска являются опциональными и могут комбинироваться.
     *
     * @param title название манги (частичное совпадение, игнорируя регистр)
     * @param author автор манги (частичное совпадение, игнорируя регистр)
     * @param genre жанр манги (частичное совпадение, игнорируя регистр)
     * @param status статус манги (точное совпадение)
     * @return ResponseEntity со списком найденных манг и HTTP статусом 200
     */
    @GetMapping("/search")
    public ResponseEntity<List<MangaResponseDTO>> searchManga(
            @RequestParam(required = false) String title,
            @RequestParam(required = false, name = "query") String queryAlias,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String status) {

        if ((title == null || title.isBlank()) && queryAlias != null && !queryAlias.isBlank()) {
            title = queryAlias;
        }

        logger.debug("API запрос: поиск манги (simple) - title: '{}', author: '{}', genre: '{}', status: '{}' (alias query='{}')",
                title, author, genre, status, queryAlias);

        List<MangaResponseDTO> searchResults = mangaService.searchManga(title, author, genre, status);

        logger.debug("API ответ: найдено {} манг по поисковому запросу (simple)", searchResults.size());
        return ResponseEntity.ok(searchResults);
    }

    /**
     * Получает пагинированный список всех манг в системе с возможностью фильтрации.
     *
     * @param page номер страницы (начиная с 0, по умолчанию 0)
     * @param size размер страницы (по умолчанию 10)
     * @param sortBy поле для сортировки (по умолчанию 'createdAt')
     * @param sortOrder направление сортировки ('asc' или 'desc', по умолчанию 'desc')
     * @param genres список жанров (может быть пустой)
     * @param tags список тегов (может быть пустой)
     * @param mangaType тип манги (может быть null)
     * @param status статус манги (может быть null)
     * @param ageRatingMin минимальный возрастной рейтинг (может быть null)
     * @param ageRatingMax максимальный возрастной рейтинг (может быть null)
     * @param ratingMin минимальный рейтинг (может быть null)
     * @param ratingMax максимальный рейтинг (может быть null)
     * @param releaseYearMin минимальный год выпуска (может быть null)
     * @param releaseYearMax максимальный год выпуска (может быть null)
     * @param chapterRangeMin минимальное количество глав (может быть null)
     * @param chapterRangeMax максимальное количество глав (может быть null)
     * @return ResponseEntity с пагинированными данными манг и HTTP статусом 200
     */
    @GetMapping("/paged")
    public ResponseEntity<PageResponseDTO<MangaResponseDTO>> getAllMangaPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            @RequestParam(required = false) List<String> genres,
            @RequestParam(required = false) List<String> tags,
            @RequestParam(required = false) String mangaType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer ageRatingMin,
            @RequestParam(required = false) Integer ageRatingMax,
            @RequestParam(required = false) Double ratingMin,
            @RequestParam(required = false) Double ratingMax,
            @RequestParam(required = false) Integer releaseYearMin,
            @RequestParam(required = false) Integer releaseYearMax,
        @RequestParam(required = false) Integer chapterRangeMin,
        @RequestParam(required = false) Integer chapterRangeMax,
        @RequestParam(required = false, name = "strictMatch") Boolean strictMatch) {

        logger.debug("API запрос: пагинированный список всех манг - page: {}, size: {}, sortBy: {}, sortOrder: {}, " +
                "genres: {}, tags: {}, mangaType: {}, status: {}, ageRatingMin: {}, ageRatingMax: {}, " +
                "ratingMin: {}, ratingMax: {}, releaseYearMin: {}, releaseYearMax: {}, chapterRangeMin: {}, chapterRangeMax: {}",
                page, size, sortBy, sortOrder, genres, tags, mangaType, status, 
                ageRatingMin, ageRatingMax, ratingMin, ratingMax, 
                releaseYearMin, releaseYearMax, chapterRangeMin, chapterRangeMax);

    PageResponseDTO<MangaResponseDTO> result = mangaService.getAllMangaPagedWithFilters(
        page, size, sortBy, sortOrder, genres, tags, mangaType, status,
        ageRatingMin, ageRatingMax, ratingMin, ratingMax,
        releaseYearMin, releaseYearMax, chapterRangeMin, chapterRangeMax,
        strictMatch);

        logger.debug("API ответ: возвращается пагинированный список из {} манг на странице {} из {}",
                result.getContent().size(), result.getPage(), result.getTotalPages());
        return ResponseEntity.ok(result);
    }

    /**
     * Поиск манги по различным критериям с пагинацией.
     *
     * @param title название манги (частичное совпадение, игнорируя регистр)
     * @param author автор манги (частичное совпадение, игнорируя регистр)
     * @param genre жанр манги (частичное совпадение, игнорируя регистр)
     * @param status статус манги (точное совпадение)
     * @param page номер страницы (начиная с 0, по умолчанию 0)
     * @param size размер страницы (по умолчанию 10)
     * @param sortBy поле для сортировки (по умолчанию 'createdAt')
     * @param sortOrder направление сортировки ('asc' или 'desc', по умолчанию 'desc')
     * @return ResponseEntity с пагинированными данными найденных манг и HTTP статусом 200
     */
    @GetMapping("/search/paged")
    public ResponseEntity<PageResponseDTO<MangaResponseDTO>> searchMangaPaged(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, name = "query") String queryAlias,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false, name = "limit") Integer limitAlias,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder) {

        // Поддержка alias параметров от фронтенда: query -> title, limit -> size
        if ((title == null || title.isBlank()) && queryAlias != null && !queryAlias.isBlank()) {
            title = queryAlias;
        }
        if ((size == null || size <= 0) && limitAlias != null && limitAlias > 0) {
            size = limitAlias;
        }
        if (size == null || size <= 0) size = 10; // гарантируем значение

        logger.debug("API запрос: пагинированный поиск манги - title: '{}', author: '{}', genre: '{}', status: '{}', page: {}, size: {}, sortBy: {}, sortOrder: {} (alias query='{}', limit='{}')",
                title, author, genre, status, page, size, sortBy, sortOrder, queryAlias, limitAlias);

        PageResponseDTO<MangaResponseDTO> result = mangaService.searchMangaPaged(title, author, genre, status, page, size, sortBy, sortOrder);

        logger.debug("API ответ: найдено {} манг по поисковому запросу на странице {} из {}",
                result.getContent().size(), result.getPage(), result.getTotalPages());
        return ResponseEntity.ok(result);
    }

    /**
     * Получает информацию о конкретной манге по её идентификатору.
     *
     * @param id идентификатор манги
     * @param userId идентификатор пользователя (опционально, для инкремента просмотров)
     * @return ResponseEntity с данными манги (200) или 404 если не найдена
     */
    @GetMapping("/{id}")
    public ResponseEntity<MangaResponseDTO> getMangaById(@PathVariable Long id, @RequestParam(required = false) Long userId) {
        logger.info("REST Controller: Получен запрос на мангу ID={}, userId={}", id, userId);

        return mangaService.getMangaById(id, userId)
                .map(manga -> {
                    logger.info("REST Controller: Возвращаем мангу '{}' с просмотрами: {}", manga.getTitle(), manga.getViews());
                    return ResponseEntity.ok(manga);
                })
                .orElseGet(() -> {
                    logger.info("REST Controller: Манга с ID {} не найдена", id);
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * Возвращает список персонажей для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @param userHeader заголовок с идентификатором пользователя (опционально)
     * @param roleHeader заголовок с ролью пользователя (опционально)
     * @return ResponseEntity со списком персонажей
     */
    @GetMapping("/{id}/characters")
    public ResponseEntity<List<MangaCharacterDTO>> getMangaCharacters(
            @PathVariable("id") Long mangaId,
            @RequestHeader(value = "X-User-Id", required = false) String userHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {

        Long requesterId = parseUserIdAllowNull(userHeader);
        boolean includeAll = hasModerationRights(roleHeader);

        logger.debug("API запрос: получение персонажей для манги {} (requester={}, includeAll={})",
                mangaId, requesterId, includeAll);

        List<MangaCharacterDTO> characters = mangaCharacterService.getCharacters(mangaId, requesterId, includeAll);

        logger.debug("API ответ: найдено {} персонажей для манги {}", characters.size(), mangaId);
        return ResponseEntity.ok(characters);
    }

    /**
     * Создает нового персонажа в рамках указанной манги.
     *
     * @param mangaId идентификатор манги
     * @param roleHeader заголовок с ролью пользователя (опционально)
     * @param requestPayload данные персонажа для создания
     * @return ResponseEntity с созданным персонажем
     */
    @PostMapping(value = "/{id}/characters", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MangaCharacterDTO> createCharacter(
            @PathVariable("id") Long mangaId,
            @RequestHeader("X-User-Id") String userHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestPart("payload") @Valid MangaCharacterRequestDTO requestPayload,
            @RequestPart(value = "image", required = false) MultipartFile imageFile) {

        Long creatorId = parseUserId(userHeader);
        logger.info("API запрос: создание персонажа для манги {} пользователем {}", mangaId, creatorId);

        MangaCharacterDTO created = mangaCharacterService.createCharacter(mangaId, requestPayload, creatorId, roleHeader, imageFile);

        logger.info("API ответ: персонаж {} создан для манги {}", created.getId(), mangaId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Обновляет данные персонажа.
     *
     * @param characterId идентификатор персонажа
     * @param roleHeader заголовок с ролью пользователя (опционально)
     * @param requestPayload новые данные персонажа
     * @return ResponseEntity с обновленным персонажем
     */
    @PutMapping(value = "/characters/{characterId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MangaCharacterDTO> updateCharacter(
            @PathVariable Long characterId,
            @RequestHeader("X-User-Id") String userHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestPart("payload") @Valid MangaCharacterRequestDTO requestPayload,
            @RequestPart(value = "image", required = false) MultipartFile imageFile) {

        Long requesterId = parseUserId(userHeader);
        logger.info("API запрос: обновление персонажа {} пользователем {}", characterId, requesterId);

        MangaCharacterDTO updated = mangaCharacterService.updateCharacter(characterId, requestPayload, requesterId, roleHeader, imageFile);
        return ResponseEntity.ok(updated);
    }

    /**
     * Модерирует предложенного персонажа.
     *
     * @param characterId идентификатор персонажа
     * @param roleHeader заголовок с ролью пользователя
     * @param requestPayload данные модерации
     * @return ResponseEntity с обновленным персонажем
     */
    @PostMapping("/characters/{characterId}/moderate")
    public ResponseEntity<MangaCharacterDTO> moderateCharacter(
            @PathVariable Long characterId,
            @RequestHeader("X-User-Id") String userHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @Valid @RequestBody MangaCharacterModerationDTO requestPayload) {

        Long moderatorId = parseUserId(userHeader);
        logger.info("API запрос: модерация персонажа {} модератором {}", characterId, moderatorId);

        MangaCharacterDTO moderated = mangaCharacterService.moderateCharacter(characterId, requestPayload, moderatorId, roleHeader);
        return ResponseEntity.ok(moderated);
    }

    /**
     * Удаляет персонажа.
     *
     * @param characterId идентификатор персонажа
     * @param roleHeader заголовок с ролью пользователя (опционально)
     * @return ResponseEntity без содержимого
     */
    @DeleteMapping("/characters/{characterId}")
    public ResponseEntity<Void> deleteCharacter(
            @PathVariable Long characterId,
            @RequestHeader("X-User-Id") String userHeader,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {

        Long requesterId = parseUserId(userHeader);
        logger.info("API запрос: удаление персонажа {} пользователем {}", characterId, requesterId);

        mangaCharacterService.deleteCharacter(characterId, requesterId, roleHeader);
        return ResponseEntity.noContent().build();
    }

    /**
     * Создает новую мангу в системе.
     *
     * @param createDTO валидированные данные для создания манги
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
     * @param id идентификатор удаляемой манги
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
     * Batch удаление нескольких манг по ID
     * DELETE /api/manga/batch
     * 
     * @param request объект с массивом ID манг для удаления
     * @return ResponseEntity с результатом batch операции
     */
    @DeleteMapping("/batch")
    public ResponseEntity<Map<String, Object>> batchDeleteManga(@RequestBody Map<String, Object> request) {
        Object idsObj = request.get("ids");
        
        if (idsObj == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "No IDs provided");
            return ResponseEntity.badRequest().body(error);
        }
        
        // Приводим к списку Long, учитывая что могут прийти Integer из JSON
        List<Long> ids = new ArrayList<>();
        if (idsObj instanceof List<?>) {
            for (Object item : (List<?>) idsObj) {
                if (item instanceof Number) {
                    ids.add(((Number) item).longValue());
                }
            }
        }
        
        if (ids.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "No valid IDs provided");
            return ResponseEntity.badRequest().body(error);
        }
        
        logger.info("API запрос: batch удаление {} манг", ids.size());
        
        Map<String, Object> result = mangaService.batchDeleteMangas(ids);
        
        logger.info("API ответ: batch удаление завершено - {} успешно, {} ошибок", 
            result.get("succeeded_count"), result.get("failed_count"));
        
        return ResponseEntity.ok(result);
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

        logger.info("API запрос: обновление обложки манги с ID {}", id);

        mangaService.updateCoverImage(id, imageUrl);

        logger.info("API ответ: обложка манги с ID {} обновлена", id);
        return ResponseEntity.ok().build();
    }

    /**
     * Получает список глав для конкретной манги.
     *
     * Делегирует запрос в ChapterService через клиент,
     * обеспечивая разделение ответственности между микросервисами.
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

    /**
     * Синхронизирует отсутствующие MangaLib ID для уже существующих манг.
     *
     * @param maxPages ограничение числа страниц каталога
     * @param pageSize размер страницы каталога
     * @return ResponseEntity с картой обновленных манг (id -> MangaLib ID)
     */
    @PostMapping("/maintenance/melon-slug-ids/backfill")
    public ResponseEntity<Map<Long, Integer>> backfillMelonSlugIds(
            @RequestParam(required = false) Integer maxPages,
            @RequestParam(required = false) Integer pageSize,
            @RequestParam(required = false) Integer startPage) {

        logger.info("API запрос: синхронизация отсутствующих MangaLib ID (maxPages={}, pageSize={}, startPage={})",
                maxPages, pageSize, startPage);

        Map<Long, Integer> updated = mangaService.backfillMissingMelonSlugIds(maxPages, pageSize, startPage);

        logger.info("API ответ: синхронизация MangaLib ID завершена. Обновлено {} записей.", updated.size());
        return ResponseEntity.ok(updated);
    }

    private Long parseUserId(String header) {
        Long id = parseUserIdAllowNull(header);
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Требуется авторизация");
        }
        return id;
    }

    private Long parseUserIdAllowNull(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(header.trim());
        } catch (NumberFormatException ex) {
            logger.warn("Невалидный заголовок X-User-Id: '{}'", header);
            return null;
        }
    }

    private boolean hasModerationRights(String roleHeader) {
        if (roleHeader == null || roleHeader.isBlank()) {
            return false;
        }
        String normalized = roleHeader.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        return "ADMIN".equals(normalized) || "MODERATOR".equals(normalized);
    }
}

/**
 * Временный контроллер для проксирования изображений.
 *
 * Обеспечивает доступ к изображениям через MangaService,
 * перенаправляя запросы в ImageStorageService.
 * Используется как промежуточное решение до полной интеграции.
 *
 * @author ShadowShiftStudio
 */
@RestController
@CrossOrigin(origins = "*")
class ImageProxyControllerTemp {

    private static final Logger logger = LoggerFactory.getLogger(ImageProxyControllerTemp.class);

    private WebClient.Builder webClientBuilder;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    /**
     * Получает список изображений для указанной главы.
     *
     * @param chapterId идентификатор главы
     * @return ResponseEntity со списком изображений главы
     */
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

    /**
     * Проксирует запросы к изображениям через ImageStorageService.
     *
     * @param request HTTP запрос с путем к изображению
     * @return ResponseEntity с байтами изображения или 404 если не найдено
     */
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
