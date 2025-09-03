package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.ReadingProgressDTO;
import shadowshift.studio.authservice.entity.ReadingProgress;
import shadowshift.studio.authservice.repository.ReadingProgressRepository;
import shadowshift.studio.authservice.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReadingProgressService {
    
    private final ReadingProgressRepository readingProgressRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    
    public ReadingProgressDTO updateProgress(String username, Long mangaId, Long chapterId, 
                                           Double chapterNumber, Integer pageNumber, Boolean isCompleted) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Optional<ReadingProgress> existingProgress = readingProgressRepository
                .findByUserIdAndChapterId(user.getId(), chapterId);
        
        ReadingProgress progress;
        if (existingProgress.isPresent()) {
            progress = existingProgress.get();
            progress.setPageNumber(pageNumber);
            progress.setIsCompleted(isCompleted);
        } else {
            progress = ReadingProgress.builder()
                    .userId(user.getId())
                    .mangaId(mangaId)
                    .chapterId(chapterId)
                    .chapterNumber(chapterNumber)
                    .pageNumber(pageNumber)
                    .isCompleted(isCompleted)
                    .build();
        }
        
        readingProgressRepository.save(progress);
        
        // Update user statistics if chapter is completed
        if (isCompleted) {
            // Check if this is a new completion (not just updating existing completed progress)
            boolean wasAlreadyCompleted = existingProgress.isPresent() && existingProgress.get().getIsCompleted();
            if (!wasAlreadyCompleted) {
                // This is a new chapter completion, increment counter
                userService.incrementChapterCount(username);
            }
        }
        
        log.info("Reading progress updated for user: {} chapter: {} page: {}", username, chapterId, pageNumber);
        
        return convertToDTO(progress);
    }
    
    public Optional<ReadingProgressDTO> getLatestProgressForManga(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> progressList = readingProgressRepository
                .findLatestProgressForManga(user.getId(), mangaId);
        
        return progressList.stream()
                .findFirst()
                .map(this::convertToDTO);
    }
    
    public List<ReadingProgressDTO> getUserProgress(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> progressList = readingProgressRepository.findByUserId(user.getId());
        return progressList.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<ReadingProgressDTO> getCompletedChapters(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> completedChapters = readingProgressRepository.findCompletedChapters(user.getId());
        return completedChapters.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<ReadingProgressDTO> getMangaProgress(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> progressList = readingProgressRepository
                .findByUserIdAndMangaId(user.getId(), mangaId);
        return progressList.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public ReadingProgressDTO getChapterProgress(String username, Long chapterId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Optional<ReadingProgress> progress = readingProgressRepository
                .findByUserIdAndChapterId(user.getId(), chapterId);
        
        return progress.map(this::convertToDTO).orElse(null);
    }
    
    public ReadingProgressDTO saveProgress(String username, ReadingProgressDTO progressData) {
        return updateProgress(username, progressData.getMangaId(), progressData.getChapterId(),
                progressData.getChapterNumber(), progressData.getPageNumber(), progressData.getIsCompleted());
    }
    
    public ReadingProgressDTO updateProgress(String username, Long id, ReadingProgressDTO progressData) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        ReadingProgress progress = readingProgressRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Progress not found"));
        
        // Verify ownership
        if (!progress.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("Access denied");
        }
        
        boolean wasCompleted = progress.getIsCompleted();
        
        progress.setPageNumber(progressData.getPageNumber());
        progress.setIsCompleted(progressData.getIsCompleted());
        readingProgressRepository.save(progress);
        
        if (progressData.getIsCompleted() && !wasCompleted) {
            // This is a new chapter completion, increment counter
            userService.incrementChapterCount(username);
        }
        
        return convertToDTO(progress);
    }
    
    public void deleteProgress(String username, Long id) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        ReadingProgress progress = readingProgressRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Progress not found"));
        
        // Verify ownership
        if (!progress.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("Access denied");
        }
        
        readingProgressRepository.delete(progress);
    }
    
    public Map<String, Object> getReadingStats(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Calculate actual completed chapters from database instead of using cached counter
        Long actualCompletedChapters = readingProgressRepository.countCompletedChaptersByUser(user.getId());
        Long mangasStarted = readingProgressRepository.countDistinctMangasByUser(user.getId());
        Long totalProgressEntries = readingProgressRepository.countByUserId(user.getId());
        
        // Update user's cached counter if it's different from actual count
        if (!actualCompletedChapters.equals(user.getChaptersReadCount().longValue())) {
            user.setChaptersReadCount(actualCompletedChapters.intValue());
            userRepository.save(user);
            log.info("Updated user {} chapters count from {} to {}", username, user.getChaptersReadCount(), actualCompletedChapters);
        }
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalChaptersRead", actualCompletedChapters);
        stats.put("chaptersRead", actualCompletedChapters);  // Добавляем оба ключа для совместимости
        stats.put("mangasStarted", mangasStarted);
        stats.put("totalProgressEntries", totalProgressEntries);
        
        return stats;
    }
    
    private ReadingProgressDTO convertToDTO(ReadingProgress progress) {
        return ReadingProgressDTO.builder()
                .id(progress.getId())
                .userId(progress.getUserId())
                .mangaId(progress.getMangaId())
                .chapterId(progress.getChapterId())
                .chapterNumber(progress.getChapterNumber())
                .pageNumber(progress.getPageNumber())
                .isCompleted(progress.getIsCompleted())
                .createdAt(progress.getCreatedAt())
                .updatedAt(progress.getUpdatedAt())
                .build();
    }
}
