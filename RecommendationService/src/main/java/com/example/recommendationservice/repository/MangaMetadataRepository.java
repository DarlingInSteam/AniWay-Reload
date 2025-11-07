package com.example.recommendationservice.repository;

import com.example.recommendationservice.entity.MangaMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MangaMetadataRepository extends JpaRepository<MangaMetadata, Long> {
    Optional<MangaMetadata> findByMangaId(Long mangaId);
}
