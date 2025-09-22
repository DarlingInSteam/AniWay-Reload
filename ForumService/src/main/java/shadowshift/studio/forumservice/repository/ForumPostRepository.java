package shadowshift.studio.forumservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.forumservice.entity.ForumPost;

import java.util.List;
import java.util.Optional;

@Repository
public interface ForumPostRepository extends JpaRepository<ForumPost, Long> {
    
    /**
     * Найти посты в теме с пагинацией, не удаленные
     */
    @Query("SELECT p FROM ForumPost p WHERE p.threadId = :threadId AND p.isDeleted = false ORDER BY p.createdAt ASC")
    Page<ForumPost> findByThreadIdAndNotDeleted(@Param("threadId") Long threadId, Pageable pageable);
    
    /**
     * Найти пост по ID, не удаленный
     */
    @Query("SELECT p FROM ForumPost p WHERE p.id = :id AND p.isDeleted = false")
    Optional<ForumPost> findByIdAndNotDeleted(@Param("id") Long id);
    
    /**
     * Найти посты автора
     */
    @Query("SELECT p FROM ForumPost p WHERE p.authorId = :authorId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    Page<ForumPost> findByAuthorIdAndNotDeleted(@Param("authorId") Long authorId, Pageable pageable);
    
    /**
     * Найти ответы на конкретный пост
     */
    @Query("SELECT p FROM ForumPost p WHERE p.parentPostId = :parentPostId AND p.isDeleted = false ORDER BY p.createdAt ASC")
    List<ForumPost> findRepliesByParentPostId(@Param("parentPostId") Long parentPostId);
    
    /**
     * Найти корневые посты в теме (без родительских постов)
     */
    @Query("SELECT p FROM ForumPost p WHERE p.threadId = :threadId AND p.parentPostId IS NULL AND p.isDeleted = false ORDER BY p.createdAt ASC")
    Page<ForumPost> findRootPostsByThreadId(@Param("threadId") Long threadId, Pageable pageable);
    
    /**
     * Подсчитать количество постов в теме
     */
    @Query("SELECT COUNT(p) FROM ForumPost p WHERE p.threadId = :threadId AND p.isDeleted = false")
    Long countByThreadIdAndNotDeleted(@Param("threadId") Long threadId);
    
    /**
     * Найти последний пост в теме
     */
    @Query("SELECT p FROM ForumPost p WHERE p.threadId = :threadId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    List<ForumPost> findLastPostInThread(@Param("threadId") Long threadId, Pageable pageable);
    
    /**
     * Поиск постов по тексту
     */
    @Query(value = "SELECT * FROM forum_posts p WHERE p.is_deleted = false AND " +
                   "p.search_vector @@ to_tsquery('russian', :searchQuery) " +
                   "ORDER BY ts_rank(p.search_vector, to_tsquery('russian', :searchQuery)) DESC",
           nativeQuery = true)
    Page<ForumPost> searchByText(@Param("searchQuery") String searchQuery, Pageable pageable);
    
    /**
     * Найти посты автора в определенной теме
     */
    @Query("SELECT p FROM ForumPost p WHERE p.authorId = :authorId AND p.threadId = :threadId AND p.isDeleted = false ORDER BY p.createdAt DESC")
    List<ForumPost> findByAuthorIdAndThreadIdAndNotDeleted(@Param("authorId") Long authorId, @Param("threadId") Long threadId);
    
    /**
     * Найти все дочерние посты для списка родительских постов
     */
    @Query("SELECT p FROM ForumPost p WHERE p.parentPostId IN :parentPostIds AND p.isDeleted = false ORDER BY p.parentPostId, p.createdAt ASC")
    List<ForumPost> findAllRepliesByParentPostIds(@Param("parentPostIds") List<Long> parentPostIds);
    
    /**
     * Проверить, есть ли у поста ответы
     */
    @Query("SELECT COUNT(p) > 0 FROM ForumPost p WHERE p.parentPostId = :postId AND p.isDeleted = false")
    boolean hasReplies(@Param("postId") Long postId);

    /**
     * Подсчитать количество постов во всех темах категории
     */
    @Query("SELECT COUNT(p) FROM ForumPost p WHERE p.threadId IN (SELECT t.id FROM ForumThread t WHERE t.categoryId = :categoryId AND t.isDeleted = false) AND p.isDeleted = false")
    Long countPostsByCategoryId(@Param("categoryId") Long categoryId);
}