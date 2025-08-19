package shadowshift.studio.mangaservice.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.service.MangaService;
import java.util.ArrayList;
import java.util.List;

// DTO для главы (нужно создать или импортировать)
class ChapterResponseDTO {
    private Long id;
    private Long mangaId;
    private Integer chapterNumber;
    private String title;
    private Integer pageCount;

    // Getters and setters
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

@Controller
@RequestMapping("/manga")
public class MangaWebController {

    @Autowired
    private MangaService mangaService;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    // Каталог манги
    @GetMapping
    public String catalogPage(Model model) {
        List<MangaResponseDTO> mangaList = mangaService.getAllManga();
        model.addAttribute("mangaList", mangaList);
        return "manga/catalog";
    }

    // Страница конкретной манги с описанием и главами
    @GetMapping("/{id}")
    public String mangaDetailPage(@PathVariable Long id, Model model) {
        return mangaService.getMangaById(id)
                .map(manga -> {
                    model.addAttribute("manga", manga);
                    // Получаем список глав из ChapterService
                    try {
                        List<ChapterResponseDTO> chapters = getChaptersFromService(id);
                        model.addAttribute("chapters", chapters);
                    } catch (Exception e) {
                        model.addAttribute("chapters", new ArrayList<>());
                        model.addAttribute("errorMessage", "Ошибка загрузки глав. Проверьте, что ChapterService запущен.");
                    }
                    return "manga/detail";
                })
                .orElse("redirect:/manga");
    }

    // Форма для создания новой манги
    @GetMapping("/create")
    public String createMangaForm(Model model) {
        model.addAttribute("mangaCreateDTO", new MangaCreateDTO());
        model.addAttribute("statuses", Manga.MangaStatus.values());
        return "manga/create";
    }

    // Обработка создания манги
    @PostMapping("/create")
    public String createManga(
            @Valid @ModelAttribute MangaCreateDTO mangaCreateDTO,
            BindingResult bindingResult,
            Model model,
            RedirectAttributes redirectAttributes) {

        if (bindingResult.hasErrors()) {
            model.addAttribute("statuses", Manga.MangaStatus.values());
            return "manga/create";
        }

        try {
            MangaResponseDTO createdManga = mangaService.createManga(mangaCreateDTO);
            redirectAttributes.addFlashAttribute("successMessage",
                "Manga '" + createdManga.getTitle() + "' successfully created!");
            return "redirect:/manga/" + createdManga.getId();
        } catch (Exception e) {
            model.addAttribute("errorMessage", "Error creating manga: " + e.getMessage());
            model.addAttribute("statuses", Manga.MangaStatus.values());
            return "manga/create";
        }
    }

    // Форма для редактирования манги
    @GetMapping("/{id}/edit")
    public String editMangaForm(@PathVariable Long id, Model model) {
        return mangaService.getMangaById(id)
                .map(manga -> {
                    MangaCreateDTO editDTO = new MangaCreateDTO();
                    editDTO.setTitle(manga.getTitle());
                    editDTO.setDescription(manga.getDescription());
                    editDTO.setAuthor(manga.getAuthor());
                    editDTO.setArtist(manga.getArtist());
                    editDTO.setReleaseDate(manga.getReleaseDate());
                    editDTO.setStatus(manga.getStatus());
                    editDTO.setGenre(manga.getGenre());

                    model.addAttribute("mangaCreateDTO", editDTO);
                    model.addAttribute("mangaId", id);
                    model.addAttribute("statuses", Manga.MangaStatus.values());
                    return "manga/edit";
                })
                .orElse("redirect:/manga");
    }

    // Обработка редактирования манги
    @PostMapping("/{id}/edit")
    public String editManga(
            @PathVariable Long id,
            @Valid @ModelAttribute MangaCreateDTO mangaCreateDTO,
            BindingResult bindingResult,
            Model model,
            RedirectAttributes redirectAttributes) {

        if (bindingResult.hasErrors()) {
            model.addAttribute("mangaId", id);
            model.addAttribute("statuses", Manga.MangaStatus.values());
            return "manga/edit";
        }

        try {
            mangaService.updateManga(id, mangaCreateDTO)
                    .ifPresentOrElse(
                            updatedManga -> redirectAttributes.addFlashAttribute("successMessage",
                                "Manga updated successfully!"),
                            () -> redirectAttributes.addFlashAttribute("errorMessage",
                                "Manga not found!")
                    );
            return "redirect:/manga/" + id;
        } catch (Exception e) {
            model.addAttribute("errorMessage", "Error updating manga: " + e.getMessage());
            model.addAttribute("mangaId", id);
            model.addAttribute("statuses", Manga.MangaStatus.values());
            return "manga/edit";
        }
    }

    // Удаление манги
    @PostMapping("/{id}/delete")
    public String deleteManga(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            mangaService.deleteManga(id);
            redirectAttributes.addFlashAttribute("successMessage", "Manga deleted successfully!");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Error deleting manga: " + e.getMessage());
        }
        return "redirect:/manga";
    }

    // Приватный метод для получения глав из ChapterService
    private List<ChapterResponseDTO> getChaptersFromService(Long mangaId) {
        try {
            WebClient webClient = webClientBuilder.build();
            List<ChapterResponseDTO> chapters = webClient.get()
                    .uri(chapterServiceUrl + "/api/chapters/manga/" + mangaId)
                    .retrieve()
                    .bodyToFlux(ChapterResponseDTO.class)
                    .collectList()
                    .block();

            return chapters != null ? chapters : new ArrayList<>();
        } catch (Exception e) {
            System.err.println("Error fetching chapters from ChapterService: " + e.getMessage());
            return new ArrayList<>();
        }
    }
}
