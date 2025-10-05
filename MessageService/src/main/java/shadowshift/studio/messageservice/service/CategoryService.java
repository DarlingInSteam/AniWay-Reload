package shadowshift.studio.messageservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.messageservice.dto.CategoryView;
import shadowshift.studio.messageservice.dto.MarkCategoryReadRequest;
import shadowshift.studio.messageservice.dto.MessagePageView;
import shadowshift.studio.messageservice.dto.MessageView;
import shadowshift.studio.messageservice.dto.SendChannelMessageRequest;
import shadowshift.studio.messageservice.dto.CreateCategoryRequest;
import shadowshift.studio.messageservice.dto.UpdateCategoryRequest;
import shadowshift.studio.messageservice.entity.ChannelReadMarkerEntity;
import shadowshift.studio.messageservice.entity.ChatCategoryEntity;
import shadowshift.studio.messageservice.entity.ConversationEntity;
import shadowshift.studio.messageservice.entity.MessageEntity;
import shadowshift.studio.messageservice.exception.CategoryAccessDeniedException;
import shadowshift.studio.messageservice.exception.CategoryArchivedException;
import shadowshift.studio.messageservice.exception.CategoryNotFoundException;
import shadowshift.studio.messageservice.exception.CategorySlugAlreadyExistsException;
import shadowshift.studio.messageservice.exception.MessageNotFoundException;
import shadowshift.studio.messageservice.mapper.MessageMapper;
import shadowshift.studio.messageservice.model.ConversationType;
import shadowshift.studio.messageservice.notification.NotificationPublisher;
import shadowshift.studio.messageservice.repository.ChannelReadMarkerRepository;
import shadowshift.studio.messageservice.repository.ChatCategoryRepository;
import shadowshift.studio.messageservice.repository.ConversationRepository;
import shadowshift.studio.messageservice.repository.MessageRepository;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private static final int DEFAULT_PAGE_SIZE = 50;
    private static final Pattern NON_ALPHANUM = Pattern.compile("[^a-z0-9]+");

    private final ChatCategoryRepository chatCategoryRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ChannelReadMarkerRepository channelReadMarkerRepository;
    private final MessageMapper mapper;
    private final NotificationPublisher notificationPublisher;

    @Transactional(readOnly = true)
    public List<CategoryView> listCategories(Long userId, boolean includeArchived) {
        List<ChatCategoryEntity> categories = includeArchived
                ? chatCategoryRepository.findAllByOrderByIsArchivedAscTitleAsc()
                : chatCategoryRepository.findAllByIsArchivedFalseOrderByIsDefaultDescTitleAsc();

        if (categories.isEmpty()) {
            return List.of();
        }

    Map<Long, ChannelReadMarkerEntity> markers = userId != null
        ? channelReadMarkerRepository.findByIdUserId(userId).stream()
            .collect(HashMap::new, (map, marker) -> map.put(marker.getId().getCategoryId(), marker), Map::putAll)
                : Collections.emptyMap();

        Map<Long, ConversationEntity> conversationsByCategory = loadCategoryConversations(categories);

        return categories.stream()
                .map(category -> mapper.toCategoryView(category,
                        userId != null ? computeUnread(category, conversationsByCategory.get(category.getId()), markers.get(category.getId()), userId) : 0))
                .toList();
    }

    public CategoryView createCategory(Long creatorId, CreateCategoryRequest request) {
        String slug = prepareSlug(request.slug(), request.title());
        ensureSlugUnique(slug);

        ChatCategoryEntity entity = ChatCategoryEntity.builder()
                .title(request.title().trim())
                .slug(slug)
                .description(request.description() != null ? request.description().trim() : null)
                .isDefault(Boolean.TRUE.equals(request.isDefault()))
                .isArchived(false)
                .createdBy(creatorId)
                .build();

        ChatCategoryEntity saved = chatCategoryRepository.save(entity);
        ensureCategoryConversation(saved);

        if (Boolean.TRUE.equals(request.isDefault())) {
            unsetOtherDefaults(saved.getId());
        }

        return mapper.toCategoryView(saved, 0);
    }

    public CategoryView updateCategory(Long categoryId, UpdateCategoryRequest request) {
        ChatCategoryEntity category = chatCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));

        if (request.title() != null && !request.title().isBlank()) {
            category.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            category.setDescription(request.description().isBlank() ? null : request.description().trim());
        }
        if (request.isArchived() != null) {
            category.setArchived(request.isArchived());
        }
        if (Boolean.TRUE.equals(request.isDefault())) {
            category.setDefault(true);
            unsetOtherDefaults(category.getId());
        } else if (Boolean.FALSE.equals(request.isDefault())) {
            category.setDefault(false);
        }

        ChatCategoryEntity saved = chatCategoryRepository.save(category);
        return mapper.toCategoryView(saved, 0);
    }

    @Transactional(readOnly = true)
    public MessagePageView getMessages(Long categoryId, UUID before, UUID after, Integer size) {
        ChatCategoryEntity category = fetchCategory(categoryId);
        ConversationEntity conversation = ensureCategoryConversation(category);
        int limit = size != null ? Math.min(Math.max(size, 1), 200) : DEFAULT_PAGE_SIZE;
        if (after != null) {
            return loadMessagesAfter(conversation, after, limit);
        }
        return loadMessagesBefore(conversation, before, limit);
    }

    public MessageView sendMessage(Long userId, Long categoryId, SendChannelMessageRequest request) {
        if (userId == null || userId <= 0) {
            throw new CategoryAccessDeniedException();
        }
        ChatCategoryEntity category = fetchCategory(categoryId);
        if (category.isArchived()) {
            throw new CategoryArchivedException(categoryId);
        }
        ConversationEntity conversation = ensureCategoryConversation(category);
        MessageEntity replyTo = null;
        if (request.replyToMessageId() != null) {
            replyTo = messageRepository.findByIdAndConversationId(request.replyToMessageId(), conversation.getId())
                    .orElseThrow(() -> new MessageNotFoundException(request.replyToMessageId()));
        }

        MessageEntity message = MessageEntity.builder()
                .conversation(conversation)
                .senderId(userId)
                .content(request.content().trim())
                .replyToMessage(replyTo)
                .build();

        MessageEntity saved = messageRepository.save(message);
        conversation.setLastMessageAt(saved.getCreatedAt());

        upsertReadMarker(category, userId, saved);

        if (replyTo != null && !Objects.equals(replyTo.getSenderId(), userId)) {
            notificationPublisher.publishChannelReply(replyTo.getSenderId(), category.getId(), saved.getId(), replyTo.getId());
        }

        return mapper.toMessageView(saved);
    }

    public void markCategoryRead(Long userId, Long categoryId, MarkCategoryReadRequest request) {
        if (userId == null || userId <= 0) {
            throw new CategoryAccessDeniedException();
        }
        ChatCategoryEntity category = fetchCategory(categoryId);
        ConversationEntity conversation = ensureCategoryConversation(category);
        MessageEntity message = messageRepository.findByIdAndConversationId(request.lastMessageId(), conversation.getId())
                .orElseThrow(() -> new MessageNotFoundException(request.lastMessageId()));

        upsertReadMarker(category, userId, message);
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> getUnreadMap(Long userId) {
        if (userId == null) {
            return Map.of();
        }
        List<ChatCategoryEntity> categories = chatCategoryRepository.findAllByIsArchivedFalseOrderByIsDefaultDescTitleAsc();
        if (categories.isEmpty()) {
            return Map.of();
        }
        Map<Long, ChannelReadMarkerEntity> markers = channelReadMarkerRepository.findByIdUserId(userId).stream()
                .collect(HashMap::new, (map, marker) -> map.put(marker.getId().getCategoryId(), marker), Map::putAll);
        Map<Long, ConversationEntity> conversations = loadCategoryConversations(categories);
        Map<Long, Long> result = new HashMap<>();
        for (ChatCategoryEntity category : categories) {
            long unread = computeUnread(category, conversations.get(category.getId()), markers.get(category.getId()), userId);
            result.put(category.getId(), unread);
        }
        return result;
    }

    private ChatCategoryEntity fetchCategory(Long categoryId) {
        return chatCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new CategoryNotFoundException(categoryId));
    }

    private void upsertReadMarker(ChatCategoryEntity category, Long userId, MessageEntity message) {
        ChannelReadMarkerEntity.ChannelReadMarkerId id = new ChannelReadMarkerEntity.ChannelReadMarkerId(category.getId(), userId);
        ChannelReadMarkerEntity marker = channelReadMarkerRepository.findById(id)
                .orElse(ChannelReadMarkerEntity.builder()
                        .id(id)
                        .category(category)
                        .build());
        marker.setLastReadAt(message.getCreatedAt());
        marker.setLastReadMessageId(message.getId());
        channelReadMarkerRepository.save(marker);
    }

    private Map<Long, ConversationEntity> loadCategoryConversations(List<ChatCategoryEntity> categories) {
        List<Long> ids = categories.stream().map(ChatCategoryEntity::getId).toList();
        List<ConversationEntity> conversations = ids.isEmpty() ? List.of()
                : conversationRepository.findAllByCategoryIds(ids);
        Map<Long, ConversationEntity> map = new HashMap<>();
        for (ConversationEntity conversation : conversations) {
            map.put(conversation.getCategory().getId(), conversation);
        }
        for (ChatCategoryEntity category : categories) {
            map.computeIfAbsent(category.getId(), id -> ensureCategoryConversation(category));
        }
        return map;
    }

    private ConversationEntity ensureCategoryConversation(ChatCategoryEntity category) {
        Optional<ConversationEntity> existing = conversationRepository.findByCategoryId(category.getId());
        if (existing.isPresent()) {
            return existing.get();
        }
        ConversationEntity conversation = ConversationEntity.builder()
                .category(category)
                .type(ConversationType.CHANNEL)
                .build();
        return conversationRepository.save(conversation);
    }

    private long computeUnread(ChatCategoryEntity category,
                               ConversationEntity conversation,
                               ChannelReadMarkerEntity marker,
                               Long userId) {
        if (conversation == null || userId == null) {
            return 0;
        }
        LocalDateTime lastRead = marker != null && marker.getLastReadAt() != null
                ? marker.getLastReadAt()
                : conversation.getCreatedAt();
        return messageRepository.countByConversationIdAndDeletedAtIsNullAndSenderIdNotAndCreatedAtAfter(
                conversation.getId(),
                userId,
                lastRead != null ? lastRead : conversation.getCreatedAt());
    }

    private void ensureSlugUnique(String slug) {
        chatCategoryRepository.findBySlugIgnoreCase(slug)
                .ifPresent(existing -> { throw new CategorySlugAlreadyExistsException(slug); });
    }

    private void unsetOtherDefaults(Long currentId) {
        List<ChatCategoryEntity> categories = chatCategoryRepository.findAll();
        for (ChatCategoryEntity category : categories) {
            if (!Objects.equals(category.getId(), currentId) && category.isDefault()) {
                category.setDefault(false);
            }
        }
        chatCategoryRepository.saveAll(categories);
    }

    private String prepareSlug(String requestedSlug, String title) {
        String base = (requestedSlug != null && !requestedSlug.isBlank()) ? requestedSlug : title;
        if (base == null || base.isBlank()) {
            base = "category";
        }
        String normalized = Normalizer.normalize(base, Normalizer.Form.NFD)
                .replace("№", "no")
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        normalized = NON_ALPHANUM.matcher(normalized).replaceAll("-").replaceAll("-+", "-");
        normalized = normalized.replaceAll("(^-|-$)", "");
        if (normalized.isBlank()) {
            normalized = "category";
        }
        String slug = normalized;
        int attempt = 1;
        while (chatCategoryRepository.findBySlugIgnoreCase(slug).isPresent()) {
            slug = normalized + "-" + attempt++;
        }
        return slug;
    }

    private MessagePageView loadMessagesBefore(ConversationEntity conversation, UUID before, int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MessageEntity> page;
        if (before != null) {
            MessageEntity cursor = messageRepository.findByIdAndConversationId(before, conversation.getId())
                    .orElseThrow(() -> new MessageNotFoundException(before));
            page = messageRepository.findMessagesBefore(conversation.getId(), cursor.getCreatedAt(), pageable);
        } else {
            page = messageRepository.findRecentMessages(conversation.getId(), pageable);
        }
        List<MessageEntity> content = new ArrayList<>(page.getContent());
        content.sort(Comparator.comparing(MessageEntity::getCreatedAt));
        List<MessageView> views = content.stream().map(mapper::toMessageView).toList();
        UUID nextCursor = page.hasNext() && !views.isEmpty() ? views.get(0).id() : null;
        return new MessagePageView(views, page.hasNext(), nextCursor);
    }

    private MessagePageView loadMessagesAfter(ConversationEntity conversation, UUID after, int limit) {
        MessageEntity cursor = messageRepository.findByIdAndConversationId(after, conversation.getId())
                .orElseThrow(() -> new MessageNotFoundException(after));
        Pageable pageable = PageRequest.of(0, limit + 1, Sort.by(Sort.Direction.ASC, "createdAt"));
        List<MessageEntity> messages = messageRepository.findMessagesAfter(conversation.getId(), cursor.getCreatedAt(), pageable);
        boolean hasMore = messages.size() > limit;
        if (hasMore) {
            messages = messages.subList(0, limit);
        }
        List<MessageView> views = messages.stream().map(mapper::toMessageView).toList();
        UUID nextCursor = hasMore && !views.isEmpty() ? views.get(views.size() - 1).id() : null;
        return new MessagePageView(views, hasMore, nextCursor);
    }
}
