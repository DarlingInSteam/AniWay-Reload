package shadowshift.studio.mangaservice.mapper;

import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.entity.Manga;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Компонент для преобразования между сущностями манги и объектами передачи данных (DTO).
 *
 * Этот маппер инкапсулирует логику преобразования, обеспечивая разделение
 * ответственности между слоями приложения и упрощая поддержку кода.
 * Следует принципу единственной ответственности SOLID.
 *
 * @author ShadowShiftStudio
 */
@Component
public class MangaMapper {

    /**
     * Преобразует DTO создания манги в сущность.
     *
     * Создает новую сущность Manga на основе данных из DTO,
     * устанавливая значения по умолчанию для необязательных полей.
     *
     * @param createDTO DTO с данными для создания манги
     * @return новая сущность Manga
     * @throws IllegalArgumentException если createDTO равен null
     */
    public Manga toEntity(MangaCreateDTO createDTO) {
        if (createDTO == null) {
            throw new IllegalArgumentException("DTO создания манги не может быть null");
        }

        Manga manga = new Manga();
        manga.setTitle(createDTO.getTitle());
        manga.setDescription(createDTO.getDescription());
        manga.setAuthor(createDTO.getAuthor());
        manga.setArtist(createDTO.getArtist());
        manga.setReleaseDate(createDTO.getReleaseDate());
        manga.setStatus(createDTO.getStatus() != null ? createDTO.getStatus() : Manga.MangaStatus.ONGOING);
        manga.setGenre(createDTO.getGenre());
    manga.setCoverImageUrl(createDTO.getCoverImageUrl());
    manga.setMelonSlug(normalizeSlug(createDTO.getMelonSlug()));

        return manga;
    }

    /**
     * Преобразует сущность манги в DTO ответа.
     *
     * Создает DTO для передачи данных о манге клиенту,
     * включая все необходимые поля сущности.
     *
     * @param manga сущность манги
     * @return DTO ответа с данными манги
     * @throws IllegalArgumentException если manga равен null
     */
    public MangaResponseDTO toResponseDTO(Manga manga) {
        if (manga == null) {
            throw new IllegalArgumentException("Сущность манги не может быть null");
        }

        return new MangaResponseDTO(manga);
    }

    /**
     * Преобразует список сущностей манги в список DTO ответов.
     *
     * Удобный метод для массового преобразования списков сущностей.
     *
     * @param mangaList список сущностей манги
     * @return список DTO ответов
     * @throws IllegalArgumentException если mangaList равен null
     */
    public List<MangaResponseDTO> toResponseDTOList(List<Manga> mangaList) {
        if (mangaList == null) {
            throw new IllegalArgumentException("Список манги не может быть null");
        }

        return mangaList.stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    /**
     * Обновляет существующую сущность данными из DTO обновления.
     *
     * Применяет изменения из DTO к существующей сущности,
     * сохраняя неизменные поля (например, ID, даты создания).
     *
     * @param existingManga существующая сущность для обновления
     * @param updateDTO DTO с новыми данными
     * @throws IllegalArgumentException если любой из параметров равен null
     */
    public void updateEntity(Manga existingManga, MangaCreateDTO updateDTO) {
        if (existingManga == null) {
            throw new IllegalArgumentException("Существующая сущность манги не может быть null");
        }
        if (updateDTO == null) {
            throw new IllegalArgumentException("DTO обновления манги не может быть null");
        }

        existingManga.setTitle(updateDTO.getTitle());
        existingManga.setDescription(updateDTO.getDescription());
        existingManga.setAuthor(updateDTO.getAuthor());
        existingManga.setArtist(updateDTO.getArtist());
        existingManga.setReleaseDate(updateDTO.getReleaseDate());

        if (updateDTO.getStatus() != null) {
            existingManga.setStatus(updateDTO.getStatus());
        }

        existingManga.setGenre(updateDTO.getGenre());
        existingManga.setCoverImageUrl(updateDTO.getCoverImageUrl());
        existingManga.setMelonSlug(normalizeSlug(updateDTO.getMelonSlug()));
    }

    private String normalizeSlug(String melonSlug) {
        if (!StringUtils.hasText(melonSlug)) {
            return null;
        }
        return melonSlug.trim();
    }
}
