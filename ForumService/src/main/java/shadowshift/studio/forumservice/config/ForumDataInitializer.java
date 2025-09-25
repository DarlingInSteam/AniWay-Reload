package shadowshift.studio.forumservice.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.forumservice.entity.ForumCategory;
import shadowshift.studio.forumservice.repository.ForumCategoryRepository;

@Component
@RequiredArgsConstructor
@Slf4j
public class ForumDataInitializer {

    private final ForumCategoryRepository categoryRepository;

    @PostConstruct
    @Transactional
    public void ensureNewsCategory() {
        String newsName = "Новости";
        if (!categoryRepository.existsByNameIgnoreCase(newsName)) {
            ForumCategory category = ForumCategory.builder()
                    .name(newsName)
                    .description("Официальные новости и объявления")
                    .displayOrder(0)
                    .isActive(true)
                    .build();
            categoryRepository.save(category);
            log.info("Создана категория '{}'(ID={})", newsName, category.getId());
        }
    }
}
