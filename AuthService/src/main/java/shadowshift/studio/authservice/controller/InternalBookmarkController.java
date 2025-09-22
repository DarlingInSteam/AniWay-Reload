package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.authservice.service.BookmarkService;

import java.util.List;

@RestController
@RequestMapping("/internal/bookmarks")
@RequiredArgsConstructor
public class InternalBookmarkController {

    private final BookmarkService bookmarkService;

    @GetMapping("/manga/{mangaId}/subscribers")
    public ResponseEntity<List<Long>> getSubscribers(@PathVariable Long mangaId) {
        List<Long> userIds = bookmarkService.getUserIdsByManga(mangaId);
        return ResponseEntity.ok(userIds);
    }
}
