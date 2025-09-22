package shadowshift.studio.forumservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Transactional
    public void setReactionToThread(Long threadId, Long userId, ForumReaction.ReactionType type) {
        ForumThread thread = threadRepository.findByIdAndNotDeleted(threadId)
                .orElseThrow(() -> new RuntimeException("Тема не найдена"));
        setReaction(userId, ForumReaction.TargetType.THREAD, threadId, type);
        recalcThreadReactionCounters(thread);
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
        setReaction(userId, ForumReaction.TargetType.POST, postId, type);
        recalcPostReactionCounters(post);
    }

    @Transactional
    public void removeReactionFromPost(Long postId, Long userId) {
        ForumPost post = postRepository.findByIdAndNotDeleted(postId)
                .orElseThrow(() -> new RuntimeException("Пост не найден"));
        reactionRepository.deleteByUserIdAndTargetTypeAndTargetId(userId, ForumReaction.TargetType.POST, postId);
        recalcPostReactionCounters(post);
    }

    private void setReaction(Long userId, ForumReaction.TargetType targetType, Long targetId, ForumReaction.ReactionType type) {
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
                });
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
