package shadowshift.studio.messageservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import shadowshift.studio.messageservice.dto.InboxSummaryView;
import shadowshift.studio.messageservice.dto.SendChannelMessageRequest;
import shadowshift.studio.messageservice.dto.SendMessageRequest;
import shadowshift.studio.messageservice.dto.ConversationView;
import shadowshift.studio.messageservice.integration.FriendServiceClient;
import shadowshift.studio.messageservice.notification.NotificationPublisher;
import shadowshift.studio.messageservice.repository.ChatCategoryRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class InboxServiceTest {

    @Autowired
    private InboxService inboxService;

    @Autowired
    private MessagingService messagingService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private ChatCategoryRepository chatCategoryRepository;

    @MockBean
    private NotificationPublisher notificationPublisher;

    @MockBean
    private FriendServiceClient friendServiceClient;

    private Long defaultCategoryId;

    @BeforeEach
    void init() {
        defaultCategoryId = chatCategoryRepository.findBySlugIgnoreCase("obshchie")
                .orElseThrow(() -> new IllegalStateException("Default category missing"))
                .getId();
    }

    @Test
    void summaryShouldCombineDirectChannelAndFriendCounts() {
        when(friendServiceClient.fetchIncomingPending(1L, "USER")).thenReturn(5L);

        ConversationView conversation = messagingService.createOrGetPrivateConversation(2L, 1L);
        messagingService.sendMessage(2L, conversation.id(), new SendMessageRequest("Привет!", null));

        categoryService.sendMessage(3L, defaultCategoryId, new SendChannelMessageRequest("Дискуссия", null));

        InboxSummaryView summary = inboxService.getSummary(1L, "USER");
        assertThat(summary.directUnread()).isEqualTo(1);
        assertThat(summary.channelUnread()).isEqualTo(1);
        assertThat(summary.pendingFriendRequests()).isEqualTo(5);
    }

    @Test
    void summaryForAnonymousUserShouldReturnZeros() {
        InboxSummaryView summary = inboxService.getSummary(null, null);
        assertThat(summary.directUnread()).isZero();
        assertThat(summary.channelUnread()).isZero();
        assertThat(summary.pendingFriendRequests()).isZero();
    }
}
