package shadowshift.studio.commentservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.commentservice.enums.ReactionType;

import java.time.LocalDateTime;

/**
 * Сущность реакции на комментарий (лайк/дизлайк).
 * Таблица: comment_reactions с уникальным ограничением на комбинацию comment_id и user_id.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "comment_reactions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "user_id"}),
       indexes = {
           @Index(name = "idx_comment_reactions_comment_id", columnList = "comment_id"),
           @Index(name = "idx_comment_reactions_user_id", columnList = "user_id")
       })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentReaction {

    /** Уникальный идентификатор реакции */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Комментарий, на который поставлена реакция */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private Comment comment;

    /** Идентификатор пользователя, поставившего реакцию */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Тип реакции (лайк или дизлайк) */
    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false)
    private ReactionType reactionType;

    /** Дата и время создания реакции */
    @Column(name = "created_at", nullable = false)
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
     * Статический класс билдера для создания экземпляров CommentReaction.
     * Предоставляет fluent API для удобного создания объектов с дополнительными методами.
     */
    public static class CommentReactionBuilder {
        /**
         * Установить идентификатор комментария.
         * Метод для совместимости с внешними сервисами.
         * Настройка связи с комментарием происходит через setComment().
         *
         * @param commentId идентификатор комментария
         * @return билдер для цепочки вызовов
         */
        public CommentReactionBuilder commentId(Long commentId) {
            // В данном контексте commentId используется для связи с Comment
            // Настройка происходит в сервисе через setComment()
            return this;
        }
    }
}
