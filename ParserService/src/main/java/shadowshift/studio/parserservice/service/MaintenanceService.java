package shadowshift.studio.parserservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.config.ParserProperties;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Сервис для обслуживания и очистки данных парсера
 */
@Service
public class MaintenanceService {

    private static final Logger logger = LoggerFactory.getLogger(MaintenanceService.class);

    @Autowired
    private ParserProperties properties;

    /**
     * Очистка всех данных (archives, images, titles)
     */
    public Map<String, Object> cleanup() {
        logger.info("Начало очистки всех данных...");

        Map<String, Object> result = new LinkedHashMap<>();
        List<Map<String, Object>> details = new ArrayList<>();
        
        try {
            Path outputPath = Paths.get(properties.getOutputPath());

            if (!Files.exists(outputPath)) {
                logger.warn("Директория вывода не существует: {}", outputPath);
                result.put("success", true);
                result.put("base_path", outputPath.toString());
                result.put("details", details);
                return result;
            }

            // Очищаем три основных директории: archives, images, titles
            String[] targets = {"archives", "images", "titles"};
            
            for (String targetName : targets) {
                Path targetPath = outputPath.resolve(targetName);
                Map<String, Object> summary = cleanupDirectory(targetPath, targetName);
                details.add(summary);
            }

            boolean hasErrors = details.stream()
                .anyMatch(d -> !((List<?>) d.get("errors")).isEmpty());
            
            result.put("success", !hasErrors);
            result.put("base_path", outputPath.toString());
            result.put("details", details);
            
            if (hasErrors) {
                logger.warn("Очистка завершилась с ошибками: {}", details);
            } else {
                logger.info("Очистка завершена успешно");
            }

        } catch (Exception e) {
            logger.error("Ошибка очистки: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    /**
     * Очистка содержимого директории
     */
    private Map<String, Object> cleanupDirectory(Path targetPath, String name) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("name", name);
        summary.put("path", targetPath.toString());
        
        List<String> errors = new ArrayList<>();
        int deletedFiles = 0;
        int deletedDirs = 0;
        long freedSpace = 0;

        try {
            if (!Files.exists(targetPath)) {
                summary.put("exists", false);
                summary.put("deleted_files", 0);
                summary.put("deleted_directories", 0);
                summary.put("freed_space_bytes", 0);
                summary.put("errors", errors);
                logger.info("Директория {} не существует, пропускаем: {}", name, targetPath);
                return summary;
            }

            summary.put("exists", true);

            // Рекурсивно удаляем содержимое
            try (var stream = Files.walk(targetPath)) {
                var paths = stream.sorted(java.util.Comparator.reverseOrder())
                    .collect(java.util.stream.Collectors.toList());
                
                for (Path path : paths) {
                    if (path.equals(targetPath)) {
                        continue; // Не удаляем саму директорию
                    }
                    
                    try {
                        if (Files.isRegularFile(path)) {
                            long size = Files.size(path);
                            Files.delete(path);
                            deletedFiles++;
                            freedSpace += size;
                        } else if (Files.isDirectory(path)) {
                            Files.delete(path);
                            deletedDirs++;
                        }
                    } catch (IOException e) {
                        errors.add(String.format("Ошибка удаления %s: %s", path.getFileName(), e.getMessage()));
                    }
                }
            }

            logger.info("Очищена директория {}: удалено {} файлов, {} директорий, освобождено {} байт", 
                name, deletedFiles, deletedDirs, freedSpace);

        } catch (Exception e) {
            errors.add(String.format("Ошибка очистки %s: %s", name, e.getMessage()));
            logger.error("Ошибка очистки директории {}: {}", name, e.getMessage(), e);
        }

        summary.put("deleted_files", deletedFiles);
        summary.put("deleted_directories", deletedDirs);
        summary.put("freed_space_bytes", freedSpace);
        summary.put("freed_space_mb", freedSpace / (1024 * 1024));
        summary.put("errors", errors);

        return summary;
    }

    /**
     * Получает список всех спарсенных манг
     */
    public List<String> listParsedMangas() {
        try {
            Path titlesDir = Paths.get(properties.getOutputPath(), "titles");

            if (!Files.exists(titlesDir)) {
                return Collections.emptyList();
            }

            // Ищем все JSON файлы в titles/
            try (Stream<Path> paths = Files.walk(titlesDir, 1)) {
                return paths
                        .filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(".json"))
                        .map(p -> p.getFileName().toString().replace(".json", ""))
                        .sorted()
                        .collect(Collectors.toList());
            }

        } catch (Exception e) {
            logger.error("Ошибка получения списка манг: {}", e.getMessage(), e);
            return Collections.emptyList();
        }
    }

    /**
     * Удаляет данные конкретной манги
     */
    public boolean deleteManga(String slug) {
        try {
            Path outputPath = Paths.get(properties.getOutputPath());
            boolean deleted = false;

            // Удаляем JSON из titles/
            Path jsonFile = outputPath.resolve("titles").resolve(slug + ".json");
            if (Files.exists(jsonFile)) {
                Files.delete(jsonFile);
                deleted = true;
                logger.info("Удален файл метаданных: {}", jsonFile);
            }

            // Удаляем директорию из archives/ (главы с изображениями)
            Path archivesDir = outputPath.resolve("archives").resolve(slug);
            if (Files.exists(archivesDir) && Files.isDirectory(archivesDir)) {
                deleteDirectory(archivesDir);
                deleted = true;
                logger.info("Удалена директория с главами: {}", archivesDir);
            }

            // Удаляем обложку из images/
            Path imagesDir = outputPath.resolve("images");
            if (Files.exists(imagesDir) && Files.isDirectory(imagesDir)) {
                try (Stream<Path> files = Files.list(imagesDir)) {
                    files.filter(f -> f.getFileName().toString().startsWith(slug + "."))
                        .forEach(coverFile -> {
                            try {
                                Files.delete(coverFile);
                                logger.info("Удалена обложка: {}", coverFile);
                            } catch (IOException e) {
                                logger.error("Ошибка удаления обложки {}: {}", coverFile, e.getMessage());
                            }
                        });
                    deleted = true;
                }
            }

            return deleted;

        } catch (Exception e) {
            logger.error("Ошибка удаления манги {}: {}", slug, e.getMessage(), e);
            return false;
        }
    }

    /**
     * Рекурсивное удаление директории
     */
    private void deleteDirectory(Path directory) throws IOException {
        Files.walkFileTree(directory, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }
}
