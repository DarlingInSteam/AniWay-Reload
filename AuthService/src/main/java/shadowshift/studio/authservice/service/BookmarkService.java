package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.authservice.dto.BookmarkDTO;
import shadowshift.studio.authservice.entity.Bookmark;
import shadowshift.studio.authservice.entity.BookmarkStatus;
import shadowshift.studio.authservice.repository.BookmarkRepository;
import shadowshift.studio.authservice.repository.UserRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Сервис для управления закладками пользователей на мангу.
 * Предоставляет функциональность добавления, обновления, удаления закладок,
 * получения списков закладок и избранного, а также очистки orphaned закладок.
 *
 * @author ShadowShiftStudio
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookmarkService {
    
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ReadingProgressService readingProgressService;
    
    @Value("${manga.service.url}")
    private String mangaServiceUrl;
    
    /**
     * Добавляет или обновляет закладку для пользователя.
     * Если закладка уже существует, обновляет статус и флаг избранного.
     * Если нет, создает новую закладку.
     *
     * @param username имя пользователя
     * @param mangaId идентификатор манги
     * @param status статус закладки
     * @param isFavorite флаг избранного (может быть null)
     * @return объект DTO закладки
     * @throws IllegalArgumentException если пользователь не найден
     */
    public BookmarkDTO addOrUpdateBookmark(String username, Long mangaId, BookmarkStatus status, Boolean isFavorite) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Optional<Bookmark> existingBookmark = bookmarkRepository.findByUserIdAndMangaId(user.getId(), mangaId);
        
        Bookmark bookmark;
        if (existingBookmark.isPresent()) {
            bookmark = existingBookmark.get();
            bookmark.setStatus(status);
            if (isFavorite != null) {
                bookmark.setIsFavorite(isFavorite);
            }
        } else {
            bookmark = Bookmark.builder()
                    .userId(user.getId())
                    .mangaId(mangaId)
                    .status(status)
                    .isFavorite(isFavorite != null ? isFavorite : false)
                    .build();
        }
        
        // Ленивое кэширование (агрессивно при создании/обновлении)
        fetchAndCacheMangaInfo(bookmark, true);

        bookmarkRepository.save(bookmark);
        log.info("Bookmark saved for user: {} manga: {} status: {}", username, mangaId, status);
        
        return convertToDTO(bookmark);
    }
    
    /**
     * Удаляет закладку пользователя для указанной манги.
     *
     * @param username имя пользователя
     * @param mangaId идентификатор манги
     * @throws IllegalArgumentException если пользователь не найден
     */
    public void removeBookmark(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        bookmarkRepository.deleteByUserIdAndMangaId(user.getId(), mangaId);
        log.info("Bookmark removed for user: {} manga: {}", username, mangaId);
    }
    
    /**
     * Получает все закладки пользователя с дополнительной информацией о манге.
     *
     * @param username имя пользователя
     * @return список DTO закладок с информацией о манге
     * @throws IllegalArgumentException если пользователь не найден
     */
    public List<BookmarkDTO> getUserBookmarks(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Bookmark> bookmarks = bookmarkRepository.findByUserId(user.getId());
        return bookmarks.stream()
                .map(this::convertToDTOWithMangaInfo)
                .collect(Collectors.toList());
    }
    
    /**
     * Получает закладки пользователя по указанному статусу.
     *
     * @param username имя пользователя
     * @param status статус закладки
     * @return список DTO закладок
     * @throws IllegalArgumentException если пользователь не найден
     */
    public List<BookmarkDTO> getUserBookmarksByStatus(String username, BookmarkStatus status) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Bookmark> bookmarks = bookmarkRepository.findByUserIdAndStatus(user.getId(), status);
        return bookmarks.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Получает избранные закладки пользователя с дополнительной информацией о манге.
     *
     * @param username имя пользователя
     * @return список DTO избранных закладок с информацией о манге
     * @throws IllegalArgumentException если пользователь не найден
     */
    public List<BookmarkDTO> getUserFavorites(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Bookmark> favorites = bookmarkRepository.findByUserIdAndIsFavoriteTrue(user.getId());
        return favorites.stream()
                .map(this::convertToDTOWithMangaInfo)
                .collect(Collectors.toList());
    }
    
    /**
     * Получает закладку пользователя для указанной манги.
     *
     * @param username имя пользователя
     * @param mangaId идентификатор манги
     * @return Optional с DTO закладки, если существует
     * @throws IllegalArgumentException если пользователь не найден
     */
    public Optional<BookmarkDTO> getUserBookmarkForManga(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return bookmarkRepository.findByUserIdAndMangaId(user.getId(), mangaId)
                .map(this::convertToDTO);
    }
    
    /**
     * Получает количество закладок пользователя по указанному статусу.
     *
     * @param username имя пользователя
     * @param status статус закладки
     * @return количество закладок
     * @throws IllegalArgumentException если пользователь не найден
     */
    public Long getBookmarkCountByStatus(String username, BookmarkStatus status) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return bookmarkRepository.countByUserIdAndStatus(user.getId(), status);
    }

    /**
     * Поиск закладок с фильтрацией и сортировкой на стороне сервера.
     */
    public List<BookmarkDTO> searchUserBookmarks(String username,
                         String query,
                         BookmarkStatus status,
                         Boolean favorite,
                         String sortBy,
                         String sortOrder) {
    var user = userRepository.findByUsername(username)
        .orElseThrow(() -> new IllegalArgumentException("User not found"));
    log.debug("Searching bookmarks user={} q='{}' status={} fav={} sortBy={} sortOrder={}", username, query, status, favorite, sortBy, sortOrder);
    var list = bookmarkRepository.searchBookmarks(user.getId(), query, status, favorite, sortBy, sortOrder);
    long missingCache = list.stream().filter(b -> b.getMangaTitle()==null).count();
    if (missingCache>0) {
        log.debug("{} bookmarks missing cached manga info (will attempt lazy fetch)", missingCache);
    }
    return list.stream().map(this::convertToDTOWithMangaInfo).collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Удаляет все закладки для указанной манги.
     * Используется при удалении манги из системы.
     *
     * @param mangaId идентификатор манги
     */
    @Transactional
    public void removeAllBookmarksForManga(Long mangaId) {
        try {
            Long deletedCount = bookmarkRepository.deleteByMangaId(mangaId);
            log.info("Deleted {} bookmarks for manga ID: {}", deletedCount, mangaId);
        } catch (Exception e) {
            log.error("Failed to delete bookmarks for manga ID: {}: {}", mangaId, e.getMessage());
            throw e;
        }
    }
    
    /**
     * Очищает orphaned закладки - закладки на несуществующие манги.
     * Проверяет существование каждой манги через MangaService и удаляет закладки на несуществующие.
     *
     * @return результат очистки с информацией о проверенных мангах и удаленных закладках
     */
    @Transactional
    public Map<String, Object> cleanupOrphanedBookmarks() {
        log.info("Starting cleanup of orphaned bookmarks");
        
        Map<String, Object> result = new HashMap<>();
        int deletedCount = 0;
        int checkedCount = 0;
        
        try {
            List<Long> uniqueMangaIds = bookmarkRepository.findAll()
                    .stream()
                    .map(Bookmark::getMangaId)
                    .distinct()
                    .collect(Collectors.toList());
            
            for (Long mangaId : uniqueMangaIds) {
                checkedCount++;
                if (!mangaExists(mangaId)) {
                    Long deleted = bookmarkRepository.deleteByMangaId(mangaId);
                    deletedCount += deleted.intValue();
                    log.info("Deleted {} orphaned bookmarks for non-existent manga ID: {}", deleted, mangaId);
                }
            }
            
            result.put("success", true);
            result.put("checkedMangaIds", checkedCount);
            result.put("deletedBookmarks", deletedCount);
            result.put("message", String.format("Проверено %d манг, удалено %d orphaned закладок", checkedCount, deletedCount));
            
            log.info("Cleanup completed: checked {} manga IDs, deleted {} orphaned bookmarks", checkedCount, deletedCount);
            
        } catch (Exception e) {
            log.error("Error during cleanup: {}", e.getMessage());
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return result;
    }
    
    private boolean mangaExists(Long mangaId) {
        try {
            String checkUrl = mangaServiceUrl + "/api/manga/" + mangaId;
            ResponseEntity<Object> response = restTemplate.getForEntity(checkUrl, Object.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            log.debug("Manga ID {} does not exist: {}", mangaId, e.getMessage());
            return false;
        }
    }

    private BookmarkDTO convertToDTO(Bookmark bookmark) {
        return BookmarkDTO.builder()
                .id(bookmark.getId())
                .userId(bookmark.getUserId())
                .mangaId(bookmark.getMangaId())
                .status(bookmark.getStatus())
                .isFavorite(bookmark.getIsFavorite())
                .createdAt(bookmark.getCreatedAt())
                .updatedAt(bookmark.getUpdatedAt())
                .build();
    }

    public List<Long> getUserIdsByManga(Long mangaId) {
        return bookmarkRepository.findByMangaId(mangaId).stream().map(Bookmark::getUserId).distinct().collect(Collectors.toList());
    }

    private BookmarkDTO convertToDTOWithMangaInfo(Bookmark bookmark) {
        BookmarkDTO dto = convertToDTO(bookmark);
        // догружаем кэш если отсутствует (не агрессивно)
        if (bookmark.getMangaTitle() == null || bookmark.getTotalChapters() == null || bookmark.getMangaUpdatedAt() == null) {
            fetchAndCacheMangaInfo(bookmark, false);
        }
        dto.setMangaTitle(bookmark.getMangaTitle());
        dto.setTotalChapters(bookmark.getTotalChapters());
        dto.setMangaUpdatedAt(bookmark.getMangaUpdatedAt());
        // прогресс чтения
        try {
            var user = userRepository.findById(bookmark.getUserId());
            if (user.isPresent()) {
                var latestProgress = readingProgressService.getLatestProgressForManga(
                    user.get().getUsername(), bookmark.getMangaId()
                );
                latestProgress.ifPresent(progress -> {
                    if (progress.getChapterNumber() != null) {
                        int chapterNumber = extractChapterNumber(progress.getChapterNumber().intValue());
                        dto.setCurrentChapter(chapterNumber);
                    }
                    dto.setCurrentPage(progress.getPageNumber());
                    dto.setIsCompleted(progress.getIsCompleted());
                });
            }
        } catch (Exception progressException) {
            log.debug("Failed to fetch reading progress for bookmark {}: {}", bookmark.getId(), progressException.getMessage());
        }
        return dto;
    }

    /**
     * Пытается получить информацию о манге из основного и fallback URL.
     * @param bookmark объект закладки
     * @param aggressive если true — принудительно обновляем кэш
     */
    private void fetchAndCacheMangaInfo(Bookmark bookmark, boolean aggressive) {
        if (!aggressive) {
            if (bookmark.getMangaTitle() != null && bookmark.getTotalChapters() != null && bookmark.getMangaUpdatedAt() != null) {
                return; // уже есть кэш
            }
        }
        List<String> bases = new java.util.ArrayList<>();
        bases.add(mangaServiceUrl);
        // fallback варианты (часто dev окружение)
        if (!mangaServiceUrl.contains("8081")) { // если уже правильный сервис внутри docker, добавим dev localhost
            bases.add("http://localhost:8081");
        } else {
            bases.add("http://manga-service:8082");
        }
        for (String base : bases) {
            try {
                String url = base + "/api/manga/" + bookmark.getMangaId();
                log.info("Fetching manga info from URL: {}", url);
                ResponseEntity<?> response = restTemplate.getForEntity(url, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() instanceof Map) {
                    @SuppressWarnings("unchecked") Map<String,Object> manga = (Map<String,Object>) response.getBody();
                    Object titleObj = manga.get("title");
                    if (titleObj instanceof String title) {
                        if (bookmark.getMangaTitle()==null || !title.equals(bookmark.getMangaTitle())) {
                            bookmark.setMangaTitle(title);
                        }
                    }
                    Object totalChaptersObj = manga.get("totalChapters");
                    if (totalChaptersObj instanceof Number n) {
                        int chapters = n.intValue();
                        if (bookmark.getTotalChapters()==null || bookmark.getTotalChapters()!=chapters) {
                            bookmark.setTotalChapters(chapters);
                        }
                    }
                    Object updatedAtObj = manga.get("updatedAt");
                    if (updatedAtObj instanceof String s) {
                        try {
                            var lu = java.time.LocalDateTime.parse(s);
                            if (bookmark.getMangaUpdatedAt()==null || !lu.equals(bookmark.getMangaUpdatedAt())) {
                                bookmark.setMangaUpdatedAt(lu);
                            }
                        } catch (Exception ignore) {}
                    }
                    try { bookmarkRepository.save(bookmark); } catch (Exception ignore) {}
                    return; // успех — прекращаем попытки
                } else {
                    log.debug("Manga info not successful from {} status={}", base, response.getStatusCode());
                }
            } catch (Exception ex) {
                log.debug("Manga info fetch failed from {}: {}", base, ex.getMessage());
            }
        }
    }
    
    /**
     * Извлекает номер главы из формата XYYY, где X - том, YYY - глава
     * @param fullChapterNumber полный номер главы в формате XYYY
     * @return номер главы (последние 3 цифры)
     */
    private int extractChapterNumber(int fullChapterNumber) {
        if (fullChapterNumber >= 1000) {
            // Для чисел >= 1000 берем последние 3 цифры
            return fullChapterNumber % 1000;
        } else {
            // Для чисел < 1000 возвращаем как есть
            return fullChapterNumber;
        }
    }

    /**
     * Массовое обновление кэша манги для закладок, у которых отсутствует заголовок.
     * Возвращает количество успешно обновлённых записей.
     */
    @Transactional
    public Map<String,Object> backfillMangaCache() {
        List<Bookmark> toUpdate = bookmarkRepository.findAll().stream()
            .filter(b -> b.getMangaTitle()==null || b.getTotalChapters()==null || b.getMangaUpdatedAt()==null)
            .collect(Collectors.toList());
        int success = 0;
        for (Bookmark b : toUpdate) {
            fetchAndCacheMangaInfo(b, true);
            if (b.getMangaTitle()!=null) success++; // простая эвристика
        }
        Map<String,Object> res = new java.util.HashMap<>();
        res.put("attempted", toUpdate.size());
        res.put("updated", success);
        res.put("remaining", toUpdate.size()-success);
        return res;
    }
}