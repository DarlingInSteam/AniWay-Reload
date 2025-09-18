package shadowshift.studio.mangaservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.mangaservice.entity.Genre;
import shadowshift.studio.mangaservice.repository.GenreRepository;

import java.util.List;
import java.util.Optional;

/**
 * Сервис для работы с жанрами манги.
 * Предоставляет бизнес-логику для управления жанрами.
 *
 * @author ShadowShiftStudio
 */
@Service
@Transactional
public class GenreService {

    private final GenreRepository genreRepository;

    /**
     * Конструктор сервиса жанров.
     *
     * @param genreRepository репозиторий жанров
     */
    @Autowired
    public GenreService(GenreRepository genreRepository) {
        this.genreRepository = genreRepository;
    }

    /**
     * Получает все жанры.
     *
     * @return список всех жанров
     */
    @Transactional(readOnly = true)
    public List<Genre> getAllGenres() {
        return genreRepository.findAllByOrderByNameAsc();
    }

    /**
     * Получает жанры с мангами.
     *
     * @return список активных жанров
     */
    @Transactional(readOnly = true)
    public List<Genre> getActiveGenres() {
        return genreRepository.findGenresWithMangas();
    }

    /**
     * Получает жанр по ID.
     *
     * @param id идентификатор жанра
     * @return Optional с найденным жанром
     */
    @Transactional(readOnly = true)
    public Optional<Genre> getGenreById(Long id) {
        return genreRepository.findById(id);
    }

    /**
     * Получает жанр по названию.
     *
     * @param name название жанра
     * @return Optional с найденным жанром
     */
    @Transactional(readOnly = true)
    public Optional<Genre> getGenreByName(String name) {
        return genreRepository.findByName(name);
    }

    /**
     * Получает жанр по slug.
     *
     * @param slug slug жанра
     * @return Optional с найденным жанром
     */
    @Transactional(readOnly = true)
    public Optional<Genre> getGenreBySlug(String slug) {
        return genreRepository.findBySlug(slug);
    }

    /**
     * Поиск жанров по названию.
     *
     * @param query строка поиска
     * @return список найденных жанров
     */
    @Transactional(readOnly = true)
    public List<Genre> searchGenres(String query) {
        return genreRepository.findByNameContainingIgnoreCase(query);
    }

    /**
     * Получает популярные жанры.
     *
     * @param limit количество жанров
     * @return список популярных жанров
     */
    @Transactional(readOnly = true)
    public List<Genre> getPopularGenres(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        Page<Genre> page = genreRepository.findTopByMangaCount(pageable);
        return page.getContent();
    }

    /**
     * Получает жанры для автодополнения.
     *
     * @param query строка поиска
     * @param limit максимальное количество результатов
     * @return список жанров для автодополнения
     */
    @Transactional(readOnly = true)
    public List<Genre> getGenresForAutocomplete(String query, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        Page<Genre> page = genreRepository.findForAutocomplete(query, pageable);
        return page.getContent();
    }

    /**
     * Создает новый жанр или возвращает существующий.
     *
     * @param name название жанра
     * @return созданный или найденный жанр
     */
    public Genre createOrGetGenre(String name) {
        return genreRepository.findByName(name)
                .orElseGet(() -> {
                    Genre newGenre = new Genre(name);
                    return genreRepository.save(newGenre);
                });
    }

    /**
     * Создает новый жанр с описанием или возвращает существующий.
     *
     * @param name название жанра
     * @param description описание жанра
     * @return созданный или найденный жанр
     */
    public Genre createOrGetGenre(String name, String description) {
        return genreRepository.findByName(name)
                .orElseGet(() -> {
                    Genre newGenre = new Genre(name, description);
                    return genreRepository.save(newGenre);
                });
    }

    /**
     * Создает несколько жанров из списка названий.
     *
     * @param genreNames список названий жанров
     * @return список созданных/найденных жанров
     */
    public List<Genre> createOrGetGenres(List<String> genreNames) {
        return genreNames.stream()
                .distinct()
                .map(this::createOrGetGenre)
                .toList();
    }

    /**
     * Сохраняет жанр.
     *
     * @param genre жанр для сохранения
     * @return сохраненный жанр
     */
    public Genre saveGenre(Genre genre) {
        return genreRepository.save(genre);
    }

    /**
     * Обновляет жанр.
     *
     * @param id идентификатор жанра
     * @param updatedGenre обновленные данные жанра
     * @return обновленный жанр
     * @throws RuntimeException если жанр не найден
     */
    public Genre updateGenre(Long id, Genre updatedGenre) {
        Genre existingGenre = genreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Genre not found with id: " + id));

        existingGenre.setName(updatedGenre.getName());
        existingGenre.setDescription(updatedGenre.getDescription());

        return genreRepository.save(existingGenre);
    }

    /**
     * Удаляет жанр по ID.
     *
     * @param id идентификатор жанра
     * @throws RuntimeException если жанр не найден
     */
    public void deleteGenre(Long id) {
        if (!genreRepository.existsById(id)) {
            throw new RuntimeException("Genre not found with id: " + id);
        }
        genreRepository.deleteById(id);
    }

    /**
     * Проверяет существование жанра по названию.
     *
     * @param name название жанра
     * @return true если жанр существует
     */
    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        return genreRepository.existsByName(name);
    }

    /**
     * Получает количество всех жанров.
     *
     * @return общее количество жанров
     */
    @Transactional(readOnly = true)
    public long getTotalGenresCount() {
        return genreRepository.countAllGenres();
    }

    /**
     * Получает количество активных жанров.
     *
     * @return количество активных жанров
     */
    @Transactional(readOnly = true)
    public long getActiveGenresCount() {
        return genreRepository.countActiveGenres();
    }

    /**
     * Получает жанры по списку ID.
     *
     * @param ids список идентификаторов
     * @return список найденных жанров
     */
    @Transactional(readOnly = true)
    public List<Genre> getGenresByIds(List<Long> ids) {
        return genreRepository.findByIdIn(ids);
    }

    /**
     * Получает популярные жанры с минимальным количеством манг.
     *
     * @param minMangaCount минимальное количество манг
     * @return список популярных жанров
     */
    @Transactional(readOnly = true)
    public List<Genre> getPopularGenres(Integer minMangaCount) {
        return genreRepository.findPopularGenres(minMangaCount);
    }
}