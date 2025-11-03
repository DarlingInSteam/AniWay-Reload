package shadowshift.studio.momentservice.service;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.momentservice.dto.MomentDtos;
import shadowshift.studio.momentservice.entity.Moment;
import shadowshift.studio.momentservice.dto.MomentDtos.CommentCountUpdateRequest;
import shadowshift.studio.momentservice.dto.MomentDtos.InternalMomentResponse;
import shadowshift.studio.momentservice.entity.MomentReaction;
import shadowshift.studio.momentservice.entity.ReactionType;
import shadowshift.studio.momentservice.metrics.MomentMetrics;
import shadowshift.studio.momentservice.model.MomentSort;
import shadowshift.studio.momentservice.repository.MomentReactionRepository;
import shadowshift.studio.momentservice.repository.MomentRepository;

@Service
@Transactional
public class MomentCrudService {

    private static final long MAX_IMAGE_SIZE_BYTES = 8L * 1024 * 1024;
    private static final int MAX_PAGE_SIZE = 50;

    private final MomentRepository momentRepository;
    private final MomentReactionRepository momentReactionRepository;
    private final MomentRateLimiter momentRateLimiter;
    private final MomentMetrics momentMetrics;

    public MomentCrudService(MomentRepository momentRepository,
                             MomentReactionRepository momentReactionRepository,
                             MomentRateLimiter momentRateLimiter,
                             MomentMetrics momentMetrics) {
        this.momentRepository = momentRepository;
        this.momentReactionRepository = momentReactionRepository;
        this.momentRateLimiter = momentRateLimiter;
        this.momentMetrics = momentMetrics;
    }

    public MomentDtos.MomentResponse create(Long uploaderId, MomentDtos.CreateMomentRequest request) {
        if (uploaderId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        validateCreateRequest(request);
        momentRateLimiter.assertAllowed(uploaderId, request.image().sizeBytes());
        Moment moment = new Moment();
        Instant now = Instant.now();
        moment.setMangaId(request.mangaId());
        moment.setChapterId(request.chapterId());
        moment.setPageNumber(request.pageNumber());
        moment.setUploaderId(uploaderId);
        moment.setCaption(normalizeCaption(request.caption()));
        moment.setSpoiler(request.spoiler());
        moment.setNsfw(request.nsfw());
        moment.setHidden(false);
        moment.setHiddenBy(null);
        moment.setHiddenReason(null);
        moment.setReported(false);
        moment.setLikesCount(0);
        moment.setLikesCount7d(0);
        moment.setDislikesCount(0);
        moment.setCommentsCount(0);
        moment.setCommentsCount7d(0);
        moment.setLastActivityAt(now);
        moment.setImageUrl(request.image().url());
        moment.setImageKey(request.image().key());
        moment.setImageWidth(request.image().width());
        moment.setImageHeight(request.image().height());
        moment.setFileSize(request.image().sizeBytes());
    long startNanos = System.nanoTime();
    Moment saved = momentRepository.save(moment);
    long duration = System.nanoTime() - startNanos;
    momentMetrics.recordMomentCreated(saved, duration);
    return mapMoment(saved, uploaderId);
    }

    @Transactional(readOnly = true)
    public MomentDtos.MomentResponse get(Long id, Long requesterId, boolean isAdmin) {
        Moment moment = momentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found"));
        if (moment.isHidden() && !isAdmin && (requesterId == null || !requesterId.equals(moment.getUploaderId()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found");
        }
        return mapMoment(moment, requesterId);
    }

    @Transactional(readOnly = true)
    public MomentDtos.MomentPageResponse list(Long mangaId, String sortParam, int page, int size, boolean includeHidden, Long viewerId) {
        if (mangaId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "mangaId is required");
        }
        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be >= 0");
        }
        if (size <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "size must be > 0");
        }
        int pageSize = Math.min(size, MAX_PAGE_SIZE);
        MomentSort sort;
        try {
            sort = MomentSort.fromParam(sortParam);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
        Pageable pageable = PageRequest.of(page, pageSize, appendDefaultSort(sort.toSort()));
        Page<Moment> result = includeHidden
            ? momentRepository.findByMangaId(mangaId, pageable)
            : momentRepository.findByMangaIdAndHiddenFalse(mangaId, pageable);
        List<Moment> moments = result.getContent();
        final Map<Long, ReactionType> viewerReactions;
        if (viewerId != null && !moments.isEmpty()) {
            List<Long> ids = moments.stream()
                .map(Moment::getId)
                .toList();
            viewerReactions = loadViewerReactions(viewerId, ids);
        } else {
            viewerReactions = Collections.emptyMap();
        }
        List<MomentDtos.MomentResponse> items = moments.stream()
            .map(moment -> mapMoment(moment, viewerId, viewerReactions))
            .toList();
        return new MomentDtos.MomentPageResponse(items, result.getNumber(), result.getSize(), result.getTotalElements(), result.hasNext());
    }

    public void delete(Long id, Long requesterId, boolean isAdmin) {
        Moment moment = momentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found"));
        if (!isAdmin && (requesterId == null || !requesterId.equals(moment.getUploaderId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to delete this moment");
        }
        momentRepository.delete(moment);
    }

    @Transactional(readOnly = true)
    public InternalMomentResponse getInternal(Long id) {
        Moment moment = momentRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found"));
        return buildInternalResponse(moment);
    }

    public void updateCommentStats(Long momentId, CommentCountUpdateRequest request) {
        Moment moment = momentRepository.findById(momentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found"));
        moment.setCommentsCount(request.count());
        moment.setCommentsCount7d(request.count());
        if (request.lastActivityAt() != null) {
            moment.setLastActivityAt(request.lastActivityAt());
        }
    }

    MomentDtos.MomentResponse mapMoment(Moment entity, Long viewerId) {
        return mapMoment(entity, viewerId, null);
    }

    MomentDtos.MomentResponse mapMoment(Moment entity, Long viewerId, Map<Long, ReactionType> preloadedReactions) {
        MomentDtos.ImagePayload image = new MomentDtos.ImagePayload(
            entity.getImageUrl(),
            entity.getImageKey(),
            entity.getImageWidth(),
            entity.getImageHeight(),
            entity.getFileSize()
        );
        ReactionType viewerReaction = resolveViewerReaction(entity.getId(), viewerId, preloadedReactions);
        return new MomentDtos.MomentResponse(
            entity.getId(),
            entity.getMangaId(),
            entity.getChapterId(),
            entity.getPageNumber(),
            entity.getUploaderId(),
            entity.getCaption(),
            entity.isSpoiler(),
            entity.isNsfw(),
            entity.isHidden(),
            entity.isReported(),
            entity.getLikesCount(),
            entity.getLikesCount7d(),
            entity.getDislikesCount(),
            entity.getCommentsCount(),
            entity.getCommentsCount7d(),
            entity.getLastActivityAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt(),
            image,
            viewerReaction
        );
    }

    private InternalMomentResponse buildInternalResponse(Moment moment) {
        MomentDtos.ImagePayload image = new MomentDtos.ImagePayload(
            moment.getImageUrl(),
            moment.getImageKey(),
            moment.getImageWidth(),
            moment.getImageHeight(),
            moment.getFileSize()
        );
        return new InternalMomentResponse(
            moment.getId(),
            moment.getMangaId(),
            moment.getChapterId(),
            moment.getPageNumber(),
            moment.getUploaderId(),
            moment.isHidden(),
            moment.isSpoiler(),
            moment.isNsfw(),
            moment.isReported(),
            moment.getLikesCount(),
            moment.getDislikesCount(),
            moment.getCommentsCount(),
            moment.getLastActivityAt(),
            moment.getCreatedAt(),
            moment.getUpdatedAt(),
            image
        );
    }

    private ReactionType resolveViewerReaction(Long momentId, Long viewerId, Map<Long, ReactionType> preloadedReactions) {
        if (viewerId == null) {
            return null;
        }
        if (preloadedReactions != null && preloadedReactions.containsKey(momentId)) {
            return preloadedReactions.get(momentId);
        }
        return momentReactionRepository.findByMomentIdAndUserId(momentId, viewerId)
            .map(MomentReaction::getReaction)
            .orElse(null);
    }

    private Map<Long, ReactionType> loadViewerReactions(Long viewerId, List<Long> momentIds) {
        if (momentIds == null || momentIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<MomentReactionRepository.ReactionView> rows = momentReactionRepository.findReactionViews(viewerId, momentIds);
        if (rows.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, ReactionType> map = new HashMap<>();
        for (MomentReactionRepository.ReactionView row : rows) {
            Long momentId = row.getMomentId();
            if (momentId != null) {
                map.putIfAbsent(momentId, row.getReaction());
            }
        }
        return map;
    }

    private void validateCreateRequest(MomentDtos.CreateMomentRequest request) {
        if (!StringUtils.hasText(request.caption())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "caption must not be blank");
        }
        if (request.image() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image payload is required");
        }
        if (request.image().sizeBytes() > MAX_IMAGE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image exceeds max size of 8MB");
        }
        if (!StringUtils.hasText(request.image().url()) || !StringUtils.hasText(request.image().key())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image metadata is incomplete");
        }
    }

    private String normalizeCaption(String caption) {
        String normalized = caption.trim();
        if (normalized.length() > 280) {
            return normalized.substring(0, 280);
        }
        return normalized;
    }

    private Sort appendDefaultSort(Sort sort) {
        return sort.and(Sort.by(Sort.Order.desc("id")));
    }

    private MomentDtos.MomentResponse map(Moment entity) {
        MomentDtos.ImagePayload image = new MomentDtos.ImagePayload(
            entity.getImageUrl(),
            entity.getImageKey(),
            entity.getImageWidth(),
            entity.getImageHeight(),
            entity.getFileSize()
        );
        return new MomentDtos.MomentResponse(
            entity.getId(),
            entity.getMangaId(),
            entity.getChapterId(),
            entity.getPageNumber(),
            entity.getUploaderId(),
            entity.getCaption(),
            entity.isSpoiler(),
            entity.isNsfw(),
            entity.isHidden(),
            entity.isReported(),
            entity.getLikesCount(),
            entity.getLikesCount7d(),
            entity.getDislikesCount(),
            entity.getCommentsCount(),
            entity.getCommentsCount7d(),
            entity.getLastActivityAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt(),
            image,
            null
        );
    }
}
