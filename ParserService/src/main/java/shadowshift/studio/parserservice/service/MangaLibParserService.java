package shadowshift.studio.parserservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.dto.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * Сервис для парсинга манги с MangaLib
 * Реализует полный цикл: парсинг метаданных, загрузка изображений, сборка архивов
 */
@Service
public class MangaLibParserService {

    private static final Logger logger = LoggerFactory.getLogger(MangaLibParserService.class);
    
    private static final String MANGALIB_API_BASE = "https://api.cdnlibs.org/api";
    private static final String MANGALIB_CDN_BASE = "https://img33.imgslib.link";
    
    @Autowired
    private ParserProperties properties;
    
    @Autowired
    private ProxyRotatingRestTemplateService proxyRestTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private TaskStorageService taskStorage;
    
    @Autowired
    private ProxyManagerService proxyManager;
    
    @Autowired
    private ImageDownloadService imageDownloader;
    
    /**
     * Парсинг метаданных манги по slug
     */
    public CompletableFuture<ParseResult> parseManga(String slug, String parser) {
        String taskId = UUID.randomUUID().toString();
        ParseTask task = taskStorage.createParseTask(taskId, slug, parser);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                task.updateStatus("running", 10, "Получение метаданных с MangaLib...");
                
                // Нормализуем slug (убираем ID-- если есть)
                String normalizedSlug = normalizeSlug(slug);
                
                // Получаем данные манги
                MangaMetadata metadata = fetchMangaMetadata(normalizedSlug, task);
                
                // Получаем список глав
                List<ChapterInfo> chapters = fetchChapterList(normalizedSlug, task);
                
                // Сохраняем в JSON
                Path outputPath = saveToJson(normalizedSlug, metadata, chapters);
                
                task.updateStatus("completed", 100, "Парсинг завершен успешно");
                
                ParseResult result = new ParseResult();
                result.setSuccess(true);
                result.setSlug(normalizedSlug);
                result.setTitle(metadata.getTitle());
                result.setChaptersCount(chapters.size());
                result.setOutputPath(outputPath.toString());
                result.setMetadata(metadata);
                result.setChapters(chapters);
                
                return result;
                
            } catch (Exception e) {
                logger.error("Ошибка парсинга манги {}: {}", slug, e.getMessage(), e);
                task.updateStatus("failed", 0, "Ошибка: " + e.getMessage());
                
                ParseResult result = new ParseResult();
                result.setSuccess(false);
                result.setError(e.getMessage());
                return result;
            }
        });
    }
    
    /**
     * Получение метаданных манги из API MangaLib
     */
    private MangaMetadata fetchMangaMetadata(String slug, ParseTask task) throws IOException {
        task.updateProgress(20, "Загрузка информации о манге...");
        
        String url = MANGALIB_API_BASE + "/manga/" + slug + "?fields[]=summary&fields[]=background";
        
        HttpHeaders headers = createMangaLibHeaders();
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<String> response = proxyRestTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IOException("Не удалось получить данные манги: " + response.getStatusCode());
        }
        
        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode data = root.get("data");
        
        MangaMetadata metadata = new MangaMetadata();
        metadata.setSlug(slug);
        metadata.setTitle(data.has("rus_name") ? data.get("rus_name").asText() : data.get("name").asText());
        metadata.setEnglishTitle(data.has("name") ? data.get("name").asText() : null);
        metadata.setSummary(data.has("summary") ? data.get("summary").asText() : "");
        metadata.setStatus(data.has("status") ? data.get("status").get("name").asText() : "Unknown");
        metadata.setType(data.has("type") ? data.get("type").get("name").asText() : "Манга");
        metadata.setReleaseYear(data.has("releaseDate") ? data.get("releaseDate").asInt() : null);
        metadata.setCoverUrl(data.has("cover") ? data.get("cover").get("default").asText() : null);
        
        // Жанры
        if (data.has("genres")) {
            List<String> genres = new ArrayList<>();
            data.get("genres").forEach(g -> genres.add(g.get("name").asText()));
            metadata.setGenres(genres);
        }
        
        // Теги
        if (data.has("tags")) {
            List<String> tags = new ArrayList<>();
            data.get("tags").forEach(t -> tags.add(t.get("name").asText()));
            metadata.setTags(tags);
        }
        
        // Авторы
        if (data.has("authors")) {
            List<String> authors = new ArrayList<>();
            data.get("authors").forEach(a -> authors.add(a.get("name").asText()));
            metadata.setAuthors(authors);
        }
        
        return metadata;
    }
    
    /**
     * Получение списка глав
     */
    private List<ChapterInfo> fetchChapterList(String slug, ParseTask task) throws IOException {
        task.updateProgress(40, "Загрузка списка глав...");
        
        String url = MANGALIB_API_BASE + "/manga/" + slug + "/chapters";
        
        HttpHeaders headers = createMangaLibHeaders();
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<String> response = proxyRestTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IOException("Не удалось получить список глав: " + response.getStatusCode());
        }
        
        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode chaptersData = root.get("data");
        
        List<ChapterInfo> chapters = new ArrayList<>();
        
        if (chaptersData != null && chaptersData.isArray()) {
            for (JsonNode chapterNode : chaptersData) {
                ChapterInfo chapter = new ChapterInfo();
                chapter.setChapterId(chapterNode.get("id").asText());
                chapter.setNumber(chapterNode.has("number") ? chapterNode.get("number").asDouble() : 0);
                chapter.setVolume(chapterNode.has("volume") ? chapterNode.get("volume").asInt() : null);
                chapter.setTitle(chapterNode.has("name") ? chapterNode.get("name").asText() : "");
                chapter.setIsPaid(chapterNode.has("is_paid") && chapterNode.get("is_paid").asBoolean());
                
                chapters.add(chapter);
            }
        }
        
        // Сортируем главы по номеру
        chapters.sort(Comparator.comparingDouble(ChapterInfo::getNumber));
        
        logger.info("Загружено {} глав для манги {}", chapters.size(), slug);
        return chapters;
    }
    
    /**
     * Нормализация slug для безопасного использования в имени файла.
     * ВАЖНО: API MangaLib требует полный slug в формате "id--slug", поэтому НЕ обрезаем ID!
     * Метод нужен только для валидации, не для преобразования формата.
     */
    public String normalizeSlug(String slug) {
        if (slug == null || slug.isEmpty()) {
            return slug;
        }
        
        // API требует полный slug_url в формате "id--slug", поэтому просто возвращаем как есть
        return slug;
    }
    
    /**
     * Сохранение данных в JSON файл
     */
    private Path saveToJson(String slug, MangaMetadata metadata, List<ChapterInfo> chapters) throws IOException {
        Path outputDir = Paths.get(properties.getOutputPath());
        Files.createDirectories(outputDir);
        
        Path outputFile = outputDir.resolve(slug + ".json");
        
        Map<String, Object> data = new HashMap<>();
        data.put("slug", slug);
        data.put("metadata", metadata);
        data.put("chapters", chapters);
        data.put("parsed_at", new Date());
        
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(outputFile.toFile(), data);
        
        logger.info("Данные манги {} сохранены в {}", slug, outputFile);
        return outputFile;
    }
    
    /**
     * Получение каталога манги с фильтрами
     */
    public CompletableFuture<CatalogResult> fetchCatalog(int page, Integer minChapters, Integer maxChapters) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String url = MANGALIB_API_BASE + "/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=" + page;
                
                HttpHeaders headers = createMangaLibHeaders();
                HttpEntity<String> entity = new HttpEntity<>(headers);
                
                logger.debug("Requesting catalog page {} from {}", page, url);
                ResponseEntity<String> response = proxyRestTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                
                String responseBody = response.getBody();
                logger.debug("Response body length: {} chars", responseBody != null ? responseBody.length() : 0);
                if (responseBody != null && responseBody.length() < 200) {
                    logger.debug("Response body (short): {}", responseBody);
                } else if (responseBody != null) {
                    logger.debug("Response body preview (first 200 chars): {}", responseBody.substring(0, Math.min(200, responseBody.length())));
                }
                
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode data = root.get("data");
                
                if (data == null) {
                    logger.error("Response 'data' field is null. Full response: {}", responseBody != null && responseBody.length() < 500 ? responseBody : (responseBody != null ? responseBody.substring(0, 500) + "..." : "null"));
                } else {
                    logger.debug("Data array size: {}", data.isArray() ? data.size() : "not an array");
                    if (data.isArray() && data.size() > 0) {
                        logger.debug("First item keys: {}", data.get(0).fieldNames());
                    }
                }
                
                CatalogResult result = new CatalogResult();
                List<CatalogItem> items = new ArrayList<>();
                
                if (data != null && data.isArray()) {
                    for (JsonNode item : data) {
                        // Check for required fields
                        if (!item.has("slug") && !item.has("slug_url")) {
                            logger.warn("Item missing 'slug' and 'slug_url' fields. Available fields: {}", 
                                StreamSupport.stream(((Iterable<String>) () -> item.fieldNames()).spliterator(), false)
                                    .collect(java.util.stream.Collectors.joining(", ")));
                            continue;
                        }
                        
                        int chaptersCount = item.has("chapters_count") ? item.get("chapters_count").asInt() : 0;
                        
                        // Фильтрация по количеству глав
                        if (minChapters != null && chaptersCount < minChapters) continue;
                        if (maxChapters != null && chaptersCount > maxChapters) continue;
                        
                        CatalogItem catalogItem = new CatalogItem();
                        
                        // Получаем slug_url (формат "id--slug")
                        String slugUrl = item.has("slug_url") ? item.get("slug_url").asText() : null;
                        
                        // Используем slug или извлекаем из slug_url
                        String slug = item.has("slug") ? item.get("slug").asText() : null;
                        if (slug == null && slugUrl != null) {
                            // slug_url формата "7580--i-alone-level-up", берём часть после "--"
                            if (slugUrl.contains("--")) {
                                slug = slugUrl.substring(slugUrl.indexOf("--") + 2);
                            } else {
                                slug = slugUrl;
                            }
                        }
                        
                        if (slug == null || slug.isBlank()) {
                            logger.warn("Could not extract slug from item: {}", item);
                            continue;
                        }
                        
                        // Если нет slug_url, создаём его из ID + slug
                        if (slugUrl == null && item.has("id")) {
                            slugUrl = item.get("id").asText() + "--" + slug;
                        }
                        
                        catalogItem.setSlug(slug);
                        catalogItem.setSlugUrl(slugUrl != null ? slugUrl : slug);  // Используем slug как fallback
                        catalogItem.setTitle(item.has("rus_name") ? item.get("rus_name").asText() : item.get("name").asText());
                        catalogItem.setChaptersCount(chaptersCount);
                        
                        // Type может быть объектом с полем label
                        if (item.has("type")) {
                            JsonNode typeNode = item.get("type");
                            if (typeNode.isObject() && typeNode.has("label")) {
                                catalogItem.setType(typeNode.get("label").asText());
                            } else if (typeNode.isTextual()) {
                                catalogItem.setType(typeNode.asText());
                            } else {
                                catalogItem.setType("");
                            }
                        } else {
                            catalogItem.setType("");
                        }
                        
                        items.add(catalogItem);
                    }
                }
                
                result.setItems(items);
                result.setPage(page);
                result.setTotal(items.size());
                
                return result;
                
            } catch (Exception e) {
                logger.error("Ошибка получения каталога: {}", e.getMessage(), e);
                CatalogResult result = new CatalogResult();
                result.setItems(Collections.emptyList());
                return result;
            }
        });
    }
    
    /**
     * Создание заголовков для запросов к MangaLib API
     * Полный набор заголовков как в Python MelonService
     */
    private HttpHeaders createMangaLibHeaders() {
        HttpHeaders headers = new HttpHeaders();
        
        // Токен авторизации (если есть)
        String token = properties.getMangalib().getToken();
        if (token != null && !token.isBlank()) {
            headers.set("Authorization", token);
        }
        
        // Site-Id для MangaLib
        headers.set("Site-Id", properties.getMangalib().getSiteId());
        
        // Полный набор браузерных заголовков
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
        headers.set("Accept", "application/json, text/plain, */*");
        headers.set("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7");
        headers.set("Accept-Encoding", "gzip, deflate, br");
        headers.set("Origin", "https://mangalib.me");
        headers.set("Referer", "https://mangalib.me/manga-list");
        headers.set("Sec-Fetch-Dest", "empty");
        headers.set("Sec-Fetch-Mode", "cors");
        headers.set("Sec-Fetch-Site", "cross-site");
        headers.set("Sec-Ch-Ua", "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"");
        headers.set("Sec-Ch-Ua-Mobile", "?0");
        headers.set("Sec-Ch-Ua-Platform", "\"Windows\"");
        
        return headers;
    }
}
