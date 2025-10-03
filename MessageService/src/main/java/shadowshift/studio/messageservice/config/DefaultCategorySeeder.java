package shadowshift.studio.messageservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.messageservice.entity.ChatCategoryEntity;
import shadowshift.studio.messageservice.entity.ConversationEntity;
import shadowshift.studio.messageservice.model.ConversationType;
import shadowshift.studio.messageservice.repository.ChatCategoryRepository;
import shadowshift.studio.messageservice.repository.ConversationRepository;

import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
public class DefaultCategorySeeder implements CommandLineRunner {

    private static final String DEFAULT_TITLE = "Общие";
    private static final String DEFAULT_SLUG = "obshchie";
    private static final String DEFAULT_DESCRIPTION = "Главный чат сообщества AniWay";

    private final ChatCategoryRepository chatCategoryRepository;
    private final ConversationRepository conversationRepository;

    @Override
    @Transactional
    public void run(String... args) {
        ChatCategoryEntity category = chatCategoryRepository.findBySlugIgnoreCase(DEFAULT_SLUG)
                .orElseGet(() -> chatCategoryRepository.save(ChatCategoryEntity.builder()
                        .title(DEFAULT_TITLE)
                        .slug(DEFAULT_SLUG)
                        .description(DEFAULT_DESCRIPTION)
                        .isDefault(true)
                        .isArchived(false)
                        .build()));

        if (!category.isDefault()) {
            category.setDefault(true);
            category.setArchived(false);
            chatCategoryRepository.save(category);
        }

        ensureSingleDefault(category.getId());
        ensureConversation(category);
    }

    private void ensureSingleDefault(Long defaultCategoryId) {
        List<ChatCategoryEntity> categories = chatCategoryRepository.findAll();
        boolean updated = false;
        for (ChatCategoryEntity category : categories) {
            if (!Objects.equals(category.getId(), defaultCategoryId) && category.isDefault()) {
                category.setDefault(false);
                updated = true;
            }
        }
        if (updated) {
            chatCategoryRepository.saveAll(categories);
        }
    }

    private void ensureConversation(ChatCategoryEntity category) {
        conversationRepository.findByCategoryId(category.getId())
                .orElseGet(() -> conversationRepository.save(ConversationEntity.builder()
                        .category(category)
                        .type(ConversationType.CHANNEL)
                        .build()));
    }
}
