package shadowshift.studio.momentservice.service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.momentservice.client.NotificationClient;
import shadowshift.studio.momentservice.dto.MomentDtos;
import shadowshift.studio.momentservice.entity.Moment;
import shadowshift.studio.momentservice.entity.MomentReaction;
import shadowshift.studio.momentservice.entity.ReactionType;
import shadowshift.studio.momentservice.metrics.MomentMetrics;
import shadowshift.studio.momentservice.repository.MomentReactionRepository;
import shadowshift.studio.momentservice.repository.MomentRepository;

@Service
@Transactional
public class MomentReactionService {

    private static final Logger log = LoggerFactory.getLogger(MomentReactionService.class);

    private final MomentRepository momentRepository;
    private final MomentReactionRepository momentReactionRepository;
    private final MomentCrudService momentCrudService;
    private final NotificationClient notificationClient;
    private final RabbitTemplate rabbitTemplate;
    private final MomentMetrics momentMetrics;

    @Value("${xp.events.exchange:xp.events.exchange}")
    private String xpExchange;

    @Value("${xp.events.momentLikeRoutingKey:xp.events.moment-like}")
    private String momentLikeRoutingKey;

    public MomentReactionService(MomentRepository momentRepository,
                                 MomentReactionRepository momentReactionRepository,
                                 MomentCrudService momentCrudService,
                                 NotificationClient notificationClient,
                                 RabbitTemplate rabbitTemplate,
                                 MomentMetrics momentMetrics) {
        this.momentRepository = momentRepository;
        this.momentReactionRepository = momentReactionRepository;
        this.momentCrudService = momentCrudService;
        this.notificationClient = notificationClient;
        this.rabbitTemplate = rabbitTemplate;
        this.momentMetrics = momentMetrics;
    }

    public MomentDtos.MomentResponse setReaction(Long momentId, Long userId, ReactionType reaction) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Moment moment = momentRepository.findById(momentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found"));
        if (moment.isHidden() && !userId.equals(moment.getUploaderId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moment is hidden");
        }
        MomentReaction existing = momentReactionRepository.findByMomentIdAndUserId(momentId, userId).orElse(null);
        boolean notifyLike = false;

        ReactionType previousReaction = null;

        if (existing != null) {
            previousReaction = existing.getReaction();
            if (existing.getReaction() == reaction) {
                return momentCrudService.mapMoment(moment, userId);
            }
            existing.setReaction(reaction);
            momentReactionRepository.save(existing);
        } else {
            MomentReaction newReaction = new MomentReaction();
            newReaction.setMoment(moment);
            newReaction.setUserId(userId);
            newReaction.setReaction(reaction);
            momentReactionRepository.save(newReaction);
        }

        if (reaction == ReactionType.LIKE && (previousReaction == null || previousReaction != ReactionType.LIKE)) {
            notifyLike = true;
        }

        recalcAndPersist(moment, reaction == ReactionType.LIKE);
        momentMetrics.recordReactionSet(reaction);

        if (notifyLike) {
            dispatchLikeSignals(moment, userId);
        }

        return momentCrudService.mapMoment(moment, userId);
    }

    public MomentDtos.MomentResponse clearReaction(Long momentId, Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Moment moment = momentRepository.findById(momentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Moment not found"));
        if (moment.isHidden() && !userId.equals(moment.getUploaderId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Moment is hidden");
        }
        MomentReaction existing = momentReactionRepository.findByMomentIdAndUserId(momentId, userId).orElse(null);
        if (existing != null) {
            momentReactionRepository.delete(existing);
            recalcAndPersist(moment, false);
            momentMetrics.recordReactionCleared();
        }
        return momentCrudService.mapMoment(moment, userId);
    }

    private void recalcAndPersist(Moment moment, boolean refreshActivity) {
        long likes = momentReactionRepository.countByMomentIdAndReaction(moment.getId(), ReactionType.LIKE);
        long dislikes = momentReactionRepository.countByMomentIdAndReaction(moment.getId(), ReactionType.DISLIKE);
        moment.setLikesCount(Math.toIntExact(likes));
        moment.setLikesCount7d(Math.toIntExact(likes));
        moment.setDislikesCount(Math.toIntExact(dislikes));
        if (refreshActivity) {
            moment.setLastActivityAt(Instant.now());
        }
        momentRepository.save(moment);
    }

    private void dispatchLikeSignals(Moment moment, Long actorUserId) {
        notificationClient.publishMomentLiked(moment.getUploaderId(), moment.getId(), moment.getMangaId(), actorUserId);
        if (moment.getUploaderId() == null || moment.getUploaderId().equals(actorUserId)) {
            return;
        }
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("type", "MOMENT_LIKE_RECEIVED");
            payload.put("eventId", "MOMENT_LIKE_RECEIVED:" + moment.getId() + ":" + actorUserId + ":" + System.currentTimeMillis());
            payload.put("receiverUserId", moment.getUploaderId());
            payload.put("actorUserId", actorUserId);
            payload.put("momentId", moment.getId());
            payload.put("mangaId", moment.getMangaId());
            payload.put("occurredAt", Instant.now().toString());
            rabbitTemplate.convertAndSend(xpExchange, momentLikeRoutingKey, payload);
        } catch (Exception ex) {
            log.error("Failed to publish MOMENT_LIKE_RECEIVED event: {}", ex.getMessage());
        }
    }
}
