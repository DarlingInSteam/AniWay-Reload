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

    // Форма для создания новой главы
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

    // Обработка создания главы с загрузкой изображений
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
            // Создаем объект для отправки в ChapterService
            ChapterCreateRequestDTO requestDTO = new ChapterCreateRequestDTO();
            requestDTO.setMangaId(chapterDTO.getMangaId());
            requestDTO.setChapterNumber(chapterDTO.getChapterNumber());
            requestDTO.setTitle(chapterDTO.getTitle());

            // Создаем главу через ChapterService
            WebClient webClient = webClientBuilder.build();
            ChapterResponseDTO createdChapter = webClient.post()
                    .uri(chapterServiceUrl + "/api/chapters")
                    .bodyValue(requestDTO)
                    .retrieve()
                    .bodyToMono(ChapterResponseDTO.class)
                    .block();

            if (createdChapter != null) {
                // Если есть изображения, загружаем их в ImageStorageService
                if (images != null && !images.isEmpty() && images.get(0) != null && !images.get(0).isEmpty()) {
                    try {
                        uploadImagesToChapterWithOrder(createdChapter.getId(), images, startPage);
                        redirectAttributes.addFlashAttribute("successMessage",
                            "Глава " + chapterDTO.getChapterNumber() + " успешно создана с " + images.size() + " страницами, начиная со страницы " + startPage + "!");
                    } catch (Exception e) {
                        System.err.println("Error uploading images: " + e.getMessage());
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
            System.err.println("Error creating chapter: " + e.getMessage());
            e.printStackTrace();
            model.addAttribute("errorMessage", "Ошибка создания главы: " + e.getMessage());
            return mangaService.getMangaById(chapterDTO.getMangaId())
                    .map(manga -> {
                        model.addAttribute("manga", manga);
                        return "chapter/create";
                    })
                    .orElse("redirect:/manga");
        }
    }

    // Удаление главы через веб-интерфейс
    @DeleteMapping("/{id}")
    @ResponseBody
    public ResponseEntity<String> deleteChapter(@PathVariable Long id) {
        try {
            WebClient webClient = webClientBuilder.build();

            // Удаляем главу через ChapterService (который в свою очередь удалит изображения)
            webClient.delete()
                    .uri(chapterServiceUrl + "/api/chapters/" + id)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();

            return ResponseEntity.ok("Chapter deleted successfully");
        } catch (Exception e) {
            System.err.println("Error deleting chapter: " + e.getMessage());
            return ResponseEntity.internalServerError().body("Failed to delete chapter: " + e.getMessage());
        }
    }

    // Метод для загрузки изображений в ImageStorageService
    private void uploadImagesToChapter(Long chapterId, List<MultipartFile> images) {
        try {
            WebClient webClient = webClientBuilder.build();

            // Отправляем изображения в ImageStorageService
            webClient.post()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId + "/multiple")
                    .contentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA)
                    .body(org.springframework.web.reactive.function.BodyInserters.fromMultipartData(
                        createMultipartData(images)
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            System.out.println("Successfully uploaded " + images.size() + " images for chapter " + chapterId);
        } catch (Exception e) {
            System.err.println("Error uploading images to ImageStorageService: " + e.getMessage());
            throw e;
        }
    }

    // Метод для загрузки изображений в ImageStorageService с учетом порядка страниц
    private void uploadImagesToChapterWithOrder(Long chapterId, List<MultipartFile> images, Integer startPage) {
        try {
            // DEBUG: Логируем информацию о загружаемых файлах
            System.out.println("=== DEBUG: uploadImagesToChapterWithOrder ===");
            System.out.println("ChapterId: " + chapterId);
            System.out.println("StartPage: " + startPage);
            System.out.println("Number of images: " + images.size());

            for (int i = 0; i < images.size(); i++) {
                MultipartFile image = images.get(i);
                System.out.println("Image " + i + ": filename=" + image.getOriginalFilename() +
                                 ", size=" + image.getSize() +
                                 ", will be page " + (startPage + i));
            }

            WebClient webClient = webClientBuilder.build();

            // Создаем multipart данные с учетом порядка страниц
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
                        System.out.println("Added to multipart: " + image.getOriginalFilename() + " at index " + i);
                    } catch (Exception e) {
                        System.err.println("Error processing image " + i + ": " + e.getMessage());
                    }
                }
            }

            // Отправляем изображения в ImageStorageService с использованием упорядоченного endpoint
            System.out.println("Calling endpoint: " + imageStorageServiceUrl + "/api/images/chapter/" + chapterId + "/multiple-ordered?startPage=" + startPage);

            String response = webClient.post()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId + "/multiple-ordered?startPage=" + startPage)
                    .contentType(org.springframework.http.MediaType.MULTIPART_FORM_DATA)
                    .body(org.springframework.web.reactive.function.BodyInserters.fromMultipartData(
                        multipartData
                    ))
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            System.out.println("ImageStorageService response: " + response);
            System.out.println("Successfully uploaded " + images.size() + " images for chapter " + chapterId + " with order starting from page " + startPage);
        } catch (Exception e) {
            System.err.println("Error uploading images to ImageStorageService: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Вспомогательный метод для создания multipart данных
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
                    parts.add("files", resource);  // Изменено с "images" на "files"
                } catch (Exception e) {
                    System.err.println("Error processing image " + i + ": " + e.getMessage());
                }
            }
        }

        return parts;
    }

    // DTO класс для формы создания главы
    public static class ChapterCreateFormDTO {
        private Long mangaId;
        private Integer chapterNumber;
        private String title;

        // Getters and Setters
        public Long getMangaId() { return mangaId; }
        public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

        public Integer getChapterNumber() { return chapterNumber; }
        public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
    }

    // DTO для отправки запроса в ChapterService
    public static class ChapterCreateRequestDTO {
        private Long mangaId;
        private Integer chapterNumber;
        private String title;

        // Getters and Setters
        public Long getMangaId() { return mangaId; }
        public void setMangaId(Long mangaId) { this.mangaId = mangaId; }

        public Integer getChapterNumber() { return chapterNumber; }
        public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
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
