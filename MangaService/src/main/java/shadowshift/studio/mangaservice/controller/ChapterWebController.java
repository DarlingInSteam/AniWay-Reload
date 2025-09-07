package shadowshift.studio.mangaservice.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.service.MangaService;

import java.util.List;

/**
 * Веб-контроллер для управления главами манги через веб-интерфейс.
 * Предоставляет функциональность для создания, удаления глав и загрузки изображений страниц.
 * Интегрируется с ChapterService и ImageStorageService для выполнения операций.
 *
 * @author ShadowShiftStudio
 */
@Controller
@RequestMapping("/chapters")
public class ChapterWebController {

    @Autowired
    private MangaService mangaService;

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Value("${chapter.service.url}")
    private String chapterServiceUrl;

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    /**
     * Отображает форму для создания новой главы манги.
     *
     * @param mangaId идентификатор манги, для которой создается глава
     * @param model модель для передачи данных в представление
     * @return имя шаблона для отображения формы создания главы
     */
    @GetMapping("/create")
    public String createChapterForm(@RequestParam Long mangaId, Model model) {
        return mangaService.getMangaById(mangaId)
                .map(manga -> {
                    model.addAttribute("manga", manga);
                    ChapterCreateFormDTO dto = new ChapterCreateFormDTO();
                    dto.setMangaId(mangaId);
                    model.addAttribute("chapterCreateDTO", dto);
                    return "chapter/create";
                })
                .orElse("redirect:/manga");
    }

    /**
     * Обрабатывает создание новой главы с возможностью загрузки изображений страниц.
     *
     * @param chapterDTO DTO с данными для создания главы
     * @param bindingResult результат валидации данных формы
     * @param images список файлов изображений для загрузки
     * @param startPage начальный номер страницы для загрузки изображений
     * @param model модель для передачи данных в представление
     * @param redirectAttributes атрибуты для перенаправления с сообщениями
     * @return перенаправление на страницу манги или обратно на форму при ошибках
     */
    @PostMapping("/create")
    public String createChapter(
            @Valid @ModelAttribute ChapterCreateFormDTO chapterDTO,
            BindingResult bindingResult,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "startPage", defaultValue = "1") Integer startPage,
            Model model,
            RedirectAttributes redirectAttributes) {

        if (bindingResult.hasErrors()) {
            return mangaService.getMangaById(chapterDTO.getMangaId())
                    .map(manga -> {
                        model.addAttribute("manga", manga);
                        return "chapter/create";
                    })
                    .orElse("redirect:/manga");
        }

        try {
            ChapterCreateRequestDTO requestDTO = new ChapterCreateRequestDTO();
            requestDTO.setMangaId(chapterDTO.getMangaId());
            requestDTO.setChapterNumber(chapterDTO.getChapterNumber());
            requestDTO.setTitle(chapterDTO.getTitle());

            WebClient webClient = webClientBuilder.build();
            ChapterResponseDTO createdChapter = webClient.post()
                    .uri(chapterServiceUrl + "/api/chapters")
                    .bodyValue(requestDTO)
                    .retrieve()
                    .bodyToMono(ChapterResponseDTO.class)
                    .block();

            if (createdChapter != null) {
                if (images != null && !images.isEmpty() && images.get(0) != null && !images.get(0).isEmpty()) {
                    try {
                        uploadImagesToChapterWithOrder(createdChapter.getId(), images, startPage);
                        redirectAttributes.addFlashAttribute("successMessage",
                            "Глава " + chapterDTO.getChapterNumber() + " успешно создана с " + images.size() + " страницами, начиная со страницы " + startPage + "!");
                    } catch (Exception e) {
                        redirectAttributes.addFlashAttribute("successMessage",
                            "Глава " + chapterDTO.getChapterNumber() + " создана, но возникла ошибка при загрузке изображений.");
                    }
                } else {
                    redirectAttributes.addFlashAttribute("successMessage",
                        "Глава " + chapterDTO.getChapterNumber() + " успешно создана! Добавьте изображения страниц отдельно.");
                }

                return "redirect:/manga/" + chapterDTO.getMangaId();
            } else {
                throw new RuntimeException("Failed to create chapter - no response from ChapterService");
            }

        } catch (Exception e) {
            model.addAttribute("errorMessage", "Ошибка создания главы: " + e.getMessage());
            return mangaService.getMangaById(chapterDTO.getMangaId())
                    .map(manga -> {
                        model.addAttribute("manga", manga);
                        return "chapter/create";
                    })
                    .orElse("redirect:/manga");
        }
    }

    /**
     * Удаляет главу по ее идентификатору через веб-интерфейс.
     *
     * @param id идентификатор главы для удаления
     * @return ResponseEntity с результатом операции
     */
    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<String> deleteChapter(@PathVariable Long id) {
        try {
            WebClient webClient = webClientBuilder.build();

            webClient.delete()
                    .uri(chapterServiceUrl + "/api/chapters/" + id)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            return ResponseEntity.ok("Chapter deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to delete chapter: " + e.getMessage());
        }
    }

    /**
     * Загружает изображения для указанной главы в ImageStorageService.
     *
     * @param chapterId идентификатор главы
     * @param images список изображений для загрузки
     */
    private void uploadImagesToChapter(Long chapterId, List<MultipartFile> images) {
        try {
            WebClient webClient = webClientBuilder.build();

            webClient.post()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId + "/multiple")
                    .contentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA)
                    .body(org.springframework.web.reactive.function.BodyInserters.fromMultipartData(
                        createMultipartData(images)
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            throw e;
        }
    }

    /**
     * Загружает изображения для указанной главы с учетом порядка страниц.
     *
     * @param chapterId идентификатор главы
     * @param images список изображений для загрузки
     * @param startPage начальный номер страницы
     */
    private void uploadImagesToChapterWithOrder(Long chapterId, List<MultipartFile> images, Integer startPage) {
        try {
            WebClient webClient = webClientBuilder.build();

            org.springframework.util.MultiValueMap<String, Object> multipartData = new org.springframework.util.LinkedMultiValueMap<>();
            for (int i = 0; i < images.size(); i++) {
                MultipartFile image = images.get(i);
                if (image != null && !image.isEmpty()) {
                    try {
                        org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(image.getBytes()) {
                            @Override
                            public String getFilename() {
                                return image.getOriginalFilename();
                            }
                        };
                        multipartData.add("files", resource);
                    } catch (Exception e) {
                        // Продолжаем обработку других изображений при ошибке с одним файлом
                    }
                }
            }

            webClient.post()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId + "/multiple-ordered?startPage=" + startPage)
                    .contentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA)
                    .body(org.springframework.web.reactive.function.BodyInserters.fromMultipartData(
                        multipartData
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            throw e;
        }
    }

    /**
     * Создает multipart данные для отправки изображений.
     *
     * @param images список файлов изображений
     * @return MultiValueMap с подготовленными данными для отправки
     */
    private org.springframework.util.MultiValueMap<String, Object> createMultipartData(List<MultipartFile> images) {
        org.springframework.util.LinkedMultiValueMap<String, Object> parts = new org.springframework.util.LinkedMultiValueMap<>();

        for (int i = 0; i < images.size(); i++) {
            MultipartFile image = images.get(i);
            if (image != null && !image.isEmpty()) {
                try {
                    org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(image.getBytes()) {
                        @Override
                        public String getFilename() {
                            return image.getOriginalFilename();
                        }
                    };
                    parts.add("files", resource);
                } catch (Exception e) {
                    // Продолжаем обработку других изображений при ошибке с одним файлом
                }
            }
        }

        return parts;
    }

    /**
     * DTO класс для формы создания главы манги.
     * Содержит данные, необходимые для создания новой главы через веб-интерфейс.
     *
     * @author ShadowShiftStudio
     */
    public static class ChapterCreateFormDTO {
        private Long mangaId;
        private Integer chapterNumber;
        private String title;

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
    }

    /**
     * DTO класс для отправки запроса на создание главы в ChapterService.
     * Содержит минимальный набор данных, необходимых для создания главы.
     *
     * @author ShadowShiftStudio
     */
    public static class ChapterCreateRequestDTO {
        private Long mangaId;
        private Integer chapterNumber;
        private String title;

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
    }

    /**
     * DTO класс для ответа от ChapterService при создании или получении главы.
     * Содержит полную информацию о главе манги.
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
