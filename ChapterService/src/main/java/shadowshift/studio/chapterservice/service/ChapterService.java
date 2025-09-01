package shadowshift.studio.chapterservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import shadowshift.studio.chapterservice.dto.ChapterCreateDTO;
import shadowshift.studio.chapterservice.dto.ChapterResponseDTO;
import shadowshift.studio.chapterservice.entity.Chapter;
import shadowshift.studio.chapterservice.repository.ChapterRepository;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ChapterService {

    @Autowired
    private ChapterRepository chapterRepository;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    public List<ChapterResponseDTO> getChaptersByMangaId(Long mangaId) {
        return chapterRepository.findByMangaIdOrderByChapterNumberAsc(mangaId)
                .stream()
                .map(chapter -> {
                    ChapterResponseDTO dto = new ChapterResponseDTO(chapter);
                    // Получаем актуальное количество страниц из ImageStorageService
                    try {
                        Integer pageCount = getPageCountFromImageService(chapter.getId());
                        dto.setPageCount(pageCount);
                        // Обновляем в базе если отличается
                        if (!pageCount.equals(chapter.getPageCount())) {
                            chapter.setPageCount(pageCount);
                            chapterRepository.save(chapter);
                        }
                    } catch (Exception e) {
                        // Если сервис недоступен, используем сохраненное значение
                        System.err.println("Failed to get page count from image service: " + e.getMessage());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public Optional<ChapterResponseDTO> getChapterById(Long id) {
        return chapterRepository.findById(id)
                .map(chapter -> {
                    ChapterResponseDTO dto = new ChapterResponseDTO(chapter);
                    try {
                        Integer pageCount = getPageCountFromImageService(id);
                        dto.setPageCount(pageCount);
                        if (!pageCount.equals(chapter.getPageCount())) {
                            chapter.setPageCount(pageCount);
                            chapterRepository.save(chapter);
                        }
                    } catch (Exception e) {
                        System.err.println("Failed to get page count from image service: " + e.getMessage());
                    }
                    return dto;
                });
    }

    public Integer getChapterCountByMangaId(Long mangaId) {
        return chapterRepository.countByMangaId(mangaId);
    }

    public ChapterResponseDTO createChapter(ChapterCreateDTO createDTO) {
        // Проверяем, что глава с таким номером еще не существует
        Optional<Chapter> existingChapter = chapterRepository
                .findByMangaIdAndChapterNumber(createDTO.getMangaId(), createDTO.getChapterNumber());

        if (existingChapter.isPresent()) {
            throw new RuntimeException("Chapter " + createDTO.getChapterNumber() +
                    " already exists for manga " + createDTO.getMangaId());
        }

        Chapter chapter = new Chapter();
        chapter.setMangaId(createDTO.getMangaId());
        chapter.setChapterNumber(createDTO.getChapterNumber());
        chapter.setVolumeNumber(createDTO.getVolumeNumber());
        chapter.setOriginalChapterNumber(createDTO.getOriginalChapterNumber());
        chapter.setTitle(createDTO.getTitle());
        if (createDTO.getPublishedDate() != null) {
            chapter.setPublishedDate(createDTO.getPublishedDate());
        }

        Chapter savedChapter = chapterRepository.save(chapter);
        return new ChapterResponseDTO(savedChapter);
    }

    public Optional<ChapterResponseDTO> updateChapter(Long id, ChapterCreateDTO updateDTO) {
        return chapterRepository.findById(id)
                .map(chapter -> {
                    // Проверяем, что новый номер главы не конфликтует с существующими
                    if (!chapter.getChapterNumber().equals(updateDTO.getChapterNumber())) {
                        Optional<Chapter> existingChapter = chapterRepository
                                .findByMangaIdAndChapterNumber(chapter.getMangaId(), updateDTO.getChapterNumber());
                        if (existingChapter.isPresent()) {
                            throw new RuntimeException("Chapter " + updateDTO.getChapterNumber() +
                                    " already exists for this manga");
                        }
                        chapter.setChapterNumber(updateDTO.getChapterNumber());
                    }

                    chapter.setTitle(updateDTO.getTitle());
                    if (updateDTO.getPublishedDate() != null) {
                        chapter.setPublishedDate(updateDTO.getPublishedDate());
                    }

                    Chapter savedChapter = chapterRepository.save(chapter);
                    return new ChapterResponseDTO(savedChapter);
                });
    }

    public void deleteChapter(Long id) {
        // Удаляем связанные изображения перед удалением главы
        try {
            WebClient webClient = webClientBuilder.build();
            webClient.delete()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + id)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
        } catch (Exception e) {
            System.err.println("Failed to delete chapter images: " + e.getMessage());
            // Продолжаем удаление главы даже если изображения не удалились
        }

        chapterRepository.deleteById(id);
    }

    public Optional<ChapterResponseDTO> getNextChapter(Long mangaId, Double currentChapterNumber) {
        return chapterRepository.findNextChapter(mangaId, currentChapterNumber)
                .map(ChapterResponseDTO::new);
    }

    public Optional<ChapterResponseDTO> getPreviousChapter(Long mangaId, Double currentChapterNumber) {
        return chapterRepository.findPreviousChapter(mangaId, currentChapterNumber)
                .map(ChapterResponseDTO::new);
    }

    private Integer getPageCountFromImageService(Long chapterId) {
        WebClient webClient = webClientBuilder.build();
        return webClient.get()
                .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId + "/count")
                .retrieve()
                .bodyToMono(Integer.class)
                .block();
    }
}
