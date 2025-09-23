package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.mangaservice.dto.GenreDto;
import shadowshift.studio.mangaservice.entity.Genre;
import shadowshift.studio.mangaservice.service.GenreService;

import java.util.List;
import java.util.Optional;

/**
 * REST контроллер для работы с жанрами манги.
 * Предоставляет API endpoints для управления жанрами.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/genres")
@CrossOrigin(origins = "*")
public class GenreController {

    private final GenreService genreService;

    /**
     * Конструктор контроллера жанров.
     *
     * @param genreService сервис жанров
     */
    @Autowired
    public GenreController(GenreService genreService) {
        this.genreService = genreService;
    }

    /**
     * Получает все жанры.
     *
     * @return список всех жанров
     */
    @GetMapping
    public ResponseEntity<List<GenreDto>> getAllGenres() {
        List<Genre> genres = genreService.getAllGenres();
        List<GenreDto> genreDtos = genres.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(genreDtos);
    }

    /**
     * Получает активные жанры (с мангами).
     *
     * @return список активных жанров
     */
    @GetMapping("/active")
    public ResponseEntity<List<GenreDto>> getActiveGenres() {
        List<Genre> genres = genreService.getActiveGenres();
        List<GenreDto> genreDtos = genres.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(genreDtos);
    }

    /**
     * Получает популярные жанры.
     *
     * @param limit количество жанров (по умолчанию 20)
     * @return список популярных жанров
     */
    @GetMapping("/popular")
    public ResponseEntity<List<GenreDto>> getPopularGenres(
            @RequestParam(defaultValue = "20") int limit) {
        List<Genre> genres = genreService.getPopularGenres(limit);
        List<GenreDto> genreDtos = genres.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(genreDtos);
    }

    /**
     * Получает жанр по ID.
     *
     * @param id идентификатор жанра
     * @return найденный жанр или 404
     */
    @GetMapping("/{id}")
    public ResponseEntity<GenreDto> getGenreById(@PathVariable Long id) {
        Optional<Genre> genre = genreService.getGenreById(id);
        return genre.map(g -> ResponseEntity.ok(convertToDto(g)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получает жанр по slug.
     *
     * @param slug slug жанра
     * @return найденный жанр или 404
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<GenreDto> getGenreBySlug(@PathVariable String slug) {
        Optional<Genre> genre = genreService.getGenreBySlug(slug);
        return genre.map(g -> ResponseEntity.ok(convertToDto(g)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Поиск жанров по названию.
     *
     * @param query строка поиска
     * @return список найденных жанров
     */
    @GetMapping("/search")
    public ResponseEntity<List<GenreDto>> searchGenres(@RequestParam String query) {
        List<Genre> genres = genreService.searchGenres(query);
        List<GenreDto> genreDtos = genres.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(genreDtos);
    }

    /**
     * Автодополнение жанров.
     *
     * @param query строка поиска
     * @param limit максимальное количество результатов (по умолчанию 10)
     * @return список жанров для автодополнения
     */
    @GetMapping("/autocomplete")
    public ResponseEntity<List<GenreDto>> getGenresForAutocomplete(
            @RequestParam String query,
            @RequestParam(defaultValue = "10") int limit) {
        List<Genre> genres = genreService.getGenresForAutocomplete(query, limit);
        List<GenreDto> genreDtos = genres.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(genreDtos);
    }

    /**
     * Получает статистику по жанрам.
     *
     * @return статистика жанров
     */
    @GetMapping("/stats")
    public ResponseEntity<GenreStats> getGenreStats() {
        long totalGenres = genreService.getTotalGenresCount();
        long activeGenres = genreService.getActiveGenresCount();
        
        GenreStats stats = new GenreStats(totalGenres, activeGenres);
        return ResponseEntity.ok(stats);
    }

    /**
     * Создает новый жанр.
     *
     * @param genreDto данные нового жанра
     * @return созданный жанр
     */
    @PostMapping
    public ResponseEntity<GenreDto> createGenre(@RequestBody GenreDto genreDto) {
        Genre genre = new Genre(genreDto.getName(), genreDto.getDescription());
        Genre savedGenre = genreService.saveGenre(genre);
        return ResponseEntity.ok(convertToDto(savedGenre));
    }

    /**
     * Обновляет жанр.
     *
     * @param id идентификатор жанра
     * @param genreDto обновленные данные жанра
     * @return обновленный жанр или 404
     */
    @PutMapping("/{id}")
    public ResponseEntity<GenreDto> updateGenre(@PathVariable Long id, @RequestBody GenreDto genreDto) {
        try {
            Genre updatedGenre = new Genre(genreDto.getName(), genreDto.getDescription());
            Genre savedGenre = genreService.updateGenre(id, updatedGenre);
            return ResponseEntity.ok(convertToDto(savedGenre));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Удаляет жанр.
     *
     * @param id идентификатор жанра
     * @return статус операции
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGenre(@PathVariable Long id) {
        try {
            genreService.deleteGenre(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Конвертирует сущность Genre в DTO.
     *
     * @param genre сущность жанра
     * @return DTO жанра
     */
    private GenreDto convertToDto(Genre genre) {
        return new GenreDto(
                genre.getId(),
                genre.getName(),
                genre.getDescription(),
                genre.getSlug(),
                genre.getMangaCount()
        );
    }

    /**
     * Класс для статистики жанров.
     */
    public static class GenreStats {
        private final long totalGenres;
        private final long activeGenres;

        public GenreStats(long totalGenres, long activeGenres) {
            this.totalGenres = totalGenres;
            this.activeGenres = activeGenres;
        }

        public long getTotalGenres() { return totalGenres; }
        public long getActiveGenres() { return activeGenres; }
    }
}