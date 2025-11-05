package shadowshift.studio.mangaservice.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import shadowshift.studio.mangaservice.entity.Manga;

/**
 * Расширенный контракт репозитория для построения сложных фильтров каталога
 * с поддержкой динамической сортировки.
 */
public interface MangaRepositoryCustom {

    Page<Manga> findAllWithFiltersAdaptive(
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
    );
}
