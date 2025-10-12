package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.ui.Model;
import shadowshift.studio.mangaservice.service.MelonIntegrationService;
import shadowshift.studio.mangaservice.service.AutoParsingService;
import shadowshift.studio.mangaservice.service.MangaUpdateService;

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

    @Autowired
    private AutoParsingService autoParsingService;

    @Autowired
    private MangaUpdateService mangaUpdateService;

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
     * Возвращает список задач парсинга на MelonService.
     */
    @GetMapping("/tasks")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> listTasks() {
        try {
            List<Map<String, Object>> tasks = melonService.listTasks();
            return ResponseEntity.ok(tasks);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(List.of(Map.of("error", "Ошибка получения списка задач: " + e.getMessage())));
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

    /**
     * Очищает данные MelonService (Output/mangalib/archives|images|titles).
     */
    @PostMapping("/cleanup/melon")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> cleanupMelonStorage() {
        try {
            Map<String, Object> result = melonService.cleanupMelonOutput();
            boolean success = Boolean.TRUE.equals(result.get("success"));
            if (success) {
                return ResponseEntity.ok(result);
            }
            return ResponseEntity.status(500).body(result);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(Map.of("success", false, "message", "Ошибка очистки: " + e.getMessage()));
        }
    }

    /**
     * Запускает автоматический парсинг манг из каталога MangaLib.
     * Получает список манг по номеру страницы, фильтрует уже существующие и парсит новые.
     *
     * @param request параметры запроса (page - номер страницы, limit - ограничение количества)
     * @return ResponseEntity с информацией о запущенной задаче автопарсинга
     */
    @PostMapping("/auto-parse")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> startAutoParsing(@RequestBody Map<String, Object> request) {
        try {
            Integer page = (Integer) request.get("page");
            Integer limit = (Integer) request.get("limit");

            // Валидация page
            if (page == null || page <= 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Номер страницы должен быть больше 0"));
            }

            // Валидация limit
            if (limit != null && limit <= 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Ограничение должно быть больше 0"));
            }

            Map<String, Object> result = autoParsingService.startAutoParsing(page, limit);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка запуска автопарсинга: " + e.getMessage()));
        }
    }

    /**
     * Получает статус задачи автопарсинга.
     *
     * @param taskId идентификатор задачи
     * @return ResponseEntity со статусом задачи
     */
    @GetMapping("/auto-parse/status/{taskId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAutoParseStatus(@PathVariable String taskId) {
        try {
            Map<String, Object> status = autoParsingService.getAutoParseTaskStatus(taskId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка получения статуса: " + e.getMessage()));
        }
    }

    /**
     * Отменяет задачу автопарсинга.
     *
     * @param taskId идентификатор задачи
     * @return ResponseEntity с результатом отмены
     */
    @PostMapping("/auto-parse/cancel/{taskId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> cancelAutoParse(@PathVariable String taskId) {
        try {
            Map<String, Object> result = autoParsingService.cancelAutoParseTask(taskId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка отмены задачи: " + e.getMessage()));
        }
    }

    /**
     * Запускает автоматическое обновление всех манг в системе.
     * Проверяет наличие новых глав и импортирует их.
     *
     * @return ResponseEntity с информацией о запущенной задаче обновления
     */
    @PostMapping("/auto-update")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> startAutoUpdate() {
        try {
            Map<String, Object> result = mangaUpdateService.startAutoUpdate();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка запуска автообновления: " + e.getMessage()));
        }
    }

    /**
     * Получает статус задачи автообновления.
     *
     * @param taskId идентификатор задачи
     * @return ResponseEntity со статусом задачи
     */
    @GetMapping("/auto-update/status/{taskId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAutoUpdateStatus(@PathVariable String taskId) {
        try {
            Map<String, Object> status = mangaUpdateService.getUpdateTaskStatus(taskId);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Ошибка получения статуса: " + e.getMessage()));
        }
    }
}
