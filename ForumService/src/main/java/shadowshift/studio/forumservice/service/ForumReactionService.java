package shadowshift.studio.forumservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.forumservice.entity.ForumPost;
import shadowshift.studio.forumservice.entity.ForumReaction;
import shadowshift.studio.forumservice.entity.ForumThread;
import shadowshift.studio.forumservice.repository.ForumPostRepository;
import shadowshift.studio.forumservice.repository.ForumReactionRepository;
import shadowshift.studio.forumservice.repository.ForumThreadRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForumReactionService {

    private final ForumReactionRepository reactionRepository;
    private final ForumThreadRepository threadRepository;
    private final ForumPostRepository postRepository;
    private final RabbitTemplate rabbitTemplate; // may be absent in some profiles if not configured

    @Value("${xp.events.exchange:xp.events.exchange}")
    private String xpExchange;
    @Value("${xp.events.forumThreadLikeRoutingKey:xp.events.forum-thread-like}")
    private String forumThreadLikeRoutingKey;
    @Value("${xp.events.forumPostLikeRoutingKey:xp.events.forum-post-like}")
    private String forumPostLikeRoutingKey;

    @Transactional
    public void setReactionToThread(Long threadId, Long userId, ForumReaction.ReactionType type) {
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена"));
        boolean createdLike = setReaction(userId, ForumReaction.TargetType.THREAD, threadId, type);
        recalcThreadReactionCounters(thread);
        if (createdLike && type == ForumReaction.ReactionType.LIKE) {
            publishThreadLikeEvent(thread, userId);
        }
    }

    @Transactional
    public void removeReactionFromThread(Long threadId, Long userId) {
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена"));
        reactionRepository.deleteByUserIdAndTargetTypeAndTargetId(userId, ForumReaction.TargetType.THREAD, threadId);
        recalcThreadReactionCounters(thread);
    }

    @Transactional
    public void setReactionToPost(Long postId, Long userId, ForumReaction.ReactionType type) {
        ForumPost post = postRepository.findByIdAndNotDeleted(postId)
                .orElseThrow(() -> new RuntimeException("Пост не найден"));
        boolean createdLike = setReaction(userId, ForumReaction.TargetType.POST, postId, type);
        recalcPostReactionCounters(post);
        if (createdLike && type == ForumReaction.ReactionType.LIKE) {
            publishPostLikeEvent(post, userId);
        }
    }

    @Transactional
    public void removeReactionFromPost(Long postId, Long userId) {
        ForumPost post = postRepository.findByIdAndNotDeleted(postId)
                .orElseThrow(() -> new RuntimeException("Пост не найден"));
        reactionRepository.deleteByUserIdAndTargetTypeAndTargetId(userId, ForumReaction.TargetType.POST, postId);
        recalcPostReactionCounters(post);
    }

    /**
     * Returns true if a new LIKE row was created (used to emit XP event exactly once per unique like).
     */
    private boolean setReaction(Long userId, ForumReaction.TargetType targetType, Long targetId, ForumReaction.ReactionType type) {
        final boolean[] created = {false};
        reactionRepository.findByUserIdAndTargetTypeAndTargetId(userId, targetType, targetId)
                .ifPresentOrElse(existing -> {
                    if (existing.getReactionType() != type) {
                        existing.setReactionType(type);
                        reactionRepository.save(existing);
                    }
                }, () -> {
                    reactionRepository.save(ForumReaction.builder()
                            .userId(userId)
                            .targetType(targetType)
                            .targetId(targetId)
                            .reactionType(type)
                            .build());
                    if (type == ForumReaction.ReactionType.LIKE) created[0] = true;
                });
        return created[0];
    }

    private void publishThreadLikeEvent(ForumThread thread, Long likerUserId) {
        if (rabbitTemplate == null) return; // defensive
        try {
            Long receiverUserId = thread.getAuthorId();
            if (receiverUserId == null || receiverUserId.equals(likerUserId)) return; // no self-like XP
            String eventId = "FORUM_THREAD_LIKE_RECEIVED:" + thread.getId() + ":" + likerUserId;
            var event = new java.util.HashMap<String, Object>();
            event.put("type", "FORUM_THREAD_LIKE_RECEIVED");
            event.put("receiverUserId", receiverUserId);
            event.put("threadId", thread.getId());
            event.put("likerUserId", likerUserId);
            event.put("eventId", eventId);
            rabbitTemplate.convertAndSend(xpExchange, forumThreadLikeRoutingKey, event);
            log.info("Published FORUM_THREAD_LIKE_RECEIVED for thread {} to user {}", thread.getId(), receiverUserId);
        } catch (Exception ex) {
            log.error("Failed to publish FORUM_THREAD_LIKE_RECEIVED event", ex);
        }
    }

    private void publishPostLikeEvent(ForumPost post, Long likerUserId) {
        if (rabbitTemplate == null) return;
        try {
            Long receiverUserId = post.getAuthorId();
            if (receiverUserId == null || receiverUserId.equals(likerUserId)) return;
            String eventId = "FORUM_POST_LIKE_RECEIVED:" + post.getId() + ":" + likerUserId;
            var event = new java.util.HashMap<String, Object>();
            event.put("type", "FORUM_POST_LIKE_RECEIVED");
            event.put("receiverUserId", receiverUserId);
            event.put("postId", post.getId());
            event.put("likerUserId", likerUserId);
            event.put("eventId", eventId);
            rabbitTemplate.convertAndSend(xpExchange, forumPostLikeRoutingKey, event);
            log.info("Published FORUM_POST_LIKE_RECEIVED for post {} to user {}", post.getId(), receiverUserId);
        } catch (Exception ex) {
            log.error("Failed to publish FORUM_POST_LIKE_RECEIVED event", ex);
        }
    }

    private void recalcThreadReactionCounters(ForumThread thread) {
        Long likes = reactionRepository.countLikesByTarget(ForumReaction.TargetType.THREAD, thread.getId());
        Long dislikes = reactionRepository.countDislikesByTarget(ForumReaction.TargetType.THREAD, thread.getId());
        thread.setLikesCount(likes.intValue());
        threadRepository.save(thread);
    }

    private void recalcPostReactionCounters(ForumPost post) {
        Long likes = reactionRepository.countLikesByTarget(ForumReaction.TargetType.POST, post.getId());
        Long dislikes = reactionRepository.countDislikesByTarget(ForumReaction.TargetType.POST, post.getId());
        post.setLikesCount(likes.intValue());
        post.setDislikesCount(dislikes.intValue());
        postRepository.save(post);
    }
}
