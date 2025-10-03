package shadowshift.studio.messageservice.mapper;

import org.springframework.stereotype.Component;
import shadowshift.studio.messageservice.dto.CategoryView;
import shadowshift.studio.messageservice.dto.ConversationView;
import shadowshift.studio.messageservice.dto.MessageView;
import shadowshift.studio.messageservice.entity.ChatCategoryEntity;
import shadowshift.studio.messageservice.entity.ConversationEntity;
import shadowshift.studio.messageservice.entity.ConversationParticipantEntity;
import shadowshift.studio.messageservice.entity.MessageEntity;

import java.util.Comparator;
import java.util.List;

@Component
public class MessageMapper {

    public MessageView toMessageView(MessageEntity entity) {
        if (entity == null) {
            return null;
        }
        return new MessageView(
                entity.getId(),
                entity.getSenderId(),
                entity.getContent(),
                entity.getReplyToMessage() != null ? entity.getReplyToMessage().getId() : null,
                entity.getCreatedAt(),
                entity.getEditedAt()
        );
    }

    public ConversationView toConversationView(ConversationEntity conversation,
                                               long unreadCount,
                                               MessageEntity lastMessage) {
        ChatCategoryEntity category = conversation.getCategory();
        List<Long> participantIds = conversation.getParticipants().stream()
                .map(ConversationParticipantEntity::getUserId)
                .sorted(Comparator.naturalOrder())
                .toList();

        return new ConversationView(
                conversation.getId(),
                conversation.getType(),
                category != null ? category.getId() : null,
                category != null ? category.getTitle() : null,
                participantIds,
                lastMessage != null ? toMessageView(lastMessage) : null,
                unreadCount,
                conversation.getCreatedAt(),
                conversation.getLastMessageAt()
        );
    }

    public CategoryView toCategoryView(ChatCategoryEntity category, long unreadCount) {
        return new CategoryView(
                category.getId(),
                category.getSlug(),
                category.getTitle(),
                category.getDescription(),
                category.isDefault(),
                category.isArchived(),
                unreadCount
        );
    }
}
