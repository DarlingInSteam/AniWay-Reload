package shadowshift.studio.parserservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.config.ParserProperties;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
     * Очистка старых файлов (старше 30 дней)
     */
    public Map<String, Object> cleanup() {
        logger.info("Начало очистки старых данных...");

        int deletedFiles = 0;
        int deletedDirs = 0;
        long freedSpace = 0;

        try {
            Path outputPath = Paths.get(properties.getOutputPath());

            if (!Files.exists(outputPath)) {
                logger.warn("Директория вывода не существует: {}", outputPath);
                return createCleanupResult(0, 0, 0);
            }

            Instant cutoffTime = Instant.now().minus(30, ChronoUnit.DAYS);

            // Проходим по всем файлам и директориям
            Files.walkFileTree(outputPath, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (attrs.lastModifiedTime().toInstant().isBefore(cutoffTime)) {
                        long size = attrs.size();
                        Files.delete(file);
                        logger.debug("Удален файл: {} ({} байт)", file.getFileName(), size);
                        return FileVisitResult.CONTINUE;
                    }
                    return FileVisitResult.CONTINUE;
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                    // Удаляем пустые директории
                    if (!dir.equals(outputPath)) {
                        try (Stream<Path> entries = Files.list(dir)) {
                            if (entries.findAny().isEmpty()) {
                                Files.delete(dir);
                                logger.debug("Удалена пустая директория: {}", dir.getFileName());
                            }
                        }
                    }
                    return FileVisitResult.CONTINUE;
                }
            });

            logger.info("Очистка завершена");

        } catch (Exception e) {
            logger.error("Ошибка очистки: {}", e.getMessage(), e);
        }

        return createCleanupResult(deletedFiles, deletedDirs, freedSpace);
    }

    /**
     * Получает список всех спарсенных манг
     */
    public List<String> listParsedMangas() {
        try {
            Path outputPath = Paths.get(properties.getOutputPath());

            if (!Files.exists(outputPath)) {
                return Collections.emptyList();
            }

            // Ищем все JSON файлы
            try (Stream<Path> paths = Files.walk(outputPath, 1)) {
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
            Path jsonFile = outputPath.resolve(slug + ".json");
            Path imagesDir = outputPath.resolve(slug);

            boolean deleted = false;

            // Удаляем JSON
            if (Files.exists(jsonFile)) {
                Files.delete(jsonFile);
                deleted = true;
                logger.info("Удален файл метаданных: {}", jsonFile);
            }

            // Удаляем директорию с изображениями
            if (Files.exists(imagesDir) && Files.isDirectory(imagesDir)) {
                deleteDirectory(imagesDir);
                deleted = true;
                logger.info("Удалена директория изображений: {}", imagesDir);
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

    private Map<String, Object> createCleanupResult(int deletedFiles, int deletedDirs, long freedSpace) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("deleted_files", deletedFiles);
        result.put("deleted_directories", deletedDirs);
        result.put("freed_space_bytes", freedSpace);
        result.put("freed_space_mb", freedSpace / (1024 * 1024));
        return result;
    }
}
