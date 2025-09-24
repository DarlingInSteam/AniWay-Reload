package com.aniway.post.repo;

import com.aniway.post.model.Post;
import com.aniway.post.model.PostVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostVoteRepository extends JpaRepository<PostVote, Long> {
    Optional<PostVote> findByPostAndUserId(Post post, Long userId);
    long countByPostAndValue(Post post, int value);
}
