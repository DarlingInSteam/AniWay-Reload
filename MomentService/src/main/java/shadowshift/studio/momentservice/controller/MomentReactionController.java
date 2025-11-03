package shadowshift.studio.momentservice.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.momentservice.dto.MomentDtos;
import shadowshift.studio.momentservice.service.MomentReactionService;

@RestController
@RequestMapping("/api/moments/{momentId}/reactions")
public class MomentReactionController {

    private final MomentReactionService momentReactionService;

    public MomentReactionController(MomentReactionService momentReactionService) {
        this.momentReactionService = momentReactionService;
    }

    @PostMapping
    public MomentDtos.MomentResponse setReaction(@PathVariable Long momentId,
                                                 @RequestHeader("X-User-Id") String userHeader,
                                                 @Valid @RequestBody MomentDtos.ReactionRequest request) {
        Long userId = parseUserId(userHeader);
        return momentReactionService.setReaction(momentId, userId, request.reaction());
    }

    @DeleteMapping
    public MomentDtos.MomentResponse clearReaction(@PathVariable Long momentId,
                                                   @RequestHeader("X-User-Id") String userHeader) {
        Long userId = parseUserId(userHeader);
        return momentReactionService.clearReaction(momentId, userId);
    }

    private Long parseUserId(String userHeader) {
        if (userHeader == null || userHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        try {
            return Long.parseLong(userHeader.trim());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid X-User-Id header");
        }
    }
}
