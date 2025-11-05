package shadowshift.studio.mangaservice.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.AbstractQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

import shadowshift.studio.mangaservice.entity.Genre;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.entity.Tag;

/**
 * Реализация расширенного репозитория для гибкой фильтрации каталога манги.
 */
@Repository
public class MangaRepositoryImpl implements MangaRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Page<Manga> findAllWithFiltersAdaptive(
        List<String> genres,
        List<String> tags,
        String mangaType,
        String status,
        Integer ageRatingMin,
        Integer ageRatingMax,
        Double ratingMin,
        Double ratingMax,
        Integer releaseYearMin,
        Integer releaseYearMax,
        Integer chapterRangeMin,
        Integer chapterRangeMax,
        boolean strictMatch,
        Pageable pageable
    ) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        CriteriaQuery<Manga> cq = cb.createQuery(Manga.class);
        Root<Manga> root = cq.from(Manga.class);
        cq.distinct(true);

        List<Predicate> predicates = buildPredicates(
            cb,
            cq,
            root,
            genres,
            tags,
            mangaType,
            status,
            ageRatingMin,
            ageRatingMax,
            ratingMin,
            ratingMax,
            releaseYearMin,
            releaseYearMax,
            chapterRangeMin,
            chapterRangeMax,
            strictMatch
        );

        if (!predicates.isEmpty()) {
            cq.where(predicates.toArray(Predicate[]::new));
        }

        List<Order> orders = buildOrder(cb, root, pageable.getSort());
        cq.orderBy(orders);

        TypedQuery<Manga> typedQuery = entityManager.createQuery(cq);
        typedQuery.setFirstResult((int) pageable.getOffset());
        typedQuery.setMaxResults(pageable.getPageSize());
        List<Manga> content = typedQuery.getResultList();

        CriteriaQuery<Long> countQuery = cb.createQuery(Long.class);
        Root<Manga> countRoot = countQuery.from(Manga.class);
        countQuery.select(cb.countDistinct(countRoot));

        List<Predicate> countPredicates = buildPredicates(
            cb,
            countQuery,
            countRoot,
            genres,
            tags,
            mangaType,
            status,
            ageRatingMin,
            ageRatingMax,
            ratingMin,
            ratingMax,
            releaseYearMin,
            releaseYearMax,
            chapterRangeMin,
            chapterRangeMax,
            strictMatch
        );

        if (!countPredicates.isEmpty()) {
            countQuery.where(countPredicates.toArray(Predicate[]::new));
        }

        Long total = entityManager.createQuery(countQuery).getSingleResult();

        return new PageImpl<>(content, pageable, total);
    }

    private <Q extends AbstractQuery<?>> List<Predicate> buildPredicates(
        CriteriaBuilder cb,
        Q query,
        Root<Manga> root,
        List<String> genres,
        List<String> tags,
        String mangaType,
        String status,
        Integer ageRatingMin,
        Integer ageRatingMax,
        Double ratingMin,
        Double ratingMax,
        Integer releaseYearMin,
        Integer releaseYearMax,
        Integer chapterRangeMin,
        Integer chapterRangeMax,
        boolean strictMatch
    ) {
        List<Predicate> predicates = new ArrayList<>();

        if (mangaType != null && !mangaType.isBlank()) {
            try {
                Manga.MangaType enumValue = Manga.MangaType.valueOf(mangaType.toUpperCase(Locale.ROOT));
                predicates.add(cb.equal(root.get("type"), enumValue));
            } catch (IllegalArgumentException ignored) {
                // Некорректные значения игнорируются для обратной совместимости
            }
        }

        if (status != null && !status.isBlank()) {
            try {
                Manga.MangaStatus enumValue = Manga.MangaStatus.valueOf(status.toUpperCase(Locale.ROOT));
                predicates.add(cb.equal(root.get("status"), enumValue));
            } catch (IllegalArgumentException ignored) {
                // Некорректные значения игнорируются
            }
        }

        if (ageRatingMin != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.<Integer>get("ageLimit"), ageRatingMin));
        }
        if (ageRatingMax != null) {
            predicates.add(cb.lessThanOrEqualTo(root.<Integer>get("ageLimit"), ageRatingMax));
        }

        if (ratingMin != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.<Double>get("rating"), ratingMin));
        }
        if (ratingMax != null) {
            predicates.add(cb.lessThanOrEqualTo(root.<Double>get("rating"), ratingMax));
        }

        if (releaseYearMin != null && releaseYearMin > 0) {
            predicates.add(cb.greaterThanOrEqualTo(root.<LocalDate>get("releaseDate"), LocalDate.of(releaseYearMin, 1, 1)));
        }
        if (releaseYearMax != null && releaseYearMax > 0) {
            predicates.add(cb.lessThanOrEqualTo(root.<LocalDate>get("releaseDate"), LocalDate.of(releaseYearMax, 12, 31)));
        }

        if (chapterRangeMin != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.<Integer>get("totalChapters"), chapterRangeMin));
        }
        if (chapterRangeMax != null) {
            predicates.add(cb.lessThanOrEqualTo(root.<Integer>get("totalChapters"), chapterRangeMax));
        }

        List<String> normalizedGenres = normalizeValues(genres);
        List<String> normalizedTags = normalizeValues(tags);

        if (!normalizedGenres.isEmpty()) {
            if (strictMatch) {
                for (String genre : normalizedGenres) {
                    predicates.add(buildExistsPredicateForSingleValue(query, cb, root, genre, true));
                }
            } else {
                predicates.add(buildExistsPredicateForCollection(query, cb, root, normalizedGenres, true));
            }
        }

        if (!normalizedTags.isEmpty()) {
            if (strictMatch) {
                for (String tag : normalizedTags) {
                    predicates.add(buildExistsPredicateForSingleValue(query, cb, root, tag, false));
                }
            } else {
                predicates.add(buildExistsPredicateForCollection(query, cb, root, normalizedTags, false));
            }
        }

        return predicates;
    }

    private <Q extends AbstractQuery<?>> Predicate buildExistsPredicateForSingleValue(
        Q query,
        CriteriaBuilder cb,
        Root<Manga> root,
        String value,
        boolean isGenre
    ) {
        Subquery<Long> sub = query.subquery(Long.class);
        Root<Manga> subRoot = sub.from(Manga.class);
        if (isGenre) {
            Join<Manga, Genre> join = subRoot.join("genres", JoinType.INNER);
            sub.select(cb.literal(1L));
            sub.where(
                cb.equal(subRoot.get("id"), root.get("id")),
                cb.equal(join.get("name"), value)
            );
        } else {
            Join<Manga, Tag> join = subRoot.join("tags", JoinType.INNER);
            sub.select(cb.literal(1L));
            sub.where(
                cb.equal(subRoot.get("id"), root.get("id")),
                cb.equal(join.get("name"), value)
            );
        }
        return cb.exists(sub);
    }

    private <Q extends AbstractQuery<?>> Predicate buildExistsPredicateForCollection(
        Q query,
        CriteriaBuilder cb,
        Root<Manga> root,
        List<String> values,
        boolean isGenre
    ) {
        Subquery<Long> sub = query.subquery(Long.class);
        Root<Manga> subRoot = sub.from(Manga.class);
        if (isGenre) {
            Join<Manga, Genre> join = subRoot.join("genres", JoinType.INNER);
            sub.select(cb.literal(1L));
            sub.where(
                cb.equal(subRoot.get("id"), root.get("id")),
                join.get("name").in(values)
            );
        } else {
            Join<Manga, Tag> join = subRoot.join("tags", JoinType.INNER);
            sub.select(cb.literal(1L));
            sub.where(
                cb.equal(subRoot.get("id"), root.get("id")),
                join.get("name").in(values)
            );
        }
        return cb.exists(sub);
    }

    private List<String> normalizeValues(List<String> source) {
        if (source == null || source.isEmpty()) {
            return Collections.emptyList();
        }
        Set<String> unique = new HashSet<>();
        for (String value : source) {
            if (value == null) {
                continue;
            }
            String trimmed = value.trim();
            if (!trimmed.isEmpty()) {
                unique.add(trimmed);
            }
        }
        if (unique.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> normalized = new ArrayList<>(unique);
        Collections.sort(normalized);
        return normalized;
    }

    private List<Order> buildOrder(CriteriaBuilder cb, Root<Manga> root, Sort sort) {
        List<Order> orders = new ArrayList<>();
        if (sort == null || sort.isUnsorted()) {
            orders.add(cb.desc(root.get("createdAt")));
            orders.add(cb.desc(root.get("id")));
            return orders;
        }

        for (Sort.Order sortOrder : sort) {
            String property = sortOrder.getProperty();
            Expression<?> expression = resolveSortExpression(cb, root, property);
            if (expression == null) {
                continue;
            }
            Order order = sortOrder.isAscending() ? cb.asc(expression) : cb.desc(expression);
            orders.add(order);
        }

        if (orders.isEmpty()) {
            orders.add(cb.desc(root.get("createdAt")));
        }
        // Добавляем детерминированный tie-break
        orders.add(cb.desc(root.get("id")));
        return orders;
    }

    private Expression<?> resolveSortExpression(CriteriaBuilder cb, Root<Manga> root, String property) {
        if (property == null) {
            return null;
        }
        return switch (property) {
            case "title" -> root.get("title");
            case "author" -> root.get("author");
            case "createdAt" -> root.get("createdAt");
            case "updatedAt" -> root.get("updatedAt");
            case "views", "popularity" -> root.get("views");
            case "rating" -> root.get("rating");
            case "ratingCount" -> root.get("ratingCount");
            case "likes" -> root.get("likes");
            case "comments" -> root.get("comments");
            case "chapterCount" -> root.get("totalChapters");
            default -> null;
        };
    }
}
