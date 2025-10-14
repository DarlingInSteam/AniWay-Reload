package shadowshift.studio.chapterservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import shadowshift.studio.chapterservice.dto.ChapterCleanupResultDTO;
import shadowshift.studio.chapterservice.dto.ChapterCreateDTO;
import shadowshift.studio.chapterservice.dto.ChapterResponseDTO;
import shadowshift.studio.chapterservice.entity.Chapter;
import shadowshift.studio.chapterservice.entity.ChapterLike;
import shadowshift.studio.chapterservice.repository.ChapterRepository;
import shadowshift.studio.chapterservice.repository.ChapterLikeRepository;
import shadowshift.studio.chapterservice.repository.ChapterReadRepository;
import shadowshift.studio.chapterservice.entity.ChapterRead;
import java.net.ConnectException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.web.client.RestTemplate;

/**
 * Сервис для управления главами манги.
 * Предоставляет бизнес-логику для операций CRUD с главами, включая интеграцию с сервисом хранения изображений.
 *
 * @author ShadowShiftStudio
 */
@Service
public class ChapterService {

    private static final Logger logger = LoggerFactory.getLogger(ChapterService.class);

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private ChapterLikeRepository chapterLikeRepository;

    @Autowired
    private ChapterReadRepository chapterReadRepository;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate; // optional if AMQP not configured in some environments

    @Value("${xp.events.exchange:xp.events.exchange}")
    private String xpExchange;

    @Value("${xp.events.chapterRoutingKey:xp.events.chapter}")
    private String chapterRoutingKey;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    @Value("${image.storage.service.internal-url:http://image-storage-service:8086}")
    private String imageStorageServiceInternalUrl;

    private final Set<String> reportedImageServiceConnectionIssues = ConcurrentHashMap.newKeySet();

    @Value("${notification.service.base-url:http://notification-service:8095}")
    private String notificationServiceBaseUrl;

    @Value("${auth.service.internal-url:http://auth-service:8085}")
    private String authServiceInternalUrl;

    @Value("${manga.service.internal-url:http://manga-service:8081}")
    private String mangaServiceInternalUrl;

    /**
     * Получить все главы для указанной манги.
     * Автоматически синхронизирует количество страниц с сервисом хранения изображений.
     *
     * @param mangaId идентификатор манги
     * @return список DTO глав манги
     */
    @Cacheable(value = "chaptersByManga", key = "#mangaId")
    public List<ChapterResponseDTO> getChaptersByMangaId(Long mangaId) {
        return chapterRepository.findByMangaIdOrderByChapterNumberAsc(mangaId)
                .stream()
                .map(chapter -> {
                    ChapterResponseDTO dto = new ChapterResponseDTO(chapter);
                    // Получаем актуальное количество страниц из ImageStorageService
                    try {
                        Integer pageCount = getPageCountFromImageService(chapter.getId());
                        dto.setPageCount(pageCount);
                        // Обновляем в базе если отличается
                        if (!pageCount.equals(chapter.getPageCount())) {
                            chapter.setPageCount(pageCount);
                            chapterRepository.save(chapter);
                        }
                    } catch (Exception e) {
                        // Если сервис недоступен, используем сохраненное значение
                        System.err.println("Failed to get page count from image service: " + e.getMessage());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Получить главу по ее идентификатору.
     * Автоматически синхронизирует количество страниц с сервисом хранения изображений.
     *
     * @param id идентификатор главы
     * @return Optional с DTO главы или пустой Optional если глава не найдена
     */
    @Cacheable(value = "chapterDetails", key = "#id")
    public Optional<ChapterResponseDTO> getChapterById(Long id) {
        return chapterRepository.findById(id)
                .map(chapter -> {
                    ChapterResponseDTO dto = new ChapterResponseDTO(chapter);
                    try {
                        Integer pageCount = getPageCountFromImageService(id);
                        dto.setPageCount(pageCount);
                        if (!pageCount.equals(chapter.getPageCount())) {
                            chapter.setPageCount(pageCount);
                            chapterRepository.save(chapter);
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to get page count from image service: " + e.getMessage());
                    }
                    return dto;
                });
    }

    /**
     * Получить количество глав для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @return количество глав
     */
    @Cacheable(value = "chapterCount", key = "#mangaId")
    public Integer getChapterCountByMangaId(Long mangaId) {
        return chapterRepository.countByMangaId(mangaId);
    }

    /**
     * Создать новую главу.
     *
     * @param createDTO DTO с данными для создания главы
     * @return DTO созданной главы
     * @throws RuntimeException если глава с таким номером уже существует
     */
    @CacheEvict(value = {"chaptersByManga", "chapterCount", "nextChapter", "previousChapter"}, key = "#createDTO.mangaId")
    public ChapterResponseDTO createChapter(ChapterCreateDTO createDTO) {
        // Проверяем, что глава с таким номером еще не существует
        Optional<Chapter> existingChapter = chapterRepository
                .findByMangaIdAndChapterNumber(createDTO.getMangaId(), createDTO.getChapterNumber());

        if (existingChapter.isPresent()) {
            throw new RuntimeException("Chapter " + createDTO.getChapterNumber() +
                    " already exists for manga " + createDTO.getMangaId());
        }

        Chapter chapter = new Chapter();
        chapter.setMangaId(createDTO.getMangaId());
        chapter.setChapterNumber(createDTO.getChapterNumber());
        chapter.setVolumeNumber(createDTO.getVolumeNumber());
        chapter.setOriginalChapterNumber(createDTO.getOriginalChapterNumber());
        chapter.setTitle(createDTO.getTitle());
        // Ensure likeCount is initialized to 0
        chapter.setLikeCount(0);
        if (createDTO.getPublishedDate() != null) {
            chapter.setPublishedDate(createDTO.getPublishedDate());
        }

        Chapter savedChapter = chapterRepository.save(chapter);

        // Fan-out notifications for bookmarked users (best-effort, non-blocking failures)
        try {
            WebClient client = webClientBuilder.build();
            // 1. Fetch subscribers from AuthService
            String subscribersUrl = authServiceInternalUrl + "/internal/bookmarks/manga/" + createDTO.getMangaId() + "/subscribers";
            List<Long> subscribers = java.util.Collections.emptyList();
            int attempts = 0;
            while (attempts < 2) { // simple retry once
                attempts++;
                try {
                    subscribers = client.get()
                            .uri(subscribersUrl)
                            .retrieve()
                            .bodyToFlux(Long.class)
                            .collectList()
                            .blockOptional(java.time.Duration.ofSeconds(4))
                            .orElse(java.util.Collections.emptyList());
                    break;
                } catch (Exception fetchEx) {
                    if (attempts >= 2) {
                        System.err.println("Fan-out: failed to fetch subscribers after retries url=" + subscribersUrl + " error=" + fetchEx.getMessage());
                    } else {
                        System.out.println("Fan-out: retry fetching subscribers (attempt " + (attempts+1) + ") url=" + subscribersUrl);
                    }
                }
            }
            System.out.println("Fan-out: subscribers url=" + subscribersUrl + " count=" + subscribers.size());
            if (!subscribers.isEmpty()) {
                // 2. Send batch event to NotificationService
                Map<String,Object> payload = Map.of(
                        "targetUserIds", subscribers,
                        "mangaId", createDTO.getMangaId(),
                        "chapterId", savedChapter.getId(),
                        "chapterNumber", String.valueOf(createDTO.getChapterNumber()),
                        "mangaTitle", fetchMangaTitle(createDTO.getMangaId())
                );
        String notifyUrl = notificationServiceBaseUrl + "/internal/events/chapter-published-batch";
        try {
            var responseEntity = client.post()
                .uri(notifyUrl)
                            .bodyValue(payload)
                            .exchangeToMono(res -> {
                                var sc = res.statusCode();
                                if (sc.is2xxSuccessful()) {
                                    return res.releaseBody().thenReturn(sc);
                                } else {
                                    return res.bodyToMono(String.class)
                                        .defaultIfEmpty("")
                                        .map(body -> {
                                            System.err.println("Fan-out: notification non-2xx status=" + sc + " body=" + body);
                                            return sc;
                                        });
                                }
                            })
                            .block(java.time.Duration.ofSeconds(4));
            if (responseEntity != null && responseEntity.is2xxSuccessful()) {
                System.out.println("Fan-out: notification batch sent url=" + notifyUrl + " status=" + responseEntity);
            } else if (responseEntity == null) {
                System.err.println("Fan-out: notification batch POST returned null status url=" + notifyUrl);
            }
        } catch (Exception postEx) {
            System.err.println("Fan-out: notification batch exception url=" + notifyUrl + " error=" + postEx.getClass().getSimpleName() + ":" + postEx.getMessage());
        }
            }
        } catch (Exception ex) {
            System.err.println("Fan-out chapter-published failed: " + ex.getClass().getSimpleName() + ":" + ex.getMessage());
        }

        return new ChapterResponseDTO(savedChapter);
    }

    /**
     * Обновить существующую главу.
     *
     * @param id идентификатор главы для обновления
     * @param updateDTO DTO с новыми данными главы
     * @return Optional с DTO обновленной главы или пустой Optional если глава не найдена
     * @throws RuntimeException если новая нумерация главы конфликтует с существующими
     */
    @CacheEvict(value = {"chaptersByManga", "chapterDetails", "chapterCount", "nextChapter", "previousChapter"}, allEntries = true)
    public Optional<ChapterResponseDTO> updateChapter(Long id, ChapterCreateDTO updateDTO) {
        return chapterRepository.findById(id)
                .map(chapter -> {
                    // Проверяем, что новый номер главы не конфликтует с существующими
                    if (!chapter.getChapterNumber().equals(updateDTO.getChapterNumber())) {
                        Optional<Chapter> existingChapter = chapterRepository
                                .findByMangaIdAndChapterNumber(chapter.getMangaId(), updateDTO.getChapterNumber());
                        if (existingChapter.isPresent()) {
                            throw new RuntimeException("Chapter " + updateDTO.getChapterNumber() +
                                    " already exists for this manga");
                        }
                        chapter.setChapterNumber(updateDTO.getChapterNumber());
                    }

                    chapter.setTitle(updateDTO.getTitle());
                    if (updateDTO.getPublishedDate() != null) {
                        chapter.setPublishedDate(updateDTO.getPublishedDate());
                    }

                    Chapter savedChapter = chapterRepository.save(chapter);
                    return new ChapterResponseDTO(savedChapter);
                });
    }

    /**
     * Удалить главу по ее идентификатору.
     * Также удаляет связанные изображения из сервиса хранения.
     *
     * @param id идентификатор главы для удаления
     */
    @CacheEvict(value = {"chaptersByManga", "chapterDetails", "chapterCount", "nextChapter", "previousChapter"}, allEntries = true)
    public void deleteChapter(Long id) {
        // Удаляем связанные изображения перед удалением главы
        try {
            deleteChapterImagesWithFallback(id);
        } catch (Exception e) {
            System.err.println("Failed to delete chapter images: " + e.getMessage());
            // Продолжаем удаление главы даже если изображения не удалились
        }

        chapterRepository.deleteById(id);
    }

    /**
     * Удаляет все главы, у которых отсутствуют страницы в ImageStorageService.
     * Метод сначала проверяет все главы, фиксирует идентификаторы пустых глав,
     * затем выполняет их удаление единым блоком.
     *
     * @return результат очистки с подсчетом найденных и удаленных глав
     */
    @CacheEvict(value = {"chaptersByManga", "chapterDetails", "chapterCount", "nextChapter", "previousChapter"}, allEntries = true)
    public ChapterCleanupResultDTO cleanupEmptyChapters() {
        List<Chapter> allChapters = chapterRepository.findAll();
        if (allChapters.isEmpty()) {
            return new ChapterCleanupResultDTO(0, 0, 0, List.of(), List.of(), List.of());
        }

        List<Long> emptyChapterIds = new java.util.ArrayList<>();
        List<Long> pageCheckFailed = new java.util.ArrayList<>();

        for (Chapter chapter : allChapters) {
            Long chapterId = chapter.getId();
            try {
                Integer pageCount = getPageCountFromImageService(chapterId);
                int normalized = pageCount != null ? pageCount : 0;
                if (normalized <= 0) {
                    emptyChapterIds.add(chapterId);
                }
            } catch (Exception ex) {
                pageCheckFailed.add(chapterId);
                logger.warn("Failed to check page count for chapter {}: {}", chapterId, ex.getMessage());
            }
        }

        if (emptyChapterIds.isEmpty()) {
            return new ChapterCleanupResultDTO(
                allChapters.size(),
                0,
                0,
                List.of(),
                List.of(),
                pageCheckFailed
            );
        }

        List<Long> deletedChapterIds = new java.util.ArrayList<>();
        List<Long> deletionFailedIds = new java.util.ArrayList<>();

        for (Long chapterId : emptyChapterIds) {
            try {
                deleteChapter(chapterId);
                deletedChapterIds.add(chapterId);
            } catch (Exception ex) {
                deletionFailedIds.add(chapterId);
                logger.error("Failed to delete empty chapter {}: {}", chapterId, ex.getMessage());
            }
        }

        return new ChapterCleanupResultDTO(
            allChapters.size(),
            emptyChapterIds.size(),
            deletedChapterIds.size(),
            deletedChapterIds,
            deletionFailedIds,
            pageCheckFailed
        );
    }

    /**
     * Получить следующую главу после указанной.
     *
     * @param mangaId идентификатор манги
     * @param currentChapterNumber номер текущей главы
     * @return Optional со следующей главой или пустой Optional
     */
    @Cacheable(value = "nextChapter", key = "#mangaId + '_' + #currentChapterNumber")
    public Optional<ChapterResponseDTO> getNextChapter(Long mangaId, Double currentChapterNumber) {
        return chapterRepository.findNextChapter(mangaId, currentChapterNumber)
                .map(ChapterResponseDTO::new);
    }

    /**
     * Получить предыдущую главу перед указанной.
     *
     * @param mangaId идентификатор манги
     * @param currentChapterNumber номер текущей главы
     * @return Optional с предыдущей главой или пустой Optional
     */
    @Cacheable(value = "previousChapter", key = "#mangaId + '_' + #currentChapterNumber")
    public Optional<ChapterResponseDTO> getPreviousChapter(Long mangaId, Double currentChapterNumber) {
        return chapterRepository.findPreviousChapter(mangaId, currentChapterNumber)
                .map(ChapterResponseDTO::new);
    }

    /**
     * Получить количество страниц главы из сервиса хранения изображений.
     *
     * @param chapterId идентификатор главы
     * @return количество страниц
     */
    private Integer getPageCountFromImageService(Long chapterId) {
        List<String> baseUrls = resolveImageStorageBaseUrls();
        WebClientRequestException lastConnectException = null;

        for (String baseUrl : baseUrls) {
            try {
                WebClient client = webClientBuilder.baseUrl(baseUrl).build();
                return client.get()
                        .uri("/api/images/chapter/{chapterId}/count", chapterId)
                        .retrieve()
                        .bodyToMono(Integer.class)
                        .block();
            } catch (WebClientRequestException ex) {
                if (isConnectionRefused(ex)) {
                    logImageServiceConnectionIssue(baseUrl, ex);
                    lastConnectException = ex;
                    continue;
                }
                throw ex;
            }
        }

        if (lastConnectException != null) {
            throw lastConnectException;
        }

        throw new IllegalStateException("ImageStorageService base URLs are not configured");
    }

    /**
     * Обновить количество страниц для главы.
     *
     * @param chapterId идентификатор главы
     * @param pageCount новое количество страниц
     * @return DTO обновленной главы
     * @throws RuntimeException если глава не найдена
     */
    @CacheEvict(value = {"chapterDetails"}, key = "#chapterId")
    public ChapterResponseDTO updatePageCount(Long chapterId, Integer pageCount) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found with id: " + chapterId));

        chapter.setPageCount(pageCount);
        Chapter savedChapter = chapterRepository.save(chapter);

        System.out.println("Updated chapter " + chapterId + " pageCount to: " + pageCount);
        return new ChapterResponseDTO(savedChapter);
    }

    /**
     * Поставить лайк к главе от имени пользователя.
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     * @throws RuntimeException если глава не найдена или пользователь уже лайкнул
     */
    @CacheEvict(value = {"chapterDetails"}, key = "#chapterId")
    public void likeChapter(Long userId, Long chapterId) {
        // Проверяем, существует ли глава
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found with id: " + chapterId));

        // Проверяем, не лайкнул ли уже пользователь
        if (chapterLikeRepository.existsByUserIdAndChapterId(userId, chapterId)) {
            throw new RuntimeException("User " + userId + " has already liked chapter " + chapterId);
        }

        // Создаем лайк
        ChapterLike like = new ChapterLike(userId, chapterId);
        chapterLikeRepository.save(like);

        // Обновляем счетчик лайков (обрабатываем null значения)
        Integer currentLikes = chapter.getLikeCount();
        if (currentLikes == null) {
            currentLikes = 0;
        }
        chapter.setLikeCount(currentLikes + 1);
        chapterRepository.save(chapter);

        // Increment user's likesGivenCount (only chapter likes are counted per business rule)
        try {
            RestTemplate rt = new RestTemplate();
            rt.postForEntity(authServiceInternalUrl + "/internal/metrics/users/" + userId + "/likes-given/increment", null, Void.class);
        } catch (Exception ex) {
            System.out.println("[ChapterService] Failed to increment likesGivenCount for user " + userId + ": " + ex.getMessage());
        }

    // Publish CHAPTER_LIKE_RECEIVED XP event awarding XP to the liker (as per new semantics)
    if (rabbitTemplate != null) {
            try {
                Map<String,Object> event = new java.util.HashMap<>();
                event.put("type", "CHAPTER_LIKE_RECEIVED");
        event.put("userId", userId); // XP receiver = liker
                event.put("chapterId", chapterId);
                event.put("mangaId", chapter.getMangaId());
                String eventId = "CHAPTER_LIKE_RECEIVED:" + chapterId + ":" + userId;
                event.put("eventId", eventId);
                event.put("likerUserId", userId);
                event.put("occurredAt", java.time.Instant.now().toString());
                rabbitTemplate.convertAndSend(xpExchange, chapterRoutingKey, event);
            } catch (Exception ex) {
                System.err.println("Failed to publish CHAPTER_LIKE_RECEIVED event: " + ex.getMessage());
            }
        }
    }

    /**
     * Убрать лайк с главы от имени пользователя.
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     * @throws RuntimeException если глава не найдена или лайк не существует
     */
    @CacheEvict(value = {"chapterDetails"}, key = "#chapterId")
    public void unlikeChapter(Long userId, Long chapterId) {
        // Проверяем, существует ли глава
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found with id: " + chapterId));

        // Находим лайк
        ChapterLike like = chapterLikeRepository.findByUserIdAndChapterId(userId, chapterId)
                .orElseThrow(() -> new RuntimeException("User " + userId + " has not liked chapter " + chapterId));

        // Удаляем лайк
        chapterLikeRepository.delete(like);

        // Обновляем счетчик лайков (обрабатываем null значения)
        Integer currentLikes = chapter.getLikeCount();
        if (currentLikes == null) {
            currentLikes = 0;
        }
        chapter.setLikeCount(Math.max(0, currentLikes - 1));
        chapterRepository.save(chapter);
    }

    /**
     * Переключить лайк к главе от имени пользователя (поставить или убрать).
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     * @return Map с полями "liked" (boolean) и "likeCount" (Integer)
     * @throws RuntimeException если глава не найдена
     */
    @CacheEvict(value = {"chapterDetails", "chaptersByManga"}, key = "#chapterId", allEntries = true)
    public Map<String, Object> toggleLike(Long userId, Long chapterId) {
        // Проверяем, существует ли глава
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Chapter not found with id: " + chapterId));

        // Проверяем, лайкнул ли уже пользователь
        boolean alreadyLiked = chapterLikeRepository.existsByUserIdAndChapterId(userId, chapterId);

        if (alreadyLiked) {
            // Убираем лайк
            ChapterLike like = chapterLikeRepository.findByUserIdAndChapterId(userId, chapterId)
                    .orElseThrow(() -> new RuntimeException("Like not found"));
            chapterLikeRepository.delete(like);

            // Обновляем счетчик лайков
            Integer currentLikes = chapter.getLikeCount();
            if (currentLikes == null) {
                currentLikes = 0;
            }
            chapter.setLikeCount(Math.max(0, currentLikes - 1));
            chapterRepository.save(chapter);
            return Map.of("liked", false, "likeCount", chapter.getLikeCount()); // лайк убран
        } else {
            // Ставим лайк
            ChapterLike like = new ChapterLike(userId, chapterId);
            chapterLikeRepository.save(like);

            // Обновляем счетчик лайков
            Integer currentLikes = chapter.getLikeCount();
            if (currentLikes == null) {
                currentLikes = 0;
            }
            chapter.setLikeCount(currentLikes + 1);
            chapterRepository.save(chapter);
            // Publish event only when like added
            if (rabbitTemplate != null) {
                try {
                    Map<String,Object> event = new java.util.HashMap<>();
                    event.put("type", "CHAPTER_LIKE_RECEIVED");
                    event.put("userId", userId); // XP receiver = liker
                    event.put("chapterId", chapterId);
                    event.put("mangaId", chapter.getMangaId());
                    String eventId = "CHAPTER_LIKE_RECEIVED:" + chapterId + ":" + userId;
                    event.put("eventId", eventId);
                    event.put("likerUserId", userId);
                    event.put("occurredAt", java.time.Instant.now().toString());
                    rabbitTemplate.convertAndSend(xpExchange, chapterRoutingKey, event);
                } catch (Exception ex) {
                    System.err.println("Failed to publish CHAPTER_LIKE_RECEIVED event: " + ex.getMessage());
                }
            }
            // Increment likesGivenCount only for chapter likes (new like path)
            try {
                RestTemplate rt = new RestTemplate();
                rt.postForEntity(authServiceInternalUrl + "/internal/metrics/users/" + userId + "/likes-given/increment", null, Void.class);
            } catch (Exception ex) {
                System.out.println("[ChapterService] Failed to increment likesGivenCount (toggle) for user " + userId + ": " + ex.getMessage());
            }
            return Map.of("liked", true, "likeCount", chapter.getLikeCount()); // лайк поставлен
        }
    }

    /**
     * Проверить, лайкнул ли пользователь главу.
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     * @return true, если пользователь лайкнул главу, иначе false
     */
    public boolean isLikedByUser(Long userId, Long chapterId) {
        return chapterLikeRepository.existsByUserIdAndChapterId(userId, chapterId);
    }

    /**
     * Получить список идентификаторов глав, которые пользователь лайкнул из переданного набора.
     *
     * @param userId идентификатор пользователя
     * @param chapterIds набор глав для проверки
     * @return список идентификаторов глав, которые пользователь лайкнул
     */
    public List<Long> getLikedChapterIds(Long userId, List<Long> chapterIds) {
        if (chapterIds == null || chapterIds.isEmpty()) {
            return Collections.emptyList();
        }
        return chapterLikeRepository.findLikedChapterIds(userId, chapterIds);
    }

    /**
     * Record that a user has read a chapter (idempotent best-effort for XP; caller ensures uniqueness).
     * Publishes a CHAPTER_READ XP event if RabbitTemplate is available.
     */
    public void recordChapterRead(Long userId, Long chapterId) {
        // Fast path: if already recorded, do nothing (deduplicates repeated calls / refresh spam)
        if (chapterReadRepository.existsByUserIdAndChapterId(userId, chapterId)) {
            return;
        }

        // Persist unique read (handles race via unique constraint)
        boolean created = false;
        try {
            ChapterRead cr = new ChapterRead(userId, chapterId);
            chapterReadRepository.save(cr);
            created = true;
        } catch (org.springframework.dao.DataIntegrityViolationException dupEx) {
            // Another concurrent request inserted it first; ignore silently
            created = false;
        } catch (Exception ex) {
            System.err.println("Failed to persist ChapterRead user=" + userId + " chapter=" + chapterId + " error=" + ex.getMessage());
        }

        // Only publish XP event if this is the first successful read record
        if (created && rabbitTemplate != null) {
            try {
                Map<String,Object> event = new java.util.HashMap<>();
                event.put("type", "CHAPTER_READ");
                String eventId = "CHAPTER_READ:" + userId + ":" + chapterId;
                event.put("eventId", eventId);
                event.put("userId", userId);
                event.put("chapterId", chapterId);
                chapterRepository.findById(chapterId).ifPresent(ch -> event.put("mangaId", ch.getMangaId()));
                event.put("occurredAt", java.time.Instant.now().toString());
                rabbitTemplate.convertAndSend(xpExchange, chapterRoutingKey, event);
            } catch (Exception ex) {
                System.err.println("Failed to publish CHAPTER_READ event: " + ex.getMessage());
            }
        }
    }

    /**
     * Проверяет существование главы по mangaId и chapterNumber.
     *
     * @param mangaId идентификатор манги
     * @param chapterNumber номер главы
     * @return true, если глава существует, иначе false
     */
    public boolean chapterExists(Long mangaId, Double chapterNumber) {
        return chapterRepository.findByMangaIdAndChapterNumber(mangaId, chapterNumber).isPresent();
    }

    private String fetchMangaTitle(Long mangaId) {
        String url = mangaServiceInternalUrl + "/api/manga/" + mangaId;
        try {
            WebClient client = webClientBuilder.build();
            Map<?,?> map = client.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(java.time.Duration.ofSeconds(3));
            if (map != null) {
                Object title = map.get("title");
                if (title != null) return String.valueOf(title);
            }
        } catch (Exception ex) {
            System.err.println("fetchMangaTitle failed url=" + url + " error=" + ex.getMessage());
        }
        return null;
    }

    private void deleteChapterImagesWithFallback(Long chapterId) {
        List<String> baseUrls = resolveImageStorageBaseUrls();
        WebClientRequestException lastConnectException = null;

        for (String baseUrl : baseUrls) {
            try {
                WebClient client = webClientBuilder.baseUrl(baseUrl).build();
                client.delete()
                        .uri("/api/images/chapter/{chapterId}", chapterId)
                        .retrieve()
                        .bodyToMono(Void.class)
                        .block();
                return;
            } catch (WebClientRequestException ex) {
                if (isConnectionRefused(ex)) {
                    logImageServiceConnectionIssue(baseUrl, ex);
                    lastConnectException = ex;
                    continue;
                }
                throw ex;
            }
        }

        if (lastConnectException != null) {
            throw lastConnectException;
        }
    }

    private List<String> resolveImageStorageBaseUrls() {
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        if (imageStorageServiceUrl != null && !imageStorageServiceUrl.isBlank()) {
            urls.add(imageStorageServiceUrl.trim());
        }
        if (imageStorageServiceInternalUrl != null && !imageStorageServiceInternalUrl.isBlank()) {
            urls.add(imageStorageServiceInternalUrl.trim());
        }
        return new ArrayList<>(urls);
    }

    private boolean isConnectionRefused(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof ConnectException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private void logImageServiceConnectionIssue(String baseUrl, Throwable ex) {
        if (reportedImageServiceConnectionIssues.add(baseUrl)) {
            logger.warn("ImageStorageService unreachable at {}: {}", baseUrl, ex.getMessage());
        } else {
            logger.debug("ImageStorageService still unreachable at {}: {}", baseUrl, ex.getMessage());
        }
    }
}
