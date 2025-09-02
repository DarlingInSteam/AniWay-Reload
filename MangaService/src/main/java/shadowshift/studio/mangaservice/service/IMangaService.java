package shadowshift.studio.mangaservice.service;

import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;

import java.util.List;
import java.util.Optional;

/**
 * Интерфейс сервиса для управления мангой.
 *
 * Определяет контракт для всех операций с мангой, обеспечивая
 * слабую связанность и возможность легкого тестирования через моки.
 * Следует принципу инверсии зависимостей из SOLID.
 *
 * @author AniWay Development Team
 * @version 2.0.0
 * @since 1.0.0
 */
public interface IMangaService {

    /**
     * Получает список всех манг в системе.
     *
     * @return список DTO с информацией о всех манг��х
     */
    List<MangaResponseDTO> getAllManga();

    /**
     * Поиск манги по различным критериям.
     *
     * Позволяет искать мангу по названию, автору, жанру и статусу.
     * Все параметры являются опциональными и могут комбинироваться.
     * Поиск выполняется с игнорированием регистра для строковых параметров.
     *
     * @param title название манги (частичное совпадение)
     * @param author автор манги (частичное совпадение)
     * @param genre жанр манги (частичное совпадение)
     * @param status статус манги (точное совпадение)
     * @return список DTO с найденными мангами
     */
    List<MangaResponseDTO> searchManga(String title, String author, String genre, String status);

    /**
     * Получает информацию о конкретной манге по её идентификатору.
     *
     * @param id идентификатор манги
     * @return Optional с DTO манги, если найдена
     * @throws IllegalArgumentException если id некорректен
     */
    Optional<MangaResponseDTO> getMangaById(Long id);

    /**
     * Создает новую мангу в системе.
     *
     * @param createDTO DTO с данными для создания манги
     * @return DTO созданной манги
     * @throws IllegalArgumentException если createDTO равен null
     * @throws MangaValidationException если данные не прошли валидацию
     */
    MangaResponseDTO createManga(MangaCreateDTO createDTO);

    /**
     * Обновляет существующую мангу.
     *
     * @param id идентификатор обновляемой манги
     * @param updateDTO DTO с новыми данными
     * @return Optional с DTO обновленной манги
     * @throws IllegalArgumentException если ��араметры некорректны
     * @throws MangaValidationException если данные не прошли валидацию
     */
    Optional<MangaResponseDTO> updateManga(Long id, MangaCreateDTO updateDTO);

    /**
     * Удаляет мангу из системы.
     *
     * @param id идентификатор удаляемой манги
     * @throws IllegalArgumentException если id некорректен
     */
    void deleteManga(Long id);

    /**
     * Обновляет URL обложки манги.
     *
     * @param mangaId идентификатор манги
     * @param imageUrl новый URL изображения обложки
     * @throws IllegalArgumentException если параметры некорректны
     * @throws MangaNotFoundException если манга не найдена
     */
    void updateCoverImage(Long mangaId, String imageUrl);
}
