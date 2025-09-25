package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
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

/**
 * Сервис для управления прогрессом чтения пользователей.
 * Предоставляет функциональность обновления, получения и удаления прогресса чтения манги.
 *
 * @author ShadowShiftStudio
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReadingProgressService {
    
    private final ReadingProgressRepository readingProgressRepository;
    private final UserRepository userRepository;
        private final UserService userService;
        private final RabbitTemplate rabbitTemplate;

        // XP event routing (must match LevelService listener binding)
        private static final String XP_EXCHANGE = "xp.events.exchange";
        private static final String CHAPTER_ROUTING_KEY = "xp.events.chapter"; // assumed existing binding like ChapterService
    
    /**
     * Обновляет прогресс чтения для пользователя.
     * Если прогресс уже существует, обновляет страницу и статус завершения.
     * Если нет, создает новый прогресс.
     *
     * @param username имя пользователя
     * @param mangaId идентификатор манги
     * @param chapterId идентификатор главы
     * @param chapterNumber номер главы
     * @param pageNumber номер страницы
     * @param isCompleted флаг завершения главы
     * @return объект DTO прогресса чтения
     * @throws IllegalArgumentException если пользователь не найден
     */
    @CacheEvict(value = {"userProgress", "mangaProgress", "chapterProgress", "readingStats"}, key = "#username")
        public ReadingProgressDTO updateProgress(String username, Long mangaId, Long chapterId,
                                                                                   Double chapterNumber, Integer pageNumber, Boolean isCompleted) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Optional<ReadingProgress> existingProgress = readingProgressRepository
                .findByUserIdAndChapterId(user.getId(), chapterId);
        
        ReadingProgress progress;
                boolean isNew = false;
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
                        isNew = true;
        }
        
                readingProgressRepository.save(progress);

                boolean wasAlreadyCompleted = existingProgress.isPresent() && existingProgress.get().getIsCompleted();
                // Award policy change: give XP on first creation OR on completion transition (but only once total).
                if (isNew) {
                        publishChapterReadEvent(user.getId(), chapterId);
                        log.info("Reading progress created (initial) for user: {} chapter: {} page: {} (isCompleted={}, award=initial)", username, chapterId, pageNumber, isCompleted);
                } else if (isCompleted && !wasAlreadyCompleted) {
                        userService.incrementChapterCount(username);
                        publishChapterReadEvent(user.getId(), chapterId);
                        log.info("Reading progress completion transition for user: {} chapter: {} page: {} (award=completion)", username, chapterId, pageNumber);
                } else {
                        log.debug("Reading progress updated no-award user={} chapter={} page={} isCompleted={} wasCompletedPreviously={}", username, chapterId, pageNumber, isCompleted, wasAlreadyCompleted);
                }

                log.info("Reading progress saved for user: {} chapter: {} page: {}", username, chapterId, pageNumber);
        
        return convertToDTO(progress);
    }

        private void publishChapterReadEvent(Long userId, Long chapterId) {
                if (rabbitTemplate == null) return; // safety
                try {
                        java.util.Map<String,Object> event = new java.util.HashMap<>();
                        event.put("type", "CHAPTER_READ");
                        event.put("eventId", "CHAPTER_READ:" + userId + ":" + chapterId);
                        event.put("userId", userId);
                        event.put("chapterId", chapterId);
                        event.put("occurredAt", java.time.Instant.now().toString());
                        rabbitTemplate.convertAndSend(XP_EXCHANGE, CHAPTER_ROUTING_KEY, event);
                        log.info("[XP-PUBLISH] CHAPTER_READ user={} chapter={} routingKey={} exchange={}", userId, chapterId, CHAPTER_ROUTING_KEY, XP_EXCHANGE);
                } catch (Exception ex) {
                        log.warn("Failed to publish CHAPTER_READ event user={} chapter={} error={}", userId, chapterId, ex.getMessage());
                }
        }
    
    /**
     * Получает последний прогресс чтения для указанной манги.
     *
     * @param username имя пользователя
     * @param mangaId идентификатор манги
     * @return Optional с DTO прогресса чтения
     * @throws IllegalArgumentException если пользователь не найден
     */
    public Optional<ReadingProgressDTO> getLatestProgressForManga(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> progressList = readingProgressRepository
                .findLatestProgressForManga(user.getId(), mangaId);
        
        return progressList.stream()
                .findFirst()
                .map(this::convertToDTO);
    }
    
    /**
     * Получает весь прогресс чтения пользователя.
     *
     * @param username имя пользователя
     * @return список DTO прогресса чтения
     * @throws IllegalArgumentException если пользователь не найден
     */
    @Cacheable(value = "userProgress", key = "#username")
    public List<ReadingProgressDTO> getUserProgress(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> progressList = readingProgressRepository.findByUserId(user.getId());
        return progressList.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Получает завершенные главы пользователя.
     *
     * @param username имя пользователя
     * @return список DTO завершенных глав
     * @throws IllegalArgumentException если пользователь не найден
     */
    public List<ReadingProgressDTO> getCompletedChapters(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> completedChapters = readingProgressRepository.findCompletedChapters(user.getId());
        return completedChapters.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Получает прогресс чтения для указанной манги.
     *
     * @param username имя пользователя
     * @param mangaId идентификатор манги
     * @return список DTO прогресса чтения для манги
     * @throws IllegalArgumentException если пользователь не найден
     */
    @Cacheable(value = "mangaProgress", key = "#username + '_' + #mangaId")
    public List<ReadingProgressDTO> getMangaProgress(String username, Long mangaId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<ReadingProgress> progressList = readingProgressRepository
                .findByUserIdAndMangaId(user.getId(), mangaId);
        return progressList.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Получает прогресс чтения для указанной главы.
     *
     * @param username имя пользователя
     * @param chapterId идентификатор главы
     * @return объект DTO прогресса чтения или null, если не найден
     * @throws IllegalArgumentException если пользователь не найден
     */
    @Cacheable(value = "chapterProgress", key = "#username + '_' + #chapterId")
    public ReadingProgressDTO getChapterProgress(String username, Long chapterId) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Optional<ReadingProgress> progress = readingProgressRepository
                .findByUserIdAndChapterId(user.getId(), chapterId);
        
        return progress.map(this::convertToDTO).orElse(null);
    }
    
    /**
     * Сохраняет прогресс чтения из DTO.
     *
     * @param username имя пользователя
     * @param progressData данные прогресса чтения
     * @return объект DTO сохраненного прогресса
     */
    @CacheEvict(value = {"userProgress", "mangaProgress", "chapterProgress", "readingStats"}, key = "#username")
    public ReadingProgressDTO saveProgress(String username, ReadingProgressDTO progressData) {
        return updateProgress(username, progressData.getMangaId(), progressData.getChapterId(),
                progressData.getChapterNumber(), progressData.getPageNumber(), progressData.getIsCompleted());
    }
    
    /**
     * Обновляет существующий прогресс чтения по идентификатору.
     *
     * @param username имя пользователя
     * @param id идентификатор прогресса
     * @param progressData новые данные прогресса
     * @return объект DTO обновленного прогресса
     * @throws IllegalArgumentException если пользователь или прогресс не найден, или доступ запрещен
     */
    @CacheEvict(value = {"userProgress", "mangaProgress", "chapterProgress", "readingStats"}, key = "#username")
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
                        userService.incrementChapterCount(username);
                        publishChapterReadEvent(user.getId(), progress.getChapterId());
                        log.info("Reading progress completion via ID update user={} chapter={} award=completion", username, progress.getChapterId());
                }
        
        return convertToDTO(progress);
    }
    
    /**
     * Удаляет прогресс чтения по идентификатору.
     *
     * @param username имя пользователя
     * @param id идентификатор прогресса
     * @throws IllegalArgumentException если пользователь или прогресс не найден, или доступ запрещен
     */
    @CacheEvict(value = {"userProgress", "mangaProgress", "chapterProgress", "readingStats"}, key = "#username")
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
    
    /**
     * Получает статистику чтения пользователя.
     * Включает количество прочитанных глав, начатых манг и записей прогресса.
     *
     * @param username имя пользователя
     * @return карта со статистикой чтения
     * @throws IllegalArgumentException если пользователь не найден
     */
    @Cacheable(value = "readingStats", key = "#username")
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
        stats.put("chaptersRead", actualCompletedChapters);
        stats.put("mangasStarted", mangasStarted);
        stats.put("totalProgressEntries", totalProgressEntries);
        
        return stats;
    }

    /**
     * Публичный метод: получает весь прогресс чтения пользователя по его userId.
     * Используется публичным контроллером, не требует аутентификации по username.
     *
     * @param userId идентификатор пользователя
     * @return список DTO прогресса чтения
     * @throws IllegalArgumentException если пользователь не найден
     */
    public List<ReadingProgressDTO> getUserProgressById(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        List<ReadingProgress> progressList = readingProgressRepository.findByUserId(userId);
        return progressList.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Публичный метод: получает прогресс чтения конкретной манги у пользователя по userId.
     * Используется публичным контроллером.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return список DTO прогресса чтения для манги
     * @throws IllegalArgumentException если пользователь не найден
     */
    public List<ReadingProgressDTO> getMangaProgressByUserId(Long userId, Long mangaId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("User not found");
        }

        List<ReadingProgress> progressList = readingProgressRepository.findByUserIdAndMangaId(userId, mangaId);
        return progressList.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
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
