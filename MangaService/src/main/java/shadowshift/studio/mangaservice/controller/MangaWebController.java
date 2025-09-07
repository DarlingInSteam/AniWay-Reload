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

/**
 * DTO класс для представления информации о главе манги.
 * Используется для передачи данных о главах между сервисами.
 *
 * @author ShadowShiftStudio
 */
class ChapterResponseDTO {
    private Long id;
    private Long mangaId;
    private Integer chapterNumber;
    private String title;
    private Integer pageCount;

    /**
     * Получает идентификатор главы.
     *
     * @return идентификатор главы
     */
    public Long getId() { return id; }

    /**
     * Устанавливает идентификатор главы.
     *
     * @param id идентификатор главы
     */
    public void setId(Long id) { this.id = id; }

    /**
     * Получает идентификатор манги.
     *
     * @return идентификатор манги
     */
    public Long getMangaId() { return mangaId; }

    /**
     * Устанавливает идентификатор манги.
     *
     * @param mangaId идентификатор манги
     */
    public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

    /**
     * Получает номер главы.
     *
     * @return номер главы
     */
    public Integer getChapterNumber() { return chapterNumber; }

    /**
     * Устанавливает номер главы.
     *
     * @param chapterNumber номер главы
     */
    public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

    /**
     * Получает заголовок главы.
     *
     * @return заголовок главы
     */
    public String getTitle() { return title; }

    /**
     * Устанавливает заголовок главы.
     *
     * @param title заголовок главы
     */
    public void setTitle(String title) { this.title = title; }

    /**
     * Получает количество страниц в главе.
     *
     * @return количество страниц
     */
    public Integer getPageCount() { return pageCount; }

    /**
     * Устанавливает количество страниц в главе.
     *
     * @param pageCount количество страниц
     */
    public void setPageCount(Integer pageCount) { this.pageCount = pageCount; }
}

/**
 * Веб-контроллер для управления мангой через веб-интерфейс.
 *
 * Предоставляет веб-страницы и формы для выполнения операций CRUD над мангой,
 * включая создание, просмотр, редактирование и удаление. Контроллер работает
 * с шаблонами представлений и перенаправляет запросы в соответствующие сервисы.
 *
 * @author ShadowShiftStudio
 */
@Controller
@RequestMapping("/manga")
public class MangaWebController {

    @Autowired
    private MangaService mangaService;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    /**
     * Отображает страницу каталога со списком всех манг.
     *
     * @param model модель для передачи данных в представление
     * @return имя шаблона страницы каталога
     */
    @GetMapping
    public String catalogPage(Model model) {
        List<MangaResponseDTO> mangaList = mangaService.getAllManga();
        model.addAttribute("mangaList", mangaList);
        return "manga/catalog";
    }

    /**
     * Отображает детальную страницу конкретной манги с ее главами.
     *
     * @param id идентификатор манги
     * @param model модель для передачи данных в представление
     * @return имя шаблона детальной страницы или перенаправление при ошибке
     */
    @GetMapping("/{id}")
    public String mangaDetailPage(@PathVariable Long id, Model model) {
        return mangaService.getMangaById(id)
                .map(manga -> {
                    model.addAttribute("manga", manga);
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

    /**
     * Отображает форму для создания новой манги.
     *
     * @param model модель для передачи данных в представление
     * @return имя шаблона формы создания
     */
    @GetMapping("/create")
    public String createMangaForm(Model model) {
        model.addAttribute("mangaCreateDTO", new MangaCreateDTO());
        model.addAttribute("statuses", Manga.MangaStatus.values());
        return "manga/create";
    }

    /**
     * Обрабатывает создание новой манги через веб-форму.
     *
     * @param mangaCreateDTO DTO с данными для создания манги
     * @param bindingResult результат валидации данных формы
     * @param model модель для передачи данных в представление
     * @param redirectAttributes атрибуты для перенаправления с сообщениями
     * @return перенаправление на страницу созданной манги или обратно на форму при ошибках
     */
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

    /**
     * Отображает форму для редактирования существующей манги.
     *
     * @param id идентификатор редактируемой манги
     * @param model модель для передачи данных в представление
     * @return имя шаблона формы редактирования или перенаправление при ошибке
     */
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

    /**
     * Обрабатывает обновление данных манги через веб-форму.
     *
     * @param id идентификатор обновляемой манги
     * @param mangaCreateDTO DTO с обновленными данными манги
     * @param bindingResult результат валидации данных формы
     * @param model модель для передачи данных в представление
     * @param redirectAttributes атрибуты для перенаправления с сообщениями
     * @return перенаправление на страницу манги или обратно на форму при ошибках
     */
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

    /**
     * Удаляет мангу по ее идентификатору.
     *
     * @param id идентификатор удаляемой манги
     * @param redirectAttributes атрибуты для перенаправления с сообщениями
     * @return перенаправление на страницу каталога
     */
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

    /**
     * Получает список глав для указанной манги из ChapterService.
     *
     * @param mangaId идентификатор манги
     * @return список глав манги
     */
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
            return new ArrayList<>();
        }
    }
}
