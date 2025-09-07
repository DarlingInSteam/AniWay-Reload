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

/**
 * Веб-контроллер для чтения глав манги.
 *
 * Предоставляет функциональность для отображения страниц чтения манги,
 * включая получение данных о главе и связанной манге из соответствующих сервисов.
 * Интегрируется с ChapterService и ImageStorageService для получения необходимых данных.
 *
 * @author ShadowShiftStudio
 */
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

    /**
     * Отображает страницу чтения указанной главы манги.
     *
     * Получает информацию о главе из ChapterService и данные о манге из MangaService,
     * после чего передает их в шаблон для отображения страницы чтения.
     *
     * @param chapterId идентификатор главы для чтения
     * @param model модель для передачи данных в представление
     * @return имя шаблона страницы чтения или перенаправление при ошибке
     */
    @GetMapping("/{chapterId}")
    public String readChapter(@PathVariable Long chapterId, Model model) {
        try {
            WebClient webClient = webClientBuilder.build();
            ChapterResponseDTO chapter = webClient.get()
                    .uri(chapterServiceUrl + "/api/chapters/" + chapterId)
                    .retrieve()
                    .bodyToMono(ChapterResponseDTO.class)
                    .block();

            if (chapter == null) {
                return "redirect:/manga";
            }

            MangaResponseDTO manga = mangaService.getMangaById(chapter.getMangaId()).orElse(null);
            if (manga == null) {
                return "redirect:/manga";
            }

            model.addAttribute("chapter", chapter);
            model.addAttribute("manga", manga);

            return "reader/chapter";

        } catch (Exception e) {
            return "redirect:/manga";
        }
    }

    /**
     * DTO класс для представления информации о главе манги.
     *
     * Используется для передачи данных о главе между сервисами
     * и содержит основную информацию, необходимую для чтения главы.
     *
     * @author ShadowShiftStudio
     */
    public static class ChapterResponseDTO {
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
}
