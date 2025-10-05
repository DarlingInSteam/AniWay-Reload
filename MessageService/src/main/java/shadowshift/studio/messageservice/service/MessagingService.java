package shadowshift.studio.messageservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.messageservice.dto.ConversationView;
import shadowshift.studio.messageservice.dto.MarkConversationReadRequest;
import shadowshift.studio.messageservice.dto.MessagePageView;
import shadowshift.studio.messageservice.dto.MessageView;
import shadowshift.studio.messageservice.dto.SendMessageRequest;
import shadowshift.studio.messageservice.entity.ConversationEntity;
import shadowshift.studio.messageservice.entity.ConversationParticipantEntity;
import shadowshift.studio.messageservice.entity.MessageEntity;
import shadowshift.studio.messageservice.exception.ConversationAccessDeniedException;
import shadowshift.studio.messageservice.exception.ConversationNotFoundException;
import shadowshift.studio.messageservice.exception.InvalidConversationParticipantsException;
import shadowshift.studio.messageservice.exception.MessageNotFoundException;
import shadowshift.studio.messageservice.mapper.MessageMapper;
import shadowshift.studio.messageservice.model.ConversationType;
import shadowshift.studio.messageservice.notification.NotificationPublisher;
import shadowshift.studio.messageservice.repository.ConversationParticipantRepository;
import shadowshift.studio.messageservice.repository.ConversationRepository;
import shadowshift.studio.messageservice.repository.MessageRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MessagingService {

    private static final int DEFAULT_PAGE_SIZE = 50;

    private final ConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageRepository messageRepository;
    private final MessageMapper mapper;
    private final NotificationPublisher notificationPublisher;

    public ConversationView createOrGetPrivateConversation(Long requesterId, Long targetUserId) {
        validateParticipants(requesterId, targetUserId);

        return conversationRepository.findPrivateConversationBetween(requesterId, targetUserId)
                .map(conversation -> mapConversation(conversation, requesterId))
                .orElseGet(() -> mapConversation(createConversation(requesterId, targetUserId), requesterId));
    }

    @Transactional(readOnly = true)
    public List<ConversationView> listConversations(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1),
                Sort.by(Sort.Order.desc("lastMessageAt"), Sort.Order.desc("createdAt")));
        Page<ConversationEntity> result = conversationRepository.findAllByParticipant(userId, pageable);
        return result.getContent().stream()
                .sorted(Comparator.comparing(ConversationEntity::getLastMessageAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(conversation -> mapConversation(conversation, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public long getDirectUnreadCount(Long userId) {
        return conversationRepository.findAllByParticipant(userId).stream()
                .mapToLong(conversation -> computeUnread(conversation, resolveParticipant(conversation, userId)))
                .sum();
    }

    @Transactional(readOnly = true)
    public MessagePageView getMessages(Long userId,
                                       UUID conversationId,
                                       UUID before,
                                       UUID after,
                                       Integer size) {
        ConversationEntity conversation = requireConversationForUser(conversationId, userId);
        int limit = size != null ? Math.min(Math.max(size, 1), 200) : DEFAULT_PAGE_SIZE;

        if (after != null) {
            return loadMessagesAfter(conversation, after, limit);
        }
        return loadMessagesBefore(conversation, before, limit);
    }

    public MessageView sendMessage(Long userId,
                                   UUID conversationId,
                                   SendMessageRequest request) {
        ConversationEntity conversation = requireConversationForUser(conversationId, userId);
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

        List<ConversationParticipantEntity> participants = new ArrayList<>(conversation.getParticipants());
        participants.stream()
                .filter(participant -> Objects.equals(participant.getUserId(), userId))
                .findFirst()
                .ifPresent(participant -> {
                    participant.setLastReadAt(saved.getCreatedAt());
                    participant.setLastReadMessageId(saved.getId());
                    participantRepository.save(participant);
                });

        participants.stream()
                .filter(participant -> !Objects.equals(participant.getUserId(), userId))
                .forEach(participant -> notificationPublisher.publishDirectMessage(
                        participant.getUserId(),
                        conversation.getId(),
                        saved.getId(),
                        saved.getContent().length() > 140 ? saved.getContent().substring(0, 140) + "…" : saved.getContent()
                ));

        if (replyTo != null) {
                        Long replyToAuthorId = replyTo.getSenderId();
            if (!Objects.equals(replyToAuthorId, userId)) {
                notificationPublisher.publishDirectReply(replyToAuthorId,
                        conversation.getId(),
                        saved.getId(),
                        replyTo.getId());
            }
        }

        return mapper.toMessageView(saved);
    }

    public void markConversationRead(Long userId, UUID conversationId, MarkConversationReadRequest request) {
        ConversationEntity conversation = requireConversationForUser(conversationId, userId);
        ConversationParticipantEntity participant = conversation.getParticipants().stream()
                .filter(p -> Objects.equals(p.getUserId(), userId))
                .findFirst()
                .orElseThrow(() -> new ConversationAccessDeniedException(conversationId));

        MessageEntity message = messageRepository.findByIdAndConversationId(request.lastMessageId(), conversation.getId())
                .orElseThrow(() -> new MessageNotFoundException(request.lastMessageId()));

        participant.setLastReadAt(message.getCreatedAt());
        participant.setLastReadMessageId(message.getId());
        participantRepository.save(participant);
    }

    private ConversationEntity createConversation(Long requesterId, Long targetUserId) {
        ConversationEntity conversation = ConversationEntity.builder()
                .type(ConversationType.PRIVATE)
                .build();

        ConversationParticipantEntity requester = ConversationParticipantEntity.builder()
                .conversation(conversation)
                .userId(requesterId)
                .build();
        ConversationParticipantEntity target = ConversationParticipantEntity.builder()
                .conversation(conversation)
                .userId(targetUserId)
                .build();

        conversation.getParticipants().add(requester);
        conversation.getParticipants().add(target);

        return conversationRepository.save(conversation);
    }

    private ConversationView mapConversation(ConversationEntity conversation, Long userId) {
        ConversationParticipantEntity participant = resolveParticipant(conversation, userId);
        long unread = computeUnread(conversation, participant);
        MessageEntity lastMessage = messageRepository.findRecentMessages(conversation.getId(),
                PageRequest.of(0, 1)).getContent().stream().findFirst().orElse(null);

        return mapper.toConversationView(conversation, unread, lastMessage);
    }

    private ConversationParticipantEntity resolveParticipant(ConversationEntity conversation, Long userId) {
        return conversation.getParticipants().stream()
                .filter(p -> Objects.equals(p.getUserId(), userId))
                .findFirst()
                .orElseThrow(() -> new ConversationAccessDeniedException(conversation.getId()));
    }

    private long computeUnread(ConversationEntity conversation, ConversationParticipantEntity participant) {
        LocalDateTime lastRead = participant.getLastReadAt() != null
                ? participant.getLastReadAt()
                : participant.getJoinedAt();
        return messageRepository.countByConversationIdAndDeletedAtIsNullAndSenderIdNotAndCreatedAtAfter(
                conversation.getId(),
                participant.getUserId(),
                lastRead);
    }

    private ConversationEntity requireConversationForUser(UUID conversationId, Long userId) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ConversationNotFoundException(conversationId));
        boolean participant = conversation.getParticipants().stream()
                .anyMatch(p -> Objects.equals(p.getUserId(), userId));
        if (!participant) {
            throw new ConversationAccessDeniedException(conversationId);
        }
        return conversation;
    }

                private MessagePageView loadMessagesBefore(ConversationEntity conversation, UUID before, int limit) {
        UUID conversationId = conversation.getId();
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<MessageEntity> page;
        if (before != null) {
            MessageEntity cursor = messageRepository.findByIdAndConversationId(before, conversationId)
                    .orElseThrow(() -> new MessageNotFoundException(before));
            page = messageRepository.findMessagesBefore(conversationId, cursor.getCreatedAt(), pageable);
        } else {
            page = messageRepository.findRecentMessages(conversationId, pageable);
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

    private void validateParticipants(Long requesterId, Long targetUserId) {
        if (Objects.equals(requesterId, targetUserId)) {
            throw new InvalidConversationParticipantsException("Нельзя начать диалог с самим собой");
        }
        if (requesterId == null || requesterId <= 0 || targetUserId == null || targetUserId <= 0) {
            throw new InvalidConversationParticipantsException("Некорректные участники диалога");
        }
    }
}
