package shadowshift.studio.chapterservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import shadowshift.studio.chapterservice.dto.ChapterCreateDTO;
import shadowshift.studio.chapterservice.dto.ChapterResponseDTO;
import shadowshift.studio.chapterservice.entity.Chapter;
import shadowshift.studio.chapterservice.entity.ChapterLike;
import shadowshift.studio.chapterservice.repository.ChapterRepository;
import shadowshift.studio.chapterservice.repository.ChapterLikeRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Сервис для управления главами манги.
 * Предоставляет бизнес-логику для операций CRUD с главами, включая интеграцию с сервисом хранения изображений.
 *
 * @author ShadowShiftStudio
 */
@Service
public class ChapterService {

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private ChapterLikeRepository chapterLikeRepository;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    @Value("${notification.service.base-url:http://notification-service:8095}")
    private String notificationServiceBaseUrl;

    @Value("${auth.service.internal-url:http://auth-service:8085}")
    private String authServiceInternalUrl;

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
        var responseEntity = client.post()
            .uri(notifyUrl)
                        .bodyValue(payload)
                        .retrieve()
                        .toBodilessEntity()
                        .block(java.time.Duration.ofSeconds(3));
                if (responseEntity != null) {
                    System.out.println("Fan-out: notification batch sent url=" + notifyUrl + " status=" + responseEntity.getStatusCode());
                } else {
                    System.out.println("Fan-out: notification batch call returned null response url=" + notifyUrl);
                }
            }
        } catch (Exception ex) {
            System.err.println("Fan-out chapter-published failed: " + ex.getMessage());
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
            WebClient webClient = webClientBuilder.build();
            webClient.delete()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + id)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
        } catch (Exception e) {
            System.err.println("Failed to delete chapter images: " + e.getMessage());
            // Продолжаем удаление главы даже если изображения не удалились
        }

        chapterRepository.deleteById(id);
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
        WebClient webClient = webClientBuilder.build();
        return webClient.get()
                .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId + "/count")
                .retrieve()
                .bodyToMono(Integer.class)
                .block();
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

    private String fetchMangaTitle(Long mangaId) {
        try {
            WebClient client = webClientBuilder.build();
            Map<?,?> map = client.get()
                    .uri("http://manga-service:8082/api/manga/" + mangaId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block(java.time.Duration.ofSeconds(2));
            if (map != null) {
                Object title = map.get("title");
                if (title != null) return String.valueOf(title);
            }
        } catch (Exception ignored) {}
        return null;
    }
}
