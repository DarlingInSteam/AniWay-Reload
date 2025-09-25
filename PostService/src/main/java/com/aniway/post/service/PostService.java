package com.aniway.post.service;

import com.aniway.post.dto.PostDtos;
import com.aniway.post.mapper.PostMapper;
import com.aniway.post.model.Post;
import com.aniway.post.model.PostReference;
import com.aniway.post.model.PostVote;
import com.aniway.post.repo.PostReferenceRepository;
import com.aniway.post.repo.PostRepository;
import com.aniway.post.repo.PostVoteRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import java.util.HashMap;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
public class PostService {
    private final PostRepository postRepository;
    private final PostVoteRepository voteRepository;
    private final PostReferenceRepository referenceRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${xp.events.exchange:xp.events.exchange}")
    private String xpExchange;

    @Value("${xp.events.postUpvoteRoutingKey:xp.events.post-upvote}")
    private String postUpvoteRoutingKey;

    private static final Pattern MANGA_REF_PATTERN = Pattern.compile("\\[\\[manga:(\\d+)]]");
    private static final int DEFAULT_TOP_LIMIT = 20;

    public PostService(PostRepository postRepository, PostVoteRepository voteRepository, PostReferenceRepository referenceRepository, RabbitTemplate rabbitTemplate) {
        this.postRepository = postRepository;
        this.voteRepository = voteRepository;
        this.referenceRepository = referenceRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional(readOnly = true)
    public List<PostDtos.FrontendPost> getTop(String range, Integer limit, Long currentUserId) {
        int cappedLimit = (limit == null ? DEFAULT_TOP_LIMIT : Math.min(Math.max(limit, 1), 100));
        Instant since;
        if (range == null || range.equalsIgnoreCase("all")) {
            since = null;
        } else if (range.equalsIgnoreCase("today")) {
            since = Instant.now().minus(1, ChronoUnit.DAYS);
        } else if (range.equals("7") || range.equalsIgnoreCase("7d")) {
            since = Instant.now().minus(7, ChronoUnit.DAYS);
        } else if (range.equals("30") || range.equalsIgnoreCase("30d")) {
            since = Instant.now().minus(30, ChronoUnit.DAYS);
        } else {
            throw new IllegalArgumentException("Invalid range parameter");
        }

        List<Post> posts;
        PageRequest pageable = PageRequest.of(0, cappedLimit);
        if (since == null) {
            posts = postRepository.findTopAll(pageable);
        } else {
            posts = postRepository.findTopSince(since, pageable);
        }
        return posts.stream().map(p -> PostMapper.toFrontend(p, currentUserId)).toList();
    }

    public PostDtos.PostResponse create(Long authorId, PostDtos.CreatePostRequest req) {
        Post post = new Post();
        post.setAuthorId(authorId);
        post.setContent(req.content());
        post.setEditedUntil(Instant.now().plus(7, ChronoUnit.DAYS));
        PostMapper.applyAttachments(post, req.attachments());
        postRepository.save(post);
        applyReferences(post);
        return PostMapper.toResponse(post, authorId);
    }

    public PostDtos.FrontendPost createFrontend(Long authorId, PostDtos.CreatePostRequest req) {
        PostDtos.PostResponse base = create(authorId, req); // ensures same logic
        Post post = getPostOrThrow(base.id());
        return PostMapper.toFrontend(post, authorId);
    }

    public PostDtos.PostResponse update(Long postId, Long authorId, PostDtos.UpdatePostRequest req) {
        Post post = getPostOrThrow(postId);
        if (!post.getAuthorId().equals(authorId)) {
            throw new IllegalStateException("Not owner");
        }
        if (Instant.now().isAfter(post.getEditedUntil())) {
            throw new IllegalStateException("Edit window expired");
        }
        post.setContent(req.content());
        PostMapper.applyAttachments(post, req.attachments());
        post.getReferences().clear();
        applyReferences(post);
        return PostMapper.toResponse(post, authorId);
    }

    public PostDtos.FrontendPost updateFrontend(Long postId, Long authorId, PostDtos.UpdatePostRequest req) {
        PostDtos.PostResponse base = update(postId, authorId, req);
        Post post = getPostOrThrow(base.id());
        return PostMapper.toFrontend(post, authorId);
    }

    public void delete(Long postId, Long authorId) {
        Post post = getPostOrThrow(postId);
        if (!post.getAuthorId().equals(authorId)) {
            throw new IllegalStateException("Not owner");
        }
        postRepository.delete(post);
    }

    @Transactional(readOnly = true)
    public PostDtos.PostResponse get(Long postId, Long currentUserId) {
        Post post = getPostOrThrow(postId);
        return PostMapper.toResponse(post, currentUserId);
    }

    public PostDtos.FrontendPost getFrontend(Long postId, Long currentUserId) {
        Post post = getPostOrThrow(postId);
        return PostMapper.toFrontend(post, currentUserId);
    }

    @Transactional(readOnly = true)
    public Page<PostDtos.PostResponse> listByAuthor(Long authorId, Pageable pageable, Long currentUserId) {
        return postRepository.findByAuthorIdOrderByCreatedAtDesc(authorId, pageable)
                .map(p -> PostMapper.toResponse(p, currentUserId));
    }

    public Page<PostDtos.FrontendPost> listByAuthorFrontend(Long authorId, Pageable pageable, Long currentUserId) {
        return postRepository.findByAuthorIdOrderByCreatedAtDesc(authorId, pageable)
                .map(p -> PostMapper.toFrontend(p, currentUserId));
    }

    public PostDtos.PostResponse vote(Long postId, Long userId, int value) {
        if (value < -1 || value > 1) throw new IllegalArgumentException("Invalid vote value");
        Post post = getPostOrThrow(postId);
        PostVote vote = voteRepository.findByPostAndUserId(post, userId)
                .orElseGet(() -> {
                    PostVote v = new PostVote();
                    v.setPost(post);
                    v.setUserId(userId);
                    v.setValue(0);
                    return v;
                });
        if (vote.getId() == null) {
            post.getVotes().add(vote);
        }
        int previous = vote.getValue();
        if (previous == value) {
            vote.setValue(0); // toggle off
        } else {
            vote.setValue(value);
        }
        voteRepository.save(vote);

        // Publish POST_UPVOTED XP event only when transition ends with +1 and was not +1 before
        if (post.getAuthorId() != null && !post.getAuthorId().equals(userId)) {
            if (vote.getValue() == 1 && previous != 1) {
                try {
                    Map<String, Object> event = new HashMap<>();
                    event.put("type", "POST_UPVOTED");
                    // Deterministic eventId prevents multiple XP grants per user per post upvote
                    event.put("eventId", "POST_UPVOTED:" + postId + ":" + userId);
                    event.put("userId", post.getAuthorId()); // XP receiver (post author)
                    event.put("actorUserId", userId); // who upvoted
                    event.put("postId", postId);
                    event.put("occurredAt", Instant.now().toString());
                    rabbitTemplate.convertAndSend(xpExchange, postUpvoteRoutingKey, event);
                } catch (Exception ex) {
                    // Log but do not fail user action
                    System.err.println("Failed to publish POST_UPVOTED event: " + ex.getMessage());
                }
            }
        }
        return PostMapper.toResponse(post, userId);
    }

    public PostDtos.FrontendPost voteFrontend(Long postId, Long userId, int value) {
        PostDtos.PostResponse base = vote(postId, userId, value);
        Post post = getPostOrThrow(base.id());
        return PostMapper.toFrontend(post, userId);
    }

    private void applyReferences(Post post) {
        Matcher m = MANGA_REF_PATTERN.matcher(post.getContent());
        while (m.find()) {
            Long mangaId = Long.parseLong(m.group(1));
            PostReference ref = new PostReference();
            ref.setPost(post);
            ref.setType("MANGA");
            ref.setRefId(mangaId);
            post.getReferences().add(ref);
        }
    }

    private Post getPostOrThrow(Long id) {
        return postRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Post not found"));
    }
}
