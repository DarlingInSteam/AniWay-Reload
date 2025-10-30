package shadowshift.studio.momentservice.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import shadowshift.studio.momentservice.dto.MomentDtos;
import shadowshift.studio.momentservice.service.MomentCrudService;

@RestController
@RequestMapping("/api/moments")
public class MomentController {

    private final MomentCrudService momentCrudService;

    public MomentController(MomentCrudService momentCrudService) {
        this.momentCrudService = momentCrudService;
    }

    @PostMapping
    public MomentDtos.MomentResponse create(@RequestHeader("X-User-Id") String userHeader,
                                            @Valid @RequestBody MomentDtos.CreateMomentRequest request) {
        Long uploaderId = parseUserId(userHeader);
        return momentCrudService.create(uploaderId, request);
    }

    @GetMapping("/{id}")
    public MomentDtos.MomentResponse get(@PathVariable Long id,
                                         @RequestHeader(value = "X-User-Id", required = false) String userHeader,
                                         @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {
        Long requesterId = parseUserIdAllowNull(userHeader);
        boolean isAdmin = isAdmin(roleHeader);
        return momentCrudService.get(id, requesterId, isAdmin);
    }

    @GetMapping("/manga/{mangaId}")
    public MomentDtos.MomentPageResponse listByManga(@PathVariable Long mangaId,
                                                     @RequestParam(name = "sort", defaultValue = "new") String sort,
                                                     @RequestParam(name = "page", defaultValue = "0") int page,
                                                     @RequestParam(name = "size", defaultValue = "12") int size,
                                                     @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
                                                     @RequestHeader(value = "X-User-Id", required = false) String userHeader) {
        boolean includeHidden = isAdmin(roleHeader);
        Long viewerId = parseUserIdAllowNull(userHeader);
        return momentCrudService.list(mangaId, sort, page, size, includeHidden, viewerId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @RequestHeader("X-User-Id") String userHeader,
                                       @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {
        Long requesterId = parseUserId(userHeader);
        boolean isAdmin = isAdmin(roleHeader);
        momentCrudService.delete(id, requesterId, isAdmin);
        return ResponseEntity.noContent().build();
    }

    private Long parseUserId(String header) {
        Long id = parseUserIdAllowNull(header);
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        return id;
    }

    private Long parseUserIdAllowNull(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(header.trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid X-User-Id header");
        }
    }

    private boolean isAdmin(String roleHeader) {
        if (roleHeader == null) {
            return false;
        }
        return "ADMIN".equalsIgnoreCase(roleHeader.trim());
    }
}
