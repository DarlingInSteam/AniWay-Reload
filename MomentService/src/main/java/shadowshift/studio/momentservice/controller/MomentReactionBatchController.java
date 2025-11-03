package shadowshift.studio.momentservice.controller;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.momentservice.entity.ReactionType;
import shadowshift.studio.momentservice.service.MomentReactionService;

@RestController
@RequestMapping("/api/moments/reactions")
public class MomentReactionBatchController {

    private final MomentReactionService momentReactionService;

    public MomentReactionBatchController(MomentReactionService momentReactionService) {
        this.momentReactionService = momentReactionService;
    }

    @GetMapping("/batch")
    public Map<Long, ReactionType> getUserReactions(@RequestHeader(value = "X-User-Id", required = false) String userHeader,
                                                    @RequestParam(name = "ids", required = false) List<String> rawIds) {
        Long userId = parseUserIdAllowNull(userHeader);
        if (userId == null) {
            return Collections.emptyMap();
        }
        List<Long> ids = sanitizeIds(rawIds);
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return momentReactionService.findUserReactions(userId, ids);
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

    private List<Long> sanitizeIds(List<String> rawIds) {
        if (rawIds == null || rawIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> sanitized = new ArrayList<>(rawIds.size());
        for (String raw : rawIds) {
            if (raw == null) {
                continue;
            }
            String trimmed = raw.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            try {
                sanitized.add(Long.parseLong(trimmed));
            } catch (NumberFormatException ignored) {
                // ignore malformed ids instead of failing the whole request
            }
        }
        return sanitized;
    }

}
