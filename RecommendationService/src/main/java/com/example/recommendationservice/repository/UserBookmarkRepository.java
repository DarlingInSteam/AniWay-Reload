package com.example.recommendationservice.repository;

import com.example.recommendationservice.entity.UserBookmark;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserBookmarkRepository extends JpaRepository<UserBookmark, Long> {
    List<UserBookmark> findByUserId(Long userId);
    Optional<UserBookmark> findByUserIdAndMangaId(Long userId, Long mangaId);
    void deleteByUserIdAndMangaId(Long userId, Long mangaId);
}
