package shadowshift.studio.mangaservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.repository.MangaRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MangaService {

    @Autowired
    private MangaRepository mangaRepository;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    public List<MangaResponseDTO> getAllManga() {
        return mangaRepository.findAllOrderByCreatedAtDesc()
                .stream()
                .map(MangaResponseDTO::new)
                .collect(Collectors.toList());
    }

    public Optional<MangaResponseDTO> getMangaById(Long id) {
        return mangaRepository.findById(id)
                .map(manga -> {
                    MangaResponseDTO dto = new MangaResponseDTO(manga);
                    // Получаем актуальное количество глав из ChapterService
                    try {
                        Integer chapterCount = getChapterCountFromService(id);
                        dto.setTotalChapters(chapterCount);
                        // Обновляем в базе если отличается
                        if (!chapterCount.equals(manga.getTotalChapters())) {
                            manga.setTotalChapters(chapterCount);
                            mangaRepository.save(manga);
                        }
                    } catch (Exception e) {
                        // Если сервис недоступен, используем сохраненное значение
                        System.err.println("Failed to get chapter count from service: " + e.getMessage());
                    }
                    return dto;
                });
    }

    public MangaResponseDTO createManga(MangaCreateDTO createDTO) {
        Manga manga = new Manga();
        manga.setTitle(createDTO.getTitle());
        manga.setDescription(createDTO.getDescription());
        manga.setAuthor(createDTO.getAuthor());
        manga.setArtist(createDTO.getArtist());
        manga.setReleaseDate(createDTO.getReleaseDate());
        manga.setStatus(createDTO.getStatus() != null ? createDTO.getStatus() : Manga.MangaStatus.ONGOING);
        manga.setGenre(createDTO.getGenre());
        manga.setCoverImageUrl(createDTO.getCoverImageUrl());

        Manga savedManga = mangaRepository.save(manga);
        return new MangaResponseDTO(savedManga);
    }

    public Optional<MangaResponseDTO> updateManga(Long id, MangaCreateDTO updateDTO) {
        return mangaRepository.findById(id)
                .map(manga -> {
                    manga.setTitle(updateDTO.getTitle());
                    manga.setDescription(updateDTO.getDescription());
                    manga.setAuthor(updateDTO.getAuthor());
                    manga.setArtist(updateDTO.getArtist());
                    manga.setReleaseDate(updateDTO.getReleaseDate());
                    if (updateDTO.getStatus() != null) {
                        manga.setStatus(updateDTO.getStatus());
                    }
                    manga.setGenre(updateDTO.getGenre());
                    manga.setCoverImageUrl(updateDTO.getCoverImageUrl());

                    Manga savedManga = mangaRepository.save(manga);
                    return new MangaResponseDTO(savedManga);
                });
    }

    public void deleteManga(Long id) {
        mangaRepository.deleteById(id);
    }

    public void updateCoverImage(Long mangaId, String imageUrl) {
        mangaRepository.findById(mangaId)
                .ifPresent(manga -> {
                    manga.setCoverImageUrl(imageUrl);
                    mangaRepository.save(manga);
                });
    }

    private Integer getChapterCountFromService(Long mangaId) {
        WebClient webClient = webClientBuilder.build();
        return webClient.get()
                .uri(chapterServiceUrl + "/api/chapters/count/" + mangaId)
                .retrieve()
                .bodyToMono(Integer.class)
                .block();
    }
}
