package shadowshift.studio.notificationservice.web;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.notificationservice.domain.Notification;
import shadowshift.studio.notificationservice.domain.NotificationRepository;
import shadowshift.studio.notificationservice.domain.NotificationStatus;
import shadowshift.studio.notificationservice.dto.MarkReadRequest;
import shadowshift.studio.notificationservice.dto.NotificationListResponse;
import shadowshift.studio.notificationservice.dto.NotificationResponseDTO;
import shadowshift.studio.notificationservice.service.NotificationServiceFacade;
import shadowshift.studio.notificationservice.sse.SseEmitterRegistry;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final NotificationServiceFacade notificationServiceFacade;
    private final SseEmitterRegistry sseEmitterRegistry;

    // TEMP: userId через заглушку заголовка X-User-Id (до внедрения security)
    private Long currentUserId(String header) { return header != null ? Long.parseLong(header) : 0L; }

    @GetMapping
    public NotificationListResponse list(@RequestHeader(value = "X-User-Id", required = false) String userHeader,
                                         @RequestParam(defaultValue = "UNREAD") String status,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "30") int size) {
        Long userId = currentUserId(userHeader);
        NotificationStatus st = "ALL".equalsIgnoreCase(status) ? null : NotificationStatus.valueOf(status);
        var pageObj = notificationRepository.findByUser(userId, st, PageRequest.of(page, size));
        List<NotificationResponseDTO> items = pageObj.getContent().stream().map(this::map).collect(Collectors.toList());
        long unread = notificationServiceFacade.countUnread(userId);
        return NotificationListResponse.builder()
                .items(items)
                .nextCursor(pageObj.hasNext() ? items.get(items.size()-1).getId() : null)
                .unreadCount(unread)
                .build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> unread(@RequestHeader(value = "X-User-Id", required = false) String userHeader) {
        Long userId = currentUserId(userHeader);
        return ResponseEntity.ok(notificationServiceFacade.countUnread(userId));
    }

    @PostMapping("/mark-read")
    public ResponseEntity<Integer> markRead(@RequestHeader(value = "X-User-Id", required = false) String userHeader,
                                            @RequestBody MarkReadRequest request) {
        Long userId = currentUserId(userHeader);
        int changed = notificationServiceFacade.markRead(userId, request.getIds());
        return ResponseEntity.ok(changed);
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Integer> markAll(@RequestHeader(value = "X-User-Id", required = false) String userHeader) {
        Long userId = currentUserId(userHeader);
        int changed = notificationServiceFacade.markAllRead(userId);
        return ResponseEntity.ok(changed);
    }

    @DeleteMapping("/all")
    public ResponseEntity<Long> deleteAll(@RequestHeader(value = "X-User-Id", required = false) String userHeader) {
        Long userId = currentUserId(userHeader);
        long deleted = notificationServiceFacade.deleteAllForUser(userId);
        return ResponseEntity.ok(deleted);
    }

    @GetMapping(path = "/stream", produces = "text/event-stream")
    public SseEmitter stream(@RequestHeader(value = "X-User-Id", required = false) String userHeader,
                             @RequestParam(value = "userId", required = false) Long userIdParam) {
        Long userId = userIdParam != null ? userIdParam : currentUserId(userHeader);
        return sseEmitterRegistry.register(userId);
    }

    private NotificationResponseDTO map(Notification n) {
        return NotificationResponseDTO.builder()
                .id(n.getId())
                .type(n.getType().name())
                .status(n.getStatus().name())
                .payload(n.getPayloadJson())
                .createdAtEpoch(n.getCreatedAt() != null ? n.getCreatedAt().toEpochMilli() : 0L)
                .readAtEpoch(n.getReadAt() != null ? n.getReadAt().toEpochMilli() : null)
                .build();
    }

    @GetMapping("/page")
    public NotificationListResponse page(@RequestHeader(value = "X-User-Id", required = false) String userHeader,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "30") int size) {
        Long userId = currentUserId(userHeader);
        var pageObj = notificationRepository.findByUser(userId, null, PageRequest.of(page, size));
        List<NotificationResponseDTO> items = pageObj.getContent().stream().map(this::map).collect(Collectors.toList());
        long unread = notificationServiceFacade.countUnread(userId);
        return NotificationListResponse.builder()
                .items(items)
                .nextCursor(pageObj.hasNext() ? items.get(items.size()-1).getId() : null)
                .unreadCount(unread)
                .build();
    }
}
