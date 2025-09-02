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
        
        bookmarkRepository.save(bookmark);
        log.info("Bookmark saved for user: {} manga: {} status: {}", username, mangaId, status);
        
        return convertToDTO(bookmark);
    }
    
    public void removeBookmark(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        bookmarkRepository.deleteByUserIdAndMangaId(user.getId(), mangaId);
        log.info("Bookmark removed for user: {} manga: {}", username, mangaId);
    }
    
    public List<BookmarkDTO> getUserBookmarks(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Bookmark> bookmarks = bookmarkRepository.findByUserId(user.getId());
        return bookmarks.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<BookmarkDTO> getUserBookmarksByStatus(String username, BookmarkStatus status) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Bookmark> bookmarks = bookmarkRepository.findByUserIdAndStatus(user.getId(), status);
        return bookmarks.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<BookmarkDTO> getUserFavorites(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Bookmark> favorites = bookmarkRepository.findByUserIdAndIsFavoriteTrue(user.getId());
        return favorites.stream()
                .map(this::convertToDTOWithMangaInfo)
                .collect(Collectors.toList());
    }
    
    public Optional<BookmarkDTO> getUserBookmarkForManga(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return bookmarkRepository.findByUserIdAndMangaId(user.getId(), mangaId)
                .map(this::convertToDTO);
    }
    
    public Long getBookmarkCountByStatus(String username, BookmarkStatus status) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return bookmarkRepository.countByUserIdAndStatus(user.getId(), status);
    }
    
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
    
    @Transactional
    public Map<String, Object> cleanupOrphanedBookmarks() {
        log.info("Starting cleanup of orphaned bookmarks");
        
        Map<String, Object> result = new HashMap<>();
        int deletedCount = 0;
        int checkedCount = 0;
        
        try {
            // Получаем все уникальные mangaId из закладок
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

    private BookmarkDTO convertToDTOWithMangaInfo(Bookmark bookmark) {
        BookmarkDTO dto = convertToDTO(bookmark);
        
        try {
            // Get manga info from MangaService
            String mangaUrl = mangaServiceUrl + "/api/manga/" + bookmark.getMangaId();
            ResponseEntity<Map> response = restTemplate.getForEntity(mangaUrl, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> manga = response.getBody();
                dto.setMangaTitle((String) manga.get("title"));
                dto.setMangaCoverUrl((String) manga.get("coverImageUrl"));
                
                // Get total chapters from manga
                Object totalChaptersObj = manga.get("totalChapters");
                if (totalChaptersObj instanceof Integer) {
                    dto.setTotalChapters((Integer) totalChaptersObj);
                }
            }
            
            // Get reading progress
            try {
                var user = userRepository.findById(bookmark.getUserId());
                if (user.isPresent()) {
                    var latestProgress = readingProgressService.getLatestProgressForManga(
                        user.get().getUsername(), bookmark.getMangaId()
                    );
                    if (latestProgress.isPresent()) {
                        var progress = latestProgress.get();
                        if (progress.getChapterNumber() != null) {
                            // Извлекаем номер главы из формата XYYY (последние 3 цифры)
                            int chapterNumber = extractChapterNumber(progress.getChapterNumber().intValue());
                            dto.setCurrentChapter(chapterNumber);
                        }
                        dto.setCurrentPage(progress.getPageNumber());
                        dto.setIsCompleted(progress.getIsCompleted());
                    }
                }
            } catch (Exception progressException) {
                log.debug("Failed to fetch reading progress for bookmark {}: {}", 
                    bookmark.getId(), progressException.getMessage());
            }
            
        } catch (Exception e) {
            log.warn("Failed to fetch manga info for bookmark {}: {}", bookmark.getId(), e.getMessage());
        }
        
        return dto;
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
}