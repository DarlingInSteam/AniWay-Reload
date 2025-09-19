package shadowshift.studio.authservice.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.Bookmark;
import shadowshift.studio.authservice.entity.BookmarkStatus;

import java.util.ArrayList;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class BookmarkRepositoryImpl implements BookmarkRepositoryCustom {

    @PersistenceContext
    private final EntityManager entityManager;

    @Override
    public List<Bookmark> searchBookmarks(Long userId,
                                          String query,
                                          BookmarkStatus status,
                                          Boolean favorite,
                                          String sortBy,
                                          String sortOrder) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Bookmark> cq = cb.createQuery(Bookmark.class);
        Root<Bookmark> root = cq.from(Bookmark.class);

        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("userId"), userId));

        if (status != null) {
            predicates.add(cb.equal(root.get("status"), status));
        }
        if (favorite != null) {
            if (favorite) predicates.add(cb.isTrue(root.get("isFavorite")));
            else predicates.add(cb.isFalse(root.get("isFavorite")));
        }
        if (query != null && !query.isBlank()) {
            String like = "%" + query.toLowerCase() + "%";
            predicates.add(cb.like(cb.lower(root.get("mangaTitle")), like));
        }

        cq.where(predicates.toArray(new Predicate[0]));

        // Sorting
        boolean asc = "asc".equalsIgnoreCase(sortOrder);
        String sortField = switch (sortBy == null ? "bookmark_updated" : sortBy) {
            case "manga_updated" -> "mangaUpdatedAt";
            case "chapters_count" -> "totalChapters";
            case "alphabetical" -> "mangaTitle";
            case "bookmark_updated" -> "updatedAt";
            default -> "updatedAt";
        };

        if (asc) cq.orderBy(cb.asc(root.get(sortField))); else cq.orderBy(cb.desc(root.get(sortField)));

        return entityManager.createQuery(cq).getResultList();
    }
}
