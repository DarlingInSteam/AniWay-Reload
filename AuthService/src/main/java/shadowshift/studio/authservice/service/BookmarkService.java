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
    
    @Value("${manga.service.url:http://localhost:8081}")
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
                .map(this::convertToDTO)
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
}