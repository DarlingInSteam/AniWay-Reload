package shadowshift.studio.messageservice.service;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import shadowshift.studio.messageservice.dto.ConversationView;
import shadowshift.studio.messageservice.dto.MarkConversationReadRequest;
import shadowshift.studio.messageservice.dto.MessagePageView;
import shadowshift.studio.messageservice.dto.MessageView;
import shadowshift.studio.messageservice.dto.SendMessageRequest;
import shadowshift.studio.messageservice.exception.InvalidConversationParticipantsException;
import shadowshift.studio.messageservice.notification.NotificationPublisher;
import shadowshift.studio.messageservice.repository.ConversationRepository;
import shadowshift.studio.messageservice.repository.MessageRepository;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@SpringBootTest
@ActiveProfiles("test")
class MessagingServiceTest {

    @Autowired
    private MessagingService messagingService;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @MockBean
    private NotificationPublisher notificationPublisher;

    @Test
    void createPrivateConversationShouldBeIdempotent() {
        ConversationView first = messagingService.createOrGetPrivateConversation(1L, 2L);
        ConversationView second = messagingService.createOrGetPrivateConversation(1L, 2L);

        assertThat(first.id()).isEqualTo(second.id());
        assertThat(conversationRepository.findById(first.id())).isPresent();
        assertThat(conversationRepository.findById(first.id()).orElseThrow().getParticipants()).hasSize(2);
    }

    @Test
    void createConversationShouldValidateParticipants() {
        assertThatThrownBy(() -> messagingService.createOrGetPrivateConversation(1L, 1L))
                .isInstanceOf(InvalidConversationParticipantsException.class);
    }

    @Test
    void sendMessageShouldPersistAndNotify() {
        ConversationView conversation = messagingService.createOrGetPrivateConversation(10L, 20L);
        MessageView sent = messagingService.sendMessage(10L, conversation.id(), new SendMessageRequest(" Hello there ", null));

        assertThat(sent.content()).isEqualTo("Hello there");
        assertThat(messageRepository.findById(sent.id())).isPresent();

        ArgumentCaptor<String> previewCaptor = ArgumentCaptor.forClass(String.class);
        verify(notificationPublisher, times(1)).publishDirectMessage(eq(20L), eq(conversation.id()), eq(sent.id()), previewCaptor.capture());
        assertThat(previewCaptor.getValue()).isEqualTo("Hello there");
    }

    @Test
    void gettingMessagesShouldSupportPagination() {
        ConversationView conversation = messagingService.createOrGetPrivateConversation(111L, 222L);
        for (int i = 0; i < 55; i++) {
            messagingService.sendMessage(111L, conversation.id(), new SendMessageRequest("msg-" + i, null));
        }

        MessagePageView firstPage = messagingService.getMessages(111L, conversation.id(), null, null, 20);
        assertThat(firstPage.messages()).hasSize(20);
        assertThat(firstPage.hasMore()).isTrue();
        UUID firstCursor = firstPage.nextCursor();
        assertThat(firstCursor).isNotNull();
        UUID lastKnownMessageId = firstPage.messages().get(firstPage.messages().size() - 1).id();

        MessagePageView secondPage = messagingService.getMessages(111L, conversation.id(), firstCursor, null, 20);
        assertThat(secondPage.messages()).hasSize(20);
        assertThat(secondPage.hasMore()).isTrue();
        UUID secondCursor = secondPage.nextCursor();
        assertThat(secondCursor).isNotNull();

        MessagePageView thirdPage = messagingService.getMessages(111L, conversation.id(), secondCursor, null, 20);
        assertThat(thirdPage.messages()).hasSize(15);
        assertThat(thirdPage.hasMore()).isFalse();
        assertThat(thirdPage.nextCursor()).isNull();

        messagingService.sendMessage(222L, conversation.id(), new SendMessageRequest("latest", null));
        MessagePageView updates = messagingService.getMessages(111L, conversation.id(), null, lastKnownMessageId, 10);
        assertThat(updates.messages()).hasSize(1);
        assertThat(updates.hasMore()).isFalse();
    }

    @Test
    void markConversationReadShouldReduceUnreadCount() {
        ConversationView conversation = messagingService.createOrGetPrivateConversation(5L, 6L);
        messagingService.sendMessage(6L, conversation.id(), new SendMessageRequest("hi", null));
        messagingService.sendMessage(6L, conversation.id(), new SendMessageRequest("hi again", null));

        List<ConversationView> before = messagingService.listConversations(5L, 0, 10);
        assertThat(before).hasSize(1);
        assertThat(before.get(0).unreadCount()).isEqualTo(2);

        MessagePageView page = messagingService.getMessages(5L, conversation.id(), null, null, 10);
        UUID lastMessageId = page.messages().get(page.messages().size() - 1).id();
        messagingService.markConversationRead(5L, conversation.id(), new MarkConversationReadRequest(lastMessageId));

        List<ConversationView> after = messagingService.listConversations(5L, 0, 10);
        assertThat(after.get(0).unreadCount()).isEqualTo(0);
    }

    @Test
    void getDirectUnreadCountShouldExcludeOwnMessages() {
        ConversationView conversation = messagingService.createOrGetPrivateConversation(7L, 8L);
        messagingService.sendMessage(7L, conversation.id(), new SendMessageRequest("Первое сообщение", null));
        long afterOwnMessage = messagingService.getDirectUnreadCount(7L);
        assertThat(afterOwnMessage).isZero();

        messagingService.sendMessage(8L, conversation.id(), new SendMessageRequest("Ответ", null));

        long unread = messagingService.getDirectUnreadCount(7L);
        assertThat(unread).isEqualTo(1);

        MessagePageView page = messagingService.getMessages(7L, conversation.id(), null, null, 10);
        UUID lastMessageId = page.messages().get(page.messages().size() - 1).id();
        messagingService.markConversationRead(7L, conversation.id(), new MarkConversationReadRequest(lastMessageId));

        assertThat(messagingService.getDirectUnreadCount(7L)).isZero();
    }
}
