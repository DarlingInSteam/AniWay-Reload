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
import org.springframework.stereotype.Service;
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

    private static final Pattern MANGA_REF_PATTERN = Pattern.compile("\\[\\[manga:(\\d+)]]");

    public PostService(PostRepository postRepository, PostVoteRepository voteRepository, PostReferenceRepository referenceRepository) {
        this.postRepository = postRepository;
        this.voteRepository = voteRepository;
        this.referenceRepository = referenceRepository;
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
        if (vote.getValue() == value) {
            vote.setValue(0); // toggle off
        } else {
            vote.setValue(value);
        }
        voteRepository.save(vote);
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
