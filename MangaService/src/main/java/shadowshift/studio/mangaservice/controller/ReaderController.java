package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.reactive.function.client.WebClient;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.service.MangaService;

@Controller
@RequestMapping("/reader")
public class ReaderController {

    @Autowired
    private MangaService mangaService;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    @GetMapping("/{chapterId}")
    public String readChapter(@PathVariable Long chapterId, Model model) {
        try {
            // Получаем информацию о главе
            WebClient webClient = webClientBuilder.build();
            ChapterResponseDTO chapter = webClient.get()
                    .uri(chapterServiceUrl + "/api/chapters/" + chapterId)
                    .retrieve()
                    .bodyToMono(ChapterResponseDTO.class)
                    .block();

            if (chapter == null) {
                System.err.println("Chapter not found: " + chapterId);
                return "redirect:/manga";
            }

            System.out.println("Chapter " + chapterId + " pageCount: " + chapter.getPageCount());

            // Получаем информацию о манге
            MangaResponseDTO manga = mangaService.getMangaById(chapter.getMangaId()).orElse(null);
            if (manga == null) {
                System.err.println("Manga not found for chapter: " + chapterId);
                return "redirect:/manga";
            }

            model.addAttribute("chapter", chapter);
            model.addAttribute("manga", manga);

            return "reader/chapter";

        } catch (Exception e) {
            return "redirect:/manga";
        }
    }

    // DTO для ответа от ChapterService
    public static class ChapterResponseDTO {
        private Long id;
        private Long mangaId;
        private Integer chapterNumber;
        private String title;
        private Integer pageCount;

        // Getters and Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public Long getMangaId() { return mangaId; }
        public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

        public Integer getChapterNumber() { return chapterNumber; }
        public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public Integer getPageCount() { return pageCount; }
        public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }
    }
}
