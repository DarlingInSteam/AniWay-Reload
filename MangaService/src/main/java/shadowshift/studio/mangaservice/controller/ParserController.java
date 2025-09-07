package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.ui.Model;
import shadowshift.studio.mangaservice.service.MelonIntegrationService;

import java.util.Map;
import java.util.List;

/**
 * Веб-контроллер для управления парсингом манги из внешних источников.
 *
 * Предоставляет веб-интерфейс для запуска, мониторинга и управления процессами
 * парсинга манги из сервиса Melon. Поддерживает как одиночный, так и пакетный
 * парсинг, с возможностью автоматического импорта в систему.
 *
 * @author ShadowShiftStudio
 */
@Controller
@RequestMapping("/parser")
public class ParserController {

    @Autowired
    private MelonIntegrationService melonService;

    /**
     * Отображает главную страницу парсера манги.
     *
     * @param model модель для передачи данных в представление
     * @return имя шаблона страницы парсера
     */
    @GetMapping
    public String parserPage(Model model) {
        model.addAttribute("pageTitle", "Парсер манги");
        return "parser/index";
    }

    /**
     * Запускает процесс полного парсинга манги по указанному slug.
     *
     * @param slug уникальный идентификатор манги в источнике
     * @return ResponseEntity с результатом запуска парсинга
     */
    @PostMapping("/start")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> startParsing(@RequestParam String slug) {
        try {
            Map<String, Object> response = melonService.startFullParsing(slug);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка запуска парсинга: " + e.getMessage()));
        }
    }

    /**
     * Запускает пакетный парсинг нескольких манг.
     *
     * @param request параметры запроса с slugs манг, настройками парсера и автоимпорта
     * @return ResponseEntity с результатом запуска пакетного парсинга
     */
    @PostMapping("/batch-start")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> startBatchParsing(@RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<String> slugs = (List<String>) request.get("slugs");
            Boolean autoImport = (Boolean) request.getOrDefault("autoImport", true);
            String parser = (String) request.getOrDefault("parser", "mangalib");

            if (slugs == null || slugs.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Список слагов не может быть пустым"));
            }

            Map<String, Object> response = melonService.startBatchParsing(slugs, parser, autoImport);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка запуска пакетного парсинга: " + e.getMessage()));
        }
    }

    /**
     * Получает статус выполнения задачи парсинга по ее идентификатору.
     *
     * @param taskId идентификатор задачи парсинга
     * @return ResponseEntity со статусом выполнения задачи
     */
    @GetMapping("/status/{taskId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String taskId) {
        try {
            Map<String, Object> status = melonService.getFullParsingTaskStatus(taskId);
            if (!status.containsKey("error")) {
                return ResponseEntity.ok(status);
            }

            status = melonService.getTaskStatus(taskId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка получения статуса: " + e.getMessage()));
        }
    }

    /**
     * Строит архив манги из распарсенных данных.
     *
     * @param filename имя файла с данными манги
     * @param branchId идентификатор ветки (опционально)
     * @return ResponseEntity с результатом построения архива
     */
    @PostMapping("/build")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> buildManga(
            @RequestParam String filename,
            @RequestParam(required = false) String branchId) {
        try {
            Map<String, Object> response = melonService.buildManga(filename, branchId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка построения архива: " + e.getMessage()));
        }
    }

    /**
     * Получает список всех распарсенных манг.
     *
     * @return ResponseEntity со списком распарсенных манг
     */
    @GetMapping("/list")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> listParsedManga() {
        try {
            List<Map<String, Object>> mangaList = melonService.listParsedManga();
            return ResponseEntity.ok(mangaList);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Получает детальную информацию о распарсенной манге.
     *
     * @param filename имя файла с данными манги
     * @return ResponseEntity с информацией о манге
     */
    @GetMapping("/info/{filename}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getMangaInfo(@PathVariable String filename) {
        try {
            Map<String, Object> mangaInfo = melonService.getMangaInfo(filename);
            return ResponseEntity.ok(mangaInfo);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Импортирует распарсенную мангу в систему AniWay.
     *
     * @param filename имя файла с данными манги
     * @param branchId идентификатор ветки (опционально)
     * @return ResponseEntity с результатом импорта
     */
    @PostMapping("/import/{filename}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> importManga(
            @PathVariable String filename,
            @RequestParam(required = false) String branchId) {
        try {
            Map<String, Object> result = melonService.importToSystemAsync(filename, branchId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка импорта: " + e.getMessage()));
        }
    }

    /**
     * Получает статус выполнения задачи импорта.
     *
     * @param taskId идентификатор задачи импорта
     * @return ResponseEntity со статусом выполнения импорта
     */
    @GetMapping("/import/status/{taskId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getImportStatus(@PathVariable String taskId) {
        try {
            Map<String, Object> status = melonService.getImportTaskStatus(taskId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка получения статуса: " + e.getMessage()));
        }
    }

    /**
     * Удаляет распарсенные данные манги.
     *
     * @param filename имя файла с данными манги
     * @return ResponseEntity с результатом удаления
     */
    @DeleteMapping("/delete/{filename}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteManga(@PathVariable String filename) {
        try {
            Map<String, Object> result = melonService.deleteManga(filename);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка удаления: " + e.getMessage()));
        }
    }
}
