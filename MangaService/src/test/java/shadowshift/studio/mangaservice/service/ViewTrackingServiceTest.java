package shadowshift.studio.mangaservice.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.repository.MangaRepository;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ViewTrackingServiceTest {

    @Mock
    private MangaRepository mangaRepository;

    @Mock
    private ViewTrackingService viewTrackingService;

    @InjectMocks
    private MangaService mangaService;

    @Test
    void incrementView_ShouldIncreaseCounters() {
        // Given
        Long mangaId = 1L;
        String userId = "user123";

        Manga manga = new Manga();
        manga.setId(mangaId);
        manga.setViews(10L);
        manga.setUniqueViews(5L);

        when(mangaRepository.findById(mangaId)).thenReturn(Optional.of(manga));
        when(viewTrackingService.canIncrementUniqueView(userId, mangaId)).thenReturn(true);
        when(mangaRepository.save(any(Manga.class))).thenReturn(manga);

        // When
        mangaService.incrementView(mangaId, userId);

        // Then
        verify(mangaRepository).findById(mangaId);
        verify(viewTrackingService).canIncrementUniqueView(userId, mangaId);
        verify(mangaRepository).save(manga);

        // Verify counters increased
        assert manga.getViews() == 11L;
        assert manga.getUniqueViews() == 6L;
    }

    @Test
    void incrementView_ShouldHandleRateLimit() {
        // Given
        Long mangaId = 1L;
        String userId = "user123";

        Manga manga = new Manga();
        manga.setId(mangaId);
        manga.setViews(10L);
        manga.setUniqueViews(5L);

        when(mangaRepository.findById(mangaId)).thenReturn(Optional.of(manga));
        when(viewTrackingService.canIncrementUniqueView(userId, mangaId)).thenReturn(false);
        when(mangaRepository.save(any(Manga.class))).thenReturn(manga);

        // When
        mangaService.incrementView(mangaId, userId);

        // Then
        verify(mangaRepository).findById(mangaId);
        verify(viewTrackingService).canIncrementUniqueView(userId, mangaId);
        verify(mangaRepository).save(manga);

        // Verify only general counter increased
        assert manga.getViews() == 11L;
        assert manga.getUniqueViews() == 5L; // Should not increase due to rate limit
    }
}
