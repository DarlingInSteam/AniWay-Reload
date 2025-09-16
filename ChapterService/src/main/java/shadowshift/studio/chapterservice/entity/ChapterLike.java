package shadowshift.studio.chapterservice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * Сущность, представляющая лайк пользователя к главе.
 * Каждый пользователь может лайкнуть главу только один раз.
 * Таблица: chapter_like с уникальным ограничением на комбинацию user_id и chapter_id.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "chapter_like", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "chapter_id"})
})
public class ChapterLike {

    /** Уникальный идентификатор лайка */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Идентификатор пользователя, поставившего лайк */
    @NotNull(message = "User ID is required")
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Идентификатор главы, к которой поставлен лайк */
    @NotNull(message = "Chapter ID is required")
    @Column(name = "chapter_id", nullable = false)
    private Long chapterId;

    /** Дата создания лайка */
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /**
     * Метод, вызываемый перед сохранением сущности в базу данных.
     * Устанавливает временную отметку создания.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    /**
     * Конструктор по умолчанию.
     */
    public ChapterLike() {}

    /**
     * Конструктор с параметрами.
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     */
    public ChapterLike(Long userId, Long chapterId) {
        this.userId = userId;
        this.chapterId = chapterId;
    }

    /**
     * Получить уникальный идентификатор лайка.
     *
     * @return идентификатор лайка
     */
    public Long getId() { return id; }

    /**
     * Установить уникальный идентификатор лайка.
     *
     * @param id идентификатор лайка
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Получить идентификатор пользователя.
     *
     * @return идентификатор пользователя
     */
    public Long getUserId() { return userId; }

    /**
     * Установить идентификатор пользователя.
     *
     * @param userId идентификатор пользователя
     */
    public void setUserId(Long userId) { this.userId = userId; }

    /**
     * Получить идентификатор главы.
     *
     * @return идентификатор главы
     */
    public Long getChapterId() { return chapterId; }

    /**
     * Установить идентификатор главы.
     *
     * @param chapterId идентификатор главы
     */
    public void setChapterId(Long chapterId) { this.chapterId = chapterId; }

    /**
     * Получить дату создания лайка.
     *
     * @return дата создания
     */
    public LocalDateTime getCreatedAt() { return createdAt; }

    /**
     * Установить дату создания лайка.
     *
     * @param createdAt дата создания
     */
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}