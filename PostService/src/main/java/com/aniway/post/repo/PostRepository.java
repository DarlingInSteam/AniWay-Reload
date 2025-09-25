package com.aniway.post.repo;

import com.aniway.post.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);

    // Fetch top posts within a time window (createdAt >= since) ordered by score desc, upVotes desc, createdAt desc
    @Query("SELECT p FROM Post p LEFT JOIN p.votes v WHERE p.createdAt >= :since GROUP BY p.id ORDER BY (SUM(CASE WHEN v.value = 1 THEN 1 WHEN v.value = -1 THEN -1 ELSE 0 END)) DESC, SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END) DESC, p.createdAt DESC")
    List<Post> findTopSince(@Param("since") Instant since, Pageable pageable);

    // Fetch top posts all time
    @Query("SELECT p FROM Post p LEFT JOIN p.votes v GROUP BY p.id ORDER BY (SUM(CASE WHEN v.value = 1 THEN 1 WHEN v.value = -1 THEN -1 ELSE 0 END)) DESC, SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END) DESC, p.createdAt DESC")
    List<Post> findTopAll(Pageable pageable);
}
