package shadowshift.studio.forumservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.forumservice.dto.request.CreateCategoryRequest;
import shadowshift.studio.forumservice.dto.response.ForumCategoryResponse;
import shadowshift.studio.forumservice.service.ForumCategoryService;

import java.util.List;

@RestController
@RequestMapping("/api/forum/categories")
@RequiredArgsConstructor
@Slf4j
public class ForumCategoryController {

    private final ForumCategoryService categoryService;

    /**
     * Получить все активные категории
     */
    @GetMapping
    public ResponseEntity<List<ForumCategoryResponse>> getAllActiveCategories() {
        log.info("GET /api/forum/categories - получение всех активных категорий");
        
        List<ForumCategoryResponse> categories = categoryService.getAllActiveCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * Получить категории с пагинацией (для админ-панели)
     */
    @GetMapping("/admin")
    public ResponseEntity<Page<ForumCategoryResponse>> getCategoriesForAdmin(
            @RequestParam(required = false) Boolean isActive,
            @PageableDefault(size = 20) Pageable pageable) {
        
        log.info("GET /api/forum/categories/admin - получение категорий для админ-панели");
        
        Page<ForumCategoryResponse> categories = categoryService.getCategories(isActive, pageable);
        return ResponseEntity.ok(categories);
    }

    /**
     * Получить категорию по ID
     */
    @GetMapping("/{categoryId}")
    public ResponseEntity<ForumCategoryResponse> getCategoryById(@PathVariable Long categoryId) {
        log.info("GET /api/forum/categories/{} - получение категории по ID", categoryId);
        
        ForumCategoryResponse category = categoryService.getCategoryById(categoryId);
        return ResponseEntity.ok(category);
    }

    /**
     * Создать новую категорию (только для администраторов)
     */
    @PostMapping
    public ResponseEntity<ForumCategoryResponse> createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        log.info("POST /api/forum/categories - создание новой категории: {}", request.getName());
        
        // TODO: Добавить проверку прав администратора
        
        ForumCategoryResponse category = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(category);
    }

    /**
     * Обновить категорию (только для администраторов)
     */
    @PutMapping("/{categoryId}")
    public ResponseEntity<ForumCategoryResponse> updateCategory(
            @PathVariable Long categoryId,
            @Valid @RequestBody CreateCategoryRequest request) {
        
        log.info("PUT /api/forum/categories/{} - обновление категории", categoryId);
        
        // TODO: Добавить проверку прав администратора
        
        ForumCategoryResponse category = categoryService.updateCategory(categoryId, request);
        return ResponseEntity.ok(category);
    }

    /**
     * Деактивировать категорию (только для администраторов)
     */
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deactivateCategory(@PathVariable Long categoryId) {
        log.info("DELETE /api/forum/categories/{} - деактивация категории", categoryId);
        
        // TODO: Добавить проверку прав администратора
        
        categoryService.deactivateCategory(categoryId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Поиск категорий по названию
     */
    @GetMapping("/search")
    public ResponseEntity<List<ForumCategoryResponse>> searchCategories(@RequestParam String q) {
        log.info("GET /api/forum/categories/search?q={} - поиск категорий", q);
        
        List<ForumCategoryResponse> categories = categoryService.searchCategories(q);
        return ResponseEntity.ok(categories);
    }
}