package shadowshift.studio.forumservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.forumservice.dto.request.CreateCategoryRequest;
import shadowshift.studio.forumservice.dto.response.ForumCategoryResponse;
import shadowshift.studio.forumservice.entity.ForumCategory;
import shadowshift.studio.forumservice.repository.ForumCategoryRepository;
import shadowshift.studio.forumservice.repository.ForumThreadRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ForumCategoryService {

    private final ForumCategoryRepository categoryRepository;
    private final ForumThreadRepository threadRepository;

    /**
     * Получить все активные категории
     */
    @Cacheable("forum_categories")
    public List<ForumCategoryResponse> getAllActiveCategories() {
        log.debug("Получение всех активных категорий форума");
        
        List<ForumCategory> categories = categoryRepository.findAllActiveOrderByDisplayOrder();
        
        return categories.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Получить категории с пагинацией
     */
    public Page<ForumCategoryResponse> getCategories(Boolean isActive, Pageable pageable) {
        log.debug("Получение категорий с пагинацией: active={}, page={}", isActive, pageable.getPageNumber());
        
        Page<ForumCategory> categoriesPage = categoryRepository.findByIsActiveOrderByDisplayOrderAsc(isActive, pageable);
        
        return categoriesPage.map(this::mapToResponse);
    }

    /**
     * Получить категорию по ID
     */
    public ForumCategoryResponse getCategoryById(Long categoryId) {
        log.debug("Получение категории по ID: {}", categoryId);
        
        ForumCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Категория не найдена: " + categoryId));
        
        return mapToResponseWithStats(category);
    }

    /**
     * Создать новую категорию
     */
    @Transactional
    @CacheEvict(value = "forum_categories", allEntries = true)
    public ForumCategoryResponse createCategory(CreateCategoryRequest request) {
        log.info("Создание новой категории: {}", request.getName());
        
        // Проверяем уникальность имени
        if (categoryRepository.existsByNameIgnoreCase(request.getName())) {
            throw new RuntimeException("Категория с таким именем уже существует");
        }
        
        ForumCategory category = ForumCategory.builder()
                .name(request.getName())
                .description(request.getDescription())
                .icon(request.getIcon())
                .color(request.getColor())
                .displayOrder(request.getDisplayOrder())
                .build();
        
        ForumCategory savedCategory = categoryRepository.save(category);
        log.info("Категория создана с ID: {}", savedCategory.getId());
        
        return mapToResponse(savedCategory);
    }

    /**
     * Обновить категорию
     */
    @Transactional
    @CacheEvict(value = "forum_categories", allEntries = true)
    public ForumCategoryResponse updateCategory(Long categoryId, CreateCategoryRequest request) {
        log.info("Обновление категории ID: {}", categoryId);
        
        ForumCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Категория не найдена: " + categoryId));
        
        // Проверяем уникальность имени (исключая текущую категорию)
        if (!category.getName().equalsIgnoreCase(request.getName()) && 
            categoryRepository.existsByNameIgnoreCase(request.getName())) {
            throw new RuntimeException("Категория с таким именем уже существует");
        }
        
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setIcon(request.getIcon());
        category.setColor(request.getColor());
        category.setDisplayOrder(request.getDisplayOrder());
        
        ForumCategory updatedCategory = categoryRepository.save(category);
        log.info("Категория обновлена: {}", updatedCategory.getId());
        
        return mapToResponse(updatedCategory);
    }

    /**
     * Деактивировать категорию
     */
    @Transactional
    @CacheEvict(value = "forum_categories", allEntries = true)
    public void deactivateCategory(Long categoryId) {
        log.info("Деактивация категории ID: {}", categoryId);
        
        ForumCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Категория не найдена: " + categoryId));
        
        category.setIsActive(false);
        categoryRepository.save(category);
        
        log.info("Категория деактивирована: {}", categoryId);
    }

    /**
     * Поиск категорий по названию
     */
    public List<ForumCategoryResponse> searchCategories(String query) {
        log.debug("Поиск категорий по запросу: {}", query);
        
        List<ForumCategory> categories = categoryRepository.findByNameContainingIgnoreCase(query);
        
        return categories.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Преобразование в DTO
     */
    private ForumCategoryResponse mapToResponse(ForumCategory category) {
        return ForumCategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .icon(category.getIcon())
                .color(category.getColor())
                .displayOrder(category.getDisplayOrder())
                .isActive(category.getIsActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    /**
     * Преобразование в DTO со статистикой
     */
    private ForumCategoryResponse mapToResponseWithStats(ForumCategory category) {
        Long threadsCount = threadRepository.countByCategoryIdAndNotDeleted(category.getId());
        
        return ForumCategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .icon(category.getIcon())
                .color(category.getColor())
                .displayOrder(category.getDisplayOrder())
                .isActive(category.getIsActive())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .threadsCount(threadsCount)
                .build();
    }
}