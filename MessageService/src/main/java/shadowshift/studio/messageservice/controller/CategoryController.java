package shadowshift.studio.messageservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.messageservice.dto.CategoryView;
import shadowshift.studio.messageservice.dto.CreateCategoryRequest;
import shadowshift.studio.messageservice.dto.MarkCategoryReadRequest;
import shadowshift.studio.messageservice.dto.MessagePageView;
import shadowshift.studio.messageservice.dto.MessageView;
import shadowshift.studio.messageservice.dto.SendChannelMessageRequest;
import shadowshift.studio.messageservice.dto.UpdateCategoryRequest;
import shadowshift.studio.messageservice.exception.CategoryAccessDeniedException;
import shadowshift.studio.messageservice.security.GatewayAuthenticationFilter;
import shadowshift.studio.messageservice.service.CategoryService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages/categories")
@RequiredArgsConstructor
@Validated
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public List<CategoryView> listCategories(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                             @RequestParam(name = "includeArchived", defaultValue = "false") boolean includeArchived) {
        boolean allowArchived = includeArchived && isAdmin(principal);
        if (includeArchived && !allowArchived) {
            throw new CategoryAccessDeniedException();
        }
        Long userId = principal != null ? principal.id() : null;
        return categoryService.listCategories(userId, allowArchived);
    }

    @PostMapping
    public CategoryView createCategory(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                       @Valid @RequestBody CreateCategoryRequest request) {
        ensureAdmin(principal);
        return categoryService.createCategory(principal.id(), request);
    }

    @PatchMapping("/{categoryId}")
    public CategoryView updateCategory(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                       @PathVariable Long categoryId,
                                       @Valid @RequestBody UpdateCategoryRequest request) {
        ensureAdmin(principal);
        return categoryService.updateCategory(categoryId, request);
    }

    @GetMapping("/{categoryId}/messages")
    public MessagePageView getMessages(@PathVariable Long categoryId,
                                       @RequestParam(name = "before", required = false) UUID before,
                                       @RequestParam(name = "after", required = false) UUID after,
                                       @RequestParam(name = "size", required = false) Integer size) {
        return categoryService.getMessages(categoryId, before, after, size);
    }

    @PostMapping("/{categoryId}/messages")
    public MessageView sendMessage(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                   @PathVariable Long categoryId,
                                   @Valid @RequestBody SendChannelMessageRequest request) {
        if (principal == null) {
            throw new CategoryAccessDeniedException();
        }
        return categoryService.sendMessage(principal.id(), categoryId, request);
    }

    @PostMapping("/{categoryId}/read")
    public void markCategoryRead(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal,
                                 @PathVariable Long categoryId,
                                 @Valid @RequestBody MarkCategoryReadRequest request) {
        if (principal == null) {
            throw new CategoryAccessDeniedException();
        }
        categoryService.markCategoryRead(principal.id(), categoryId, request);
    }

    @GetMapping("/unread")
    public Map<Long, Long> getUnreadMap(@AuthenticationPrincipal GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        if (principal == null) {
            throw new CategoryAccessDeniedException();
        }
        return categoryService.getUnreadMap(principal.id());
    }

    private void ensureAdmin(GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        if (!isAdmin(principal)) {
            throw new CategoryAccessDeniedException();
        }
    }

    private boolean isAdmin(GatewayAuthenticationFilter.AuthenticatedUserPrincipal principal) {
        if (principal == null || principal.role() == null) {
            return false;
        }
        String role = principal.role().toUpperCase();
        return role.contains("ADMIN") || role.contains("MODERATOR");
    }
}
