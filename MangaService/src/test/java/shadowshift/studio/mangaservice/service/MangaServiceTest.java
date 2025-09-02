package shadowshift.studio.mangaservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.mapper.MangaMapper;
import shadowshift.studio.mangaservice.repository.MangaRepository;
import shadowshift.studio.mangaservice.service.external.ChapterServiceClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Профессиональные unit-тесты для MangaService.
 *
 * Демонстрируют лучшие практики тестирования:
 * - Использование AssertJ для выразительных assertions
 * - Группировка тестов с @Nested
 * - Описательные имена тестов с @DisplayName
 * - Правильное использование моков
 * - Тестирование граничных случаев
 * - Проверка исключений
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MangaService Unit Tests")
class MangaServiceTest {

    @Mock private MangaRepository mangaRepository;
    @Mock private ChapterServiceClient chapterServiceClient;
    @Mock private MangaMapper mangaMapper;
    @Mock private MangaServiceProperties properties;

    @InjectMocks private MangaService mangaService;

    private MangaCreateDTO createDTO;
    private Manga manga;
    private MangaResponseDTO responseDTO;

    @BeforeEach
    void setUp() {
        // Настройка тестовых данных
        createDTO = new MangaCreateDTO();
        createDTO.setTitle("Test Manga");
        createDTO.setDescription("Test Description");
        createDTO.setAuthor("Test Author");
        createDTO.setGenres("Action, Adventure");
        createDTO.setStatus("ONGOING");

        manga = new Manga();
        manga.setId(1L);
        manga.setTitle("Test Manga");
        manga.setDescription("Test Description");
        manga.setAuthor("Test Author");
        manga.setGenres("Action, Adventure");
        manga.setStatus("ONGOING");
        manga.setCreatedAt(LocalDateTime.now());

        responseDTO = new MangaResponseDTO();
        responseDTO.setId(1L);
        responseDTO.setTitle("Test Manga");
        responseDTO.setDescription("Test Description");
        responseDTO.setAuthor("Test Author");
        responseDTO.setGenres("Action, Adventure");
        responseDTO.setStatus("ONGOING");
        responseDTO.setTotalChapters(0);
    }

    @Nested
    @DisplayName("Create Manga Tests")
    class CreateMangaTests {

        @Test
        @DisplayName("Should create manga successfully with valid data")
        void shouldCreateMangaSuccessfully() {
            // Given
            when(mangaRepository.existsByTitle(createDTO.getTitle())).thenReturn(false);
            when(mangaMapper.toEntity(createDTO)).thenReturn(manga);
            when(mangaRepository.save(manga)).thenReturn(manga);
            when(mangaMapper.toResponseDTO(manga)).thenReturn(responseDTO);

            // When
            MangaResponseDTO result = mangaService.createManga(createDTO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTitle()).isEqualTo("Test Manga");
            assertThat(result.getAuthor()).isEqualTo("Test Author");

            verify(mangaRepository).existsByTitle(createDTO.getTitle());
            verify(mangaRepository).save(manga);
            verify(mangaMapper).toEntity(createDTO);
            verify(mangaMapper).toResponseDTO(manga);
        }

        @Test
        @DisplayName("Should throw validation exception when manga with same title exists")
        void shouldThrowExceptionWhenTitleExists() {
            // Given
            when(mangaRepository.existsByTitle(createDTO.getTitle())).thenReturn(true);

            // When & Then
            assertThatThrownBy(() -> mangaService.createManga(createDTO))
                .isInstanceOf(MangaValidationException.class)
                .hasMessageContaining("уже существует");

            verify(mangaRepository).existsByTitle(createDTO.getTitle());
            verify(mangaRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw exception when createDTO is null")
        void shouldThrowExceptionWhenCreateDTOIsNull() {
            // When & Then
            assertThatThrownBy(() -> mangaService.createManga(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("не может быть null");

            verify(mangaRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Get Manga Tests")
    class GetMangaTests {

        @Test
        @DisplayName("Should return manga when ID exists")
        void shouldReturnMangaWhenIdExists() {
            // Given
            Long mangaId = 1L;
            when(mangaRepository.findById(mangaId)).thenReturn(Optional.of(manga));
            when(mangaMapper.toResponseDTO(manga)).thenReturn(responseDTO);
            when(properties.getChapterCountCacheEnabled()).thenReturn(false);

            // When
            Optional<MangaResponseDTO> result = mangaService.getMangaById(mangaId);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(mangaId);
            assertThat(result.get().getTitle()).isEqualTo("Test Manga");

            verify(mangaRepository).findById(mangaId);
            verify(mangaMapper).toResponseDTO(manga);
        }

        @Test
        @DisplayName("Should return empty when manga not found")
        void shouldReturnEmptyWhenMangaNotFound() {
            // Given
            Long mangaId = 999L;
            when(mangaRepository.findById(mangaId)).thenReturn(Optional.empty());

            // When
            Optional<MangaResponseDTO> result = mangaService.getMangaById(mangaId);

            // Then
            assertThat(result).isEmpty();
            verify(mangaRepository).findById(mangaId);
            verify(mangaMapper, never()).toResponseDTO(any());
        }

        @Test
        @DisplayName("Should throw exception for invalid ID")
        void shouldThrowExceptionForInvalidId() {
            // When & Then
            assertThatThrownBy(() -> mangaService.getMangaById(-1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("положительным числом");

            verify(mangaRepository, never()).findById(any());
        }
    }

    @Nested
    @DisplayName("Update Manga Tests")
    class UpdateMangaTests {

        @Test
        @DisplayName("Should update manga successfully")
        void shouldUpdateMangaSuccessfully() {
            // Given
            Long mangaId = 1L;
            createDTO.setTitle("Updated Title");

            when(mangaRepository.findById(mangaId)).thenReturn(Optional.of(manga));
            when(mangaRepository.existsByTitle("Updated Title")).thenReturn(false);
            when(mangaRepository.save(manga)).thenReturn(manga);
            when(mangaMapper.toResponseDTO(manga)).thenReturn(responseDTO);
            doNothing().when(mangaMapper).updateEntity(manga, createDTO);

            // When
            Optional<MangaResponseDTO> result = mangaService.updateManga(mangaId, createDTO);

            // Then
            assertThat(result).isPresent();

            verify(mangaRepository).findById(mangaId);
            verify(mangaMapper).updateEntity(manga, createDTO);
            verify(mangaRepository).save(manga);
        }

        @Test
        @DisplayName("Should return empty when manga not found for update")
        void shouldReturnEmptyWhenMangaNotFoundForUpdate() {
            // Given
            Long mangaId = 999L;
            when(mangaRepository.findById(mangaId)).thenReturn(Optional.empty());

            // When
            Optional<MangaResponseDTO> result = mangaService.updateManga(mangaId, createDTO);

            // Then
            assertThat(result).isEmpty();
            verify(mangaRepository).findById(mangaId);
            verify(mangaRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Delete Manga Tests")
    class DeleteMangaTests {

        @Test
        @DisplayName("Should delete manga successfully")
        void shouldDeleteMangaSuccessfully() {
            // Given
            Long mangaId = 1L;
            when(mangaRepository.findById(mangaId)).thenReturn(Optional.of(manga));
            doNothing().when(mangaRepository).deleteById(mangaId);

            // When
            assertThatCode(() -> mangaService.deleteManga(mangaId))
                .doesNotThrowAnyException();

            // Then
            verify(mangaRepository).findById(mangaId);
            verify(mangaRepository).deleteById(mangaId);
        }

        @Test
        @DisplayName("Should throw exception when manga not found for deletion")
        void shouldThrowExceptionWhenMangaNotFoundForDeletion() {
            // Given
            Long mangaId = 999L;
            when(mangaRepository.findById(mangaId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> mangaService.deleteManga(mangaId))
                .isInstanceOf(MangaNotFoundException.class);

            verify(mangaRepository).findById(mangaId);
            verify(mangaRepository, never()).deleteById(any());
        }
    }

    @Nested
    @DisplayName("Get All Manga Tests")
    class GetAllMangaTests {

        @Test
        @DisplayName("Should return all manga successfully")
        void shouldReturnAllMangaSuccessfully() {
            // Given
            List<Manga> mangaList = List.of(manga);
            List<MangaResponseDTO> responseDTOs = List.of(responseDTO);

            when(mangaRepository.findAllOrderByCreatedAtDesc()).thenReturn(mangaList);
            when(mangaMapper.toResponseDTOList(mangaList)).thenReturn(responseDTOs);
            when(properties.getChapterCountCacheEnabled()).thenReturn(false);

            // When
            List<MangaResponseDTO> result = mangaService.getAllManga();

            // Then
            assertThat(result).isNotEmpty();
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getTitle()).isEqualTo("Test Manga");

            verify(mangaRepository).findAllOrderByCreatedAtDesc();
            verify(mangaMapper).toResponseDTOList(mangaList);
        }

        @Test
        @DisplayName("Should return empty list when no manga exists")
        void shouldReturnEmptyListWhenNoMangaExists() {
            // Given
            when(mangaRepository.findAllOrderByCreatedAtDesc()).thenReturn(List.of());
            when(mangaMapper.toResponseDTOList(any())).thenReturn(List.of());
            when(properties.getChapterCountCacheEnabled()).thenReturn(false);

            // When
            List<MangaResponseDTO> result = mangaService.getAllManga();

            // Then
            assertThat(result).isEmpty();
            verify(mangaRepository).findAllOrderByCreatedAtDesc();
        }
    }
}
