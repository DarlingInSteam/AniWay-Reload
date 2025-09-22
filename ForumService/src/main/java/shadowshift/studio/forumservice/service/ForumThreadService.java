package shadowshift.studio.forumservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.forumservice.dto.request.CreateThreadRequest;
import shadowshift.studio.forumservice.dto.request.UpdateThreadRequest;
import shadowshift.studio.forumservice.dto.response.ForumThreadResponse;
import shadowshift.studio.forumservice.entity.ForumReaction;
import shadowshift.studio.forumservice.entity.ForumThread;
import shadowshift.studio.forumservice.entity.ForumThreadView;
import shadowshift.studio.forumservice.repository.*;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ForumThreadService {

    private final ForumThreadRepository threadRepository;
    private final ForumCategoryRepository categoryRepository;
    private final ForumReactionRepository reactionRepository;
    private final ForumThreadViewRepository viewRepository;
    private final ForumSubscriptionRepository subscriptionRepository;
    private final UserDirectoryClient userDirectoryClient;

    /**
     * Получить темы в категории с пагинацией
     */
    @Transactional(readOnly = true)
    public Page<ForumThreadResponse> getThreadsByCategory(Long categoryId, Pageable pageable, Long currentUserId) {
        log.debug("Получение тем в категории: {}, страница: {}", categoryId, pageable.getPageNumber());
        
        Page<ForumThread> threadsPage = threadRepository.findByCategoryIdAndNotDeleted(categoryId, pageable);
        
        return threadsPage.map(thread -> mapToResponse(thread, currentUserId));
    }

    /**
     * Получить все темы с пагинацией
     */
    @Transactional(readOnly = true)
    public Page<ForumThreadResponse> getAllThreads(Pageable pageable, Long currentUserId) {
        log.debug("Получение всех тем, страница: {}", pageable.getPageNumber());
        
        Page<ForumThread> threadsPage = threadRepository.findAllNotDeleted(pageable);
        
        return threadsPage.map(thread -> mapToResponse(thread, currentUserId));
    }

    /**
     * Получить тему по ID (не readOnly, т.к. регистрируем просмотр)
     */
    public ForumThreadResponse getThreadById(Long threadId, Long currentUserId, String userIp) {
        log.debug("Получение темы по ID: {}", threadId);
        
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена: " + threadId));
        
        // Регистрируем просмотр
        registerView(threadId, currentUserId, userIp);
        
        return mapToResponse(thread, currentUserId);
    }

    /**
     * Создать новую тему
     */
    @Transactional
    public ForumThreadResponse createThread(CreateThreadRequest request, Long authorId) {
        log.info("Создание новой темы пользователем: {}", authorId);
        
        // Проверяем существование категории
        if (!categoryRepository.existsById(request.getCategoryId())) {
            throw new RuntimeException("Категория не найдена: " + request.getCategoryId());
        }
        
        ForumThread thread = ForumThread.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .categoryId(request.getCategoryId())
                .authorId(authorId)
                .mangaId(request.getMangaId())
                .build();
        
        ForumThread savedThread = threadRepository.save(thread);
        log.info("Тема создана с ID: {}", savedThread.getId());
        
        return mapToResponse(savedThread, authorId);
    }

    /**
     * Обновить тему
     */
    @Transactional
    public ForumThreadResponse updateThread(Long threadId, UpdateThreadRequest request, Long currentUserId) {
        log.info("Обновление темы ID: {} пользователем: {}", threadId, currentUserId);
        
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена: " + threadId));
        
        // Проверяем права доступа (автор или модератор)
        if (!thread.getAuthorId().equals(currentUserId)) {
            // TODO: добавить проверку роли модератора
            throw new RuntimeException("Нет прав для редактирования темы");
        }
        
        thread.setTitle(request.getTitle());
        thread.setContent(request.getContent());
        thread.setIsEdited(true);
        
        ForumThread updatedThread = threadRepository.save(thread);
        log.info("Тема обновлена: {}", updatedThread.getId());
        
        return mapToResponse(updatedThread, currentUserId);
    }

    /**
     * Удалить тему (мягкое удаление)
     */
    @Transactional
    public void deleteThread(Long threadId, Long currentUserId) {
        log.info("Удаление темы ID: {} пользователем: {}", threadId, currentUserId);
        
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена: " + threadId));
        
        // Проверяем права доступа (автор или модератор)
        if (!thread.getAuthorId().equals(currentUserId)) {
            // TODO: добавить проверку роли модератора
            throw new RuntimeException("Нет прав для удаления темы");
        }
        
        thread.setIsDeleted(true);
        threadRepository.save(thread);
        
        log.info("Тема удалена: {}", threadId);
    }

    /**
     * Закрепить/открепить тему
     */
    @Transactional
    public ForumThreadResponse pinThread(Long threadId, boolean pinned, Long currentUserId) {
        log.info("Изменение закрепления темы ID: {} на: {} пользователем: {}", threadId, pinned, currentUserId);
        
        // TODO: проверить права модератора
        
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена: " + threadId));
        
        thread.setIsPinned(pinned);
        ForumThread updatedThread = threadRepository.save(thread);
        
        log.info("Закрепление темы изменено: {} -> {}", threadId, pinned);
        
        return mapToResponse(updatedThread, currentUserId);
    }

    /**
     * Заблокировать/разблокировать тему
     */
    @Transactional
    public ForumThreadResponse lockThread(Long threadId, boolean locked, Long currentUserId) {
        log.info("Изменение блокировки темы ID: {} на: {} пользователем: {}", threadId, locked, currentUserId);
        
        // TODO: проверить права модератора
        
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена: " + threadId));
        
        thread.setIsLocked(locked);
        ForumThread updatedThread = threadRepository.save(thread);
        
        log.info("Блокировка темы изменена: {} -> {}", threadId, locked);
        
        return mapToResponse(updatedThread, currentUserId);
    }

    /**
     * Поиск тем
     */
    @Transactional(readOnly = true)
    public Page<ForumThreadResponse> searchThreads(String query, Pageable pageable, Long currentUserId) {
        log.debug("Поиск тем по запросу: {}", query);
        
        // Преобразуем запрос для PostgreSQL полнотекстового поиска
        String searchQuery = query.trim().replaceAll("\\s+", " & ");
        
        Page<ForumThread> threadsPage = threadRepository.searchByText(searchQuery, pageable);
        
        return threadsPage.map(thread -> mapToResponse(thread, currentUserId));
    }

    /**
     * Получить темы автора
     */
    @Transactional(readOnly = true)
    public Page<ForumThreadResponse> getThreadsByAuthor(Long authorId, Pageable pageable, Long currentUserId) {
        log.debug("Получение тем автора: {}", authorId);
        
        Page<ForumThread> threadsPage = threadRepository.findByAuthorIdAndNotDeleted(authorId, pageable);
        
        return threadsPage.map(thread -> mapToResponse(thread, currentUserId));
    }

    /**
     * Зарегистрировать просмотр темы
     */
    @Transactional
    public void registerView(Long threadId, Long userId, String ipAddress) {
        // Проверяем, не просматривал ли пользователь эту тему уже
        boolean alreadyViewed = false;
        
        if (userId != null) {
            alreadyViewed = viewRepository.existsByThreadIdAndUserId(threadId, userId);
        } else if (ipAddress != null) {
            alreadyViewed = viewRepository.existsByThreadIdAndIpAddress(threadId, ipAddress);
        }
        
        if (!alreadyViewed) {
            ForumThreadView view = ForumThreadView.builder()
                    .threadId(threadId)
                    .userId(userId)
                    .ipAddress(ipAddress)
                    .build();
            
            viewRepository.save(view);
            
            // Увеличиваем счетчик просмотров
            threadRepository.incrementViewsCount(threadId);
            
            log.debug("Зарегистрирован просмотр темы: {} пользователем: {}", threadId, userId);
        }
    }

    /**
     * Преобразование в DTO
     */
    private ForumThreadResponse mapToResponse(ForumThread thread, Long currentUserId) {
        // Получаем реакцию пользователя
        String userReaction = null;
        if (currentUserId != null) {
            Optional<ForumReaction> reaction = reactionRepository.findByUserIdAndTargetTypeAndTargetId(
                    currentUserId, ForumReaction.TargetType.THREAD, thread.getId());
            userReaction = reaction.map(r -> r.getReactionType().name()).orElse(null);
        }
        
        // Проверяем подписку
        Boolean isSubscribed = false;
        if (currentUserId != null) {
            isSubscribed = subscriptionRepository.isUserSubscribedToThread(currentUserId, thread.getId());
        }
        
        // Получаем информацию о категории
        String categoryName = categoryRepository.findById(thread.getCategoryId())
                .map(category -> category.getName())
                .orElse("Неизвестная категория");
        
    // Автор: пытаемся обогатить через UserDirectoryClient (кеширует)
    String authorName = "Пользователь " + thread.getAuthorId();
    String authorAvatar = null;
    try {
        Map<Long, UserDirectoryClient.UserBasic> users = userDirectoryClient.fetchUsers(Collections.singleton(thread.getAuthorId()));
        UserDirectoryClient.UserBasic ub = users.get(thread.getAuthorId());
        if (ub != null) {
            if (ub.displayName() != null && !ub.displayName().isBlank()) authorName = ub.displayName();
            else if (ub.username() != null) authorName = ub.username();
            authorAvatar = ub.avatar();
        }
    } catch (Exception e) {
        log.debug("Не удалось получить данные автора {}: {}", thread.getAuthorId(), e.getMessage());
    }
    // Редактирование разрешено автору в течение 7 дней
    boolean isAuthor = currentUserId != null && currentUserId.equals(thread.getAuthorId());
    boolean withinEditWindow = Duration.between(thread.getCreatedAt(), LocalDateTime.now()).toDays() < 7;

    return ForumThreadResponse.builder()
                .id(thread.getId())
                .title(thread.getTitle())
                .content(thread.getContent())
                .categoryId(thread.getCategoryId())
                .categoryName(categoryName)
        .authorId(thread.getAuthorId())
    .authorName(authorName)
    .authorAvatar(authorAvatar)
                .viewsCount(thread.getViewsCount())
                .repliesCount(thread.getRepliesCount())
                .likesCount(thread.getLikesCount())
                .isPinned(thread.getIsPinned())
                .isLocked(thread.getIsLocked())
                .isDeleted(thread.getIsDeleted())
                .isEdited(thread.getIsEdited())
                .mangaId(thread.getMangaId())
                // TODO: получить информацию о манге из MangaService
                .createdAt(thread.getCreatedAt())
                .updatedAt(thread.getUpdatedAt())
                .lastActivityAt(thread.getLastActivityAt())
                .lastReplyAt(thread.getLastReplyAt())
                .lastReplyUserId(thread.getLastReplyUserId())
                // TODO: получить имя последнего отвечавшего из AuthService
                .isSubscribed(isSubscribed)
        .userReaction(userReaction)
        .canEdit(isAuthor && withinEditWindow)
        .canDelete(isAuthor)
                .build();
    }
}