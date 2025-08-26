package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.ui.Model;
import shadowshift.studio.mangaservice.service.MelonIntegrationService;

import java.util.Map;
import java.util.List;

@Controller
@RequestMapping("/parser")
public class ParserController {

    @Autowired
    private MelonIntegrationService melonService;

    @GetMapping
    public String parserPage(Model model) {
        model.addAttribute("pageTitle", "Парсер манги");
        return "parser/index";
    }

    @PostMapping("/start")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> startParsing(@RequestParam String slug) {
        try {
            // Используем новый метод полного парсинга с автоматическим скачиванием изображений
            Map<String, Object> response = melonService.startFullParsing(slug);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка запуска парсинга: " + e.getMessage()));
        }
    }

    @GetMapping("/status/{taskId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String taskId) {
        try {
            // Сначала пробуем получить статус полного парсинга
            Map<String, Object> status = melonService.getFullParsingTaskStatus(taskId);
            if (!status.containsKey("error")) {
                return ResponseEntity.ok(status);
            }

            // Если не найден в полном парсинге, проверяем обычный статус
            status = melonService.getTaskStatus(taskId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка получения статуса: " + e.getMessage()));
        }
    }

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
