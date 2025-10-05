package shadowshift.studio.messageservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import shadowshift.studio.messageservice.dto.CategoryView;
import shadowshift.studio.messageservice.dto.CreateCategoryRequest;
import shadowshift.studio.messageservice.dto.MarkCategoryReadRequest;
import shadowshift.studio.messageservice.dto.MessageView;
import shadowshift.studio.messageservice.dto.SendChannelMessageRequest;
import shadowshift.studio.messageservice.repository.ChatCategoryRepository;
import shadowshift.studio.messageservice.repository.ConversationRepository;
import shadowshift.studio.messageservice.notification.NotificationPublisher;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class CategoryServiceTest {

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private ChatCategoryRepository chatCategoryRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @MockBean
    private NotificationPublisher notificationPublisher;

    private Long defaultCategoryId;

    @BeforeEach
    void setup() {
        defaultCategoryId = chatCategoryRepository.findBySlugIgnoreCase("obshchie")
                .orElseThrow(() -> new IllegalStateException("Default category missing"))
                .getId();
    }

    @Test
    void createCategoryShouldGenerateSlugAndConversation() {
        CategoryView view = categoryService.createCategory(99L,
                new CreateCategoryRequest("Новости", null, "Последние обновления", false));

        assertThat(view.id()).isNotNull();
        assertThat(view.slug()).isNotBlank();
        assertThat(conversationRepository.findByCategoryId(view.id())).isPresent();
    }

    @Test
    void sendAndReadMessagesShouldUpdateUnreadCounts() {
        MessageView sentByOther = categoryService.sendMessage(200L, defaultCategoryId,
                new SendChannelMessageRequest("Добро пожаловать!", null));

        List<CategoryView> receiverView = categoryService.listCategories(300L, false);
        long unreadBefore = receiverView.stream()
                .filter(view -> view.id().equals(defaultCategoryId))
                .findFirst()
                .orElseThrow()
                .unreadCount();
        assertThat(unreadBefore).isEqualTo(1);

        List<CategoryView> senderView = categoryService.listCategories(200L, false);
        long senderUnread = senderView.stream()
                .filter(view -> view.id().equals(defaultCategoryId))
                .findFirst()
                .orElseThrow()
                .unreadCount();
        assertThat(senderUnread).isZero();

        categoryService.markCategoryRead(300L, defaultCategoryId, new MarkCategoryReadRequest(sentByOther.id()));
        long unreadAfter = categoryService.listCategories(300L, false).stream()
                .filter(view -> view.id().equals(defaultCategoryId))
                .findFirst()
                .orElseThrow()
                .unreadCount();
        assertThat(unreadAfter).isZero();
    }
}
