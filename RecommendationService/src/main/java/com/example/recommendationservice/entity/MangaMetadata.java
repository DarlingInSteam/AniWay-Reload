package com.example.recommendationservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "manga_metadata")
@Data
public class MangaMetadata {

    @Id
    @Column(name = "manga_id")
    private Long mangaId;
}
