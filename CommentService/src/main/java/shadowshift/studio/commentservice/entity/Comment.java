package shadowshift.studio.commentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.CommentType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Сущность комментария с поддержкой древовидной структуры и реакций.
 * Таблица: comments с индексами для оптимизации запросов.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "comments", indexes = {
    @Index(name = "idx_comments_type_target", columnList = "comment_type,target_id"),
    @Index(name = "idx_comments_user_id", columnList = "user_id"),
    @Index(name = "idx_comments_parent_id", columnList = "parent_comment_id"),
    @Index(name = "idx_comments_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {

    /** Уникальный идентификатор комментария */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Содержимое комментария */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Тип комментария (определяет к какому объекту относится) */
    @Convert(converter = shadowshift.studio.commentservice.entity.converter.CommentTypeConverter.class)
    @Column(name = "comment_type", nullable = false)
    private CommentType commentType;

    /** Идентификатор целевого объекта (манга, глава и т.д.) */
    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** Идентификатор автора комментария */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Родительский комментарий для древовидной структуры (ответы) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private Comment parentComment;

    /** Список ответов на этот комментарий */
    @OneToMany(mappedBy = "parentComment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Comment> replies = new ArrayList<>();

    /** Список реакций на этот комментарий */
    @OneToMany(mappedBy = "comment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CommentReaction> reactions = new ArrayList<>();

    /** Количество лайков на комментарий */
    @Column(name = "likes_count")
    @Builder.Default
    private Integer likesCount = 0;

    /** Количество дизлайков на комментарий */
    @Column(name = "dislikes_count")
    @Builder.Default
    private Integer dislikesCount = 0;

    /** Флаг, указывающий, был ли комментарий отредактирован */
    @Column(name = "is_edited")
    @Builder.Default
    private Boolean isEdited = false;

    /** Флаг, указывающий, был ли комментарий удален */
    @Column(name = "is_deleted")
    @Builder.Default
    private Boolean isDeleted = false;

    /** Дата и время создания комментария */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Дата и время последнего обновления комментария */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** Дата и время удаления комментария (мягкое удаление) */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Метод, вызываемый перед сохранением сущности в базу данных.
     * Устанавливает временные отметки создания и обновления.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    /**
     * Метод, вызываемый перед обновлением сущности в базе данных.
     * Обновляет временную отметку последнего изменения.
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Проверяет, можно ли редактировать комментарий.
     * Комментарий можно редактировать в течение 7 дней после создания и если он не удален.
     *
     * @return true, если комментарий можно редактировать
     */
    public boolean canBeEdited() {
        return !isDeleted && createdAt.isAfter(LocalDateTime.now().minusDays(7));
    }

    /**
     * Проверяет, является ли комментарий корневым (не ответом на другой комментарий).
     *
     * @return true, если комментарий является корневым
     */
    public boolean isRootComment() {
        return parentComment == null;
    }

    /**
     * Получает уровень вложенности комментария в древовидной структуре.
     *
     * @return уровень вложенности (0 для корневых комментариев)
     */
    public int getDepthLevel() {
        int depth = 0;
        Comment current = this.parentComment;
        while (current != null) {
            depth++;
            current = current.getParentComment();
        }
        return depth;
    }

    /**
     * Получить тип комментария.
     * Метод для совместимости с внешними сервисами.
     *
     * @return тип комментария
     */
    public CommentType getType() {
        return this.commentType;
    }

    /**
     * Получить идентификатор родительского комментария.
     * Метод для совместимости с внешними сервисами.
     *
     * @return идентификатор родительского комментария или null
     */
    public Long getParentCommentId() {
        return this.parentComment != null ? this.parentComment.getId() : null;
    }

    /**
     * Установить дату удаления комментария.
     * Также автоматически устанавливает флаг isDeleted.
     *
     * @param deletedAt дата удаления или null для восстановления
     */
    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
        this.isDeleted = (deletedAt != null);
    }

    /**
     * Статический класс билдера для создания экземпляров Comment.
     * Предоставляет fluent API для удобного создания объектов с дополнительными методами.
     */
    public static class CommentBuilder {
        /**
         * Установить тип комментария.
         * Метод для совместимости с внешними сервисами.
         *
         * @param type тип комментария
         * @return билдер для цепочки вызовов
         */
        public CommentBuilder type(CommentType type) {
            this.commentType = type;
            return this;
        }
    }
}
