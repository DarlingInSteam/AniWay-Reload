package shadowshift.studio.parserservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.dto.BranchSummary;
import shadowshift.studio.parserservice.dto.CatalogItem;
import shadowshift.studio.parserservice.dto.CatalogResult;
import shadowshift.studio.parserservice.dto.ChapterInfo;
import shadowshift.studio.parserservice.dto.MangaCover;
import shadowshift.studio.parserservice.dto.MangaMetadata;
import shadowshift.studio.parserservice.dto.ParseResult;
import shadowshift.studio.parserservice.dto.ParseTask;
import shadowshift.studio.parserservice.dto.SlideInfo;
import shadowshift.studio.parserservice.util.MangaLibApiHelper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Сервис для парсинга манги с MangaLib.
 * Формирует JSON в формате legacy melon-manga и кэширует список глав со слайдами.
 */
@Service
public class MangaLibParserService {

    private static final Logger logger = LoggerFactory.getLogger(MangaLibParserService.class);

    private static final String MANGALIB_API_BASE = "https://api.cdnlibs.org/api";
    private static final String CONSTANTS_ENDPOINT = MANGALIB_API_BASE + "/constants?fields[]=imageServers";
    private static final int MAX_CHAPTER_REQUEST_ATTEMPTS = 3;
    private static final long INITIAL_RETRY_DELAY_MS = 2_000L;
    private static final double RETRY_BACKOFF_FACTOR = 2.0;
    private static final double RETRY_JITTER_MIN = 0.85;
    private static final double RETRY_JITTER_MAX = 1.25;
    private static final long MAX_RETRY_DELAY_MS = 45_000L;
    private static final int MAX_CATALOG_ATTEMPTS = 5;
    private static final int DEFAULT_CATALOG_LIMIT = 60;

    @Autowired
    private ParserProperties properties;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TaskStorageService taskStorage;

    private volatile String cachedImageServer;

    /**
     * Получает страницу каталога MangaLib.
     */
    public CompletableFuture<CatalogResult> fetchCatalog(int page, Integer minChapters, Integer maxChapters) {
        final int effectivePage = Math.max(page, 1);
        return CompletableFuture.supplyAsync(() -> {
            HttpHeaders headers = createMangaLibHeaders();
            String url = buildCatalogUrl(effectivePage);
            String lastError = null;

            for (int attempt = 0; attempt < MAX_CATALOG_ATTEMPTS; attempt++) {
                try {
                    ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                    JsonNode root = objectMapper.readTree(response.getBody());

                    JsonNode dataNode = root.path("data");
                    if (!dataNode.isArray()) {
                        if (root.isArray()) {
                            dataNode = root;
                        } else {
                            logger.warn("Каталог MangaLib вернул неожиданную структуру для страницы {}", effectivePage);
                            dataNode = objectMapper.createArrayNode();
                        }
                    }

                    List<CatalogItem> items = new ArrayList<>();
                    int processed = 0;
                    for (JsonNode node : dataNode) {
                        if (processed++ >= DEFAULT_CATALOG_LIMIT) {
                            break;
                        }
                        CatalogItem item = mapCatalogItem(node);
                        int chaptersCount = Optional.ofNullable(item.getChaptersCount()).orElse(0);
                        if (minChapters != null && chaptersCount < minChapters) {
                            continue;
                        }
                        if (maxChapters != null && chaptersCount > maxChapters) {
                            continue;
                        }
                        if (item.getSlugUrl() == null) {
                            continue;
                        }
                        items.add(item);
                    }

                    CatalogResult result = new CatalogResult();
                    result.setItems(items);
                    result.setPage(effectivePage);
                    result.setTotal(root.path("meta").path("total").asInt(items.size()));
                    logger.info("Каталог страница {}: {} элементов после фильтрации", effectivePage, items.size());
                    return result;
                } catch (HttpStatusCodeException ex) {
                    int statusCode = ex.getStatusCode().value();
                    lastError = "HTTP " + statusCode + formatOptionalMessage(ex);
                    if (!MangaLibApiHelper.isRetryableStatus(statusCode) || attempt == MAX_CATALOG_ATTEMPTS - 1) {
                        throw new RuntimeException("Не удалось получить каталог: " + lastError, ex);
                    }
                    logger.warn("Каталог страница {}: {} — повтор через {} мс", effectivePage, lastError, computeRetryDelay(attempt));
                    safeSleep(computeRetryDelay(attempt));
                } catch (RestClientException | IOException ex) {
                    lastError = ex.getMessage();
                    if (attempt == MAX_CATALOG_ATTEMPTS - 1) {
                        throw new RuntimeException("Ошибка запроса каталога: " + ex.getMessage(), ex);
                    }
                    logger.warn("Каталог страница {}: {} — повтор через {} мс", effectivePage, lastError, computeRetryDelay(attempt));
                    safeSleep(computeRetryDelay(attempt));
                }
            }

            throw new RuntimeException(lastError != null ? lastError : "Не удалось получить каталог");
        });
    }

    /**
     * Запуск парсинга манги.
     */
    public CompletableFuture<ParseResult> parseManga(String slug, String parser) {
        String taskId = UUID.randomUUID().toString();
        ParseTask task = taskStorage.createParseTask(taskId, slug, parser);

        return CompletableFuture.supplyAsync(() -> {
            long startedAt = System.currentTimeMillis();
            SlugContext slugContext = resolveSlugContext(slug);
            logger.info("🚀 [PARSE START] Slug: {}, TaskId: {}", slugContext.getRawSlug(), taskId);

            try {
                task.updateStatus("running", 10, "Получение метаданных с MangaLib...");

                MangaMetadata metadata = fetchMangaMetadata(slugContext, task);
                slugContext.applyId(metadata.getId());

                task.updateProgress(35, "Загрузка списка глав...");
                ChaptersPayload chaptersPayload = fetchChapters(slugContext, metadata, task);

                task.updateProgress(95, "Сохранение данных...");
                Path outputPath = saveToJson(slugContext, metadata, chaptersPayload);

                task.updateStatus("completed", 100, "Парсинг завершен успешно");

                long totalTime = System.currentTimeMillis() - startedAt;
                logger.info("✅ [PARSE COMPLETE] Slug: {}, TaskId: {}, Time: {}ms, Chapters: {}",
                        slugContext.getFileSlug(), taskId, totalTime, chaptersPayload.totalChapters());

                ParseResult result = new ParseResult();
                result.setSuccess(true);
                result.setSlug(slugContext.getFileSlug());
                result.setTitle(Optional.ofNullable(metadata.getLocalizedName()).orElse(metadata.getTitle()));
                result.setChaptersCount(chaptersPayload.totalChapters());
                result.setOutputPath(outputPath.toString());
                result.setMetadata(metadata);
                result.setChapters(chaptersPayload.flatten());
                return result;
            } catch (Exception ex) {
                long totalTime = System.currentTimeMillis() - startedAt;
                logger.error("❌ [PARSE FAILED] Slug: {}, TaskId: {}, Time: {}ms, Error: {}",
                        slugContext.getRawSlug(), taskId, totalTime, ex.getMessage(), ex);
                task.updateStatus("failed", 0, "Ошибка: " + ex.getMessage());

                ParseResult result = new ParseResult();
                result.setSuccess(false);
                result.setError(ex.getMessage());
                return result;
            }
        });
    }

    private MangaMetadata fetchMangaMetadata(SlugContext slugContext, ParseTask task) throws IOException {
        HttpHeaders headers = createMangaLibHeaders();
        String baseUrl = MANGALIB_API_BASE + "/manga/" + slugContext.getApiSlug();
        
        // Убрали fields запрос - он всегда возвращает 422, используем просто базовый URL
        String url = baseUrl;
        String lastError = null;

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");
            if (!data.isObject()) {
                if (root.isObject()) {
                    data = root;
                } else {
                    throw new IOException("Пустой ответ при получении данных тайтла");
                }
            }
            return mapMetadata(slugContext, data);
        } catch (HttpStatusCodeException ex) {
            lastError = "HTTP " + ex.getStatusCode().value() + formatOptionalMessage(ex);
            throw new IOException("Не удалось получить данные манги: " + lastError, ex);
        } catch (RestClientException ex) {
            lastError = ex.getMessage();
            throw new IOException("Ошибка запроса данных манги: " + ex.getMessage(), ex);
        } catch (IOException ex) {
            throw ex;
        }
    }

    private ChaptersPayload fetchChapters(SlugContext slugContext, MangaMetadata metadata, ParseTask task) throws IOException {
        HttpHeaders headers = createMangaLibHeaders();
        String url = MANGALIB_API_BASE + "/manga/" + slugContext.getApiSlug() + "/chapters";

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                throw new IOException("Некорректный формат ответа при получении списка глав");
            }

            Map<Integer, List<ChapterInfo>> content = new LinkedHashMap<>();
            List<ChapterInfo> allChapters = new ArrayList<>();
            int defaultBranchId = slugContext.getDefaultBranchId();

            for (JsonNode chapterNode : data) {
                Double number = parseDouble(chapterNode.path("number"));
                Integer volume = parseInteger(chapterNode.path("volume"));
                String name = chapterNode.path("name").isMissingNode() ? null : chapterNode.path("name").asText(null);
                String chapterSlug = chapterNode.path("slug").isMissingNode() ? null : chapterNode.path("slug").asText(null);

                for (JsonNode branchNode : chapterNode.path("branches")) {
                    Integer branchId = branchNode.path("branch_id").isMissingNode()
                            ? defaultBranchId
                            : branchNode.path("branch_id").asInt(defaultBranchId);

                    ChapterInfo chapter = new ChapterInfo();
                    chapter.setChapterId(branchNode.path("id").asText());
                    chapter.setBranchId(branchId);
                    chapter.setNumber(number);
                    chapter.setVolume(volume);
                    chapter.setTitle(name);
                    chapter.setSlug(chapterSlug);

                    JsonNode restricted = branchNode.path("restricted_view");
                    boolean isPaid = !restricted.isMissingNode() && !restricted.path("is_open").asBoolean(true);
                    chapter.setIsPaid(isPaid);
                    if (!restricted.isMissingNode() && restricted.hasNonNull("expired_at")) {
                        chapter.setFreePublicationDate(restricted.get("expired_at").asText());
                    }

                    chapter.setWorkers(readNamedArray(branchNode.path("teams"), "name"));
                    chapter.setModerated(!branchNode.has("moderation"));

                    content.computeIfAbsent(branchId, k -> new ArrayList<>()).add(chapter);
                    allChapters.add(chapter);
                }
            }

        List<BranchSummary> branches = content.entrySet().stream()
            .map(entry -> new BranchSummary(entry.getKey(), entry.getValue().size()))
            .collect(Collectors.toCollection(ArrayList::new));

            if (allChapters.isEmpty()) {
                logger.warn("Манга {} не содержит глав", slugContext.getFileSlug());
                return new ChaptersPayload(content, branches);
            }

            task.updateProgress(50, "Загрузка страниц глав...");
            String imageServer = resolveImageServer();
            int totalChapters = allChapters.size();
            int processed = 0;

            for (ChapterInfo chapter : allChapters) {
                processed++;
                if (Boolean.TRUE.equals(chapter.getIsPaid())) {
                    chapter.setSlides(Collections.emptyList());
                    chapter.setPagesCount(0);
                    chapter.setEmptyReason("платная глава — доступ ограничен");
                } else {
                    try {
                        List<SlideInfo> slides = fetchChapterSlides(slugContext, chapter, defaultBranchId, headers, imageServer);
                        chapter.setSlides(slides);
                        chapter.setPagesCount(slides.size());
                    } catch (IOException ex) {
                        chapter.setSlides(Collections.emptyList());
                        chapter.setPagesCount(0);
                        chapter.setEmptyReason(ex.getMessage());
                        logger.warn("Глава {} не содержит изображений: {}", chapter.getChapterId(), ex.getMessage());
                    }
                }

                int progress = 50 + (int) Math.round((processed / (double) totalChapters) * 40.0);
                progress = Math.min(progress, 90);
                task.updateProgress(progress, String.format(Locale.ROOT, "Обработано %d/%d глав", processed, totalChapters));
            }

            return new ChaptersPayload(content, branches);
        } catch (HttpStatusCodeException ex) {
            throw new IOException("Не удалось получить список глав: HTTP " + ex.getStatusCode().value()
                    + formatOptionalMessage(ex), ex);
        } catch (RestClientException ex) {
            throw new IOException("Ошибка запроса списка глав: " + ex.getMessage(), ex);
        }
    }

    private List<SlideInfo> fetchChapterSlides(SlugContext slugContext,
                                               ChapterInfo chapter,
                                               int defaultBranchId,
                                               HttpHeaders baseHeaders,
                                               String imageServer) throws IOException {
        List<String> urlVariants = MangaLibApiHelper.buildChapterUrlVariants(
                MANGALIB_API_BASE,
                slugContext.getApiSlug(),
                chapter.getChapterId(),
                chapter.getNumber(),
                chapter.getVolume(),
                chapter.getBranchId(),
                defaultBranchId > 0 ? defaultBranchId : null
        );

        if (urlVariants.isEmpty()) {
            chapter.setEmptyReason("не удалось сформировать запрос для главы");
            return Collections.emptyList();
        }

        String lastError = null;
        for (String url : urlVariants) {
            for (int attempt = 0; attempt < MAX_CHAPTER_REQUEST_ATTEMPTS; attempt++) {
                try {
                    ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(baseHeaders), String.class);
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode pages = root.has("pages") ? root.get("pages") : root.path("data").path("pages");
                    if (!pages.isArray() || pages.isEmpty()) {
                        lastError = "источник не вернул страницы";
                        break;
                    }
                    return parseSlides(pages, imageServer);
                } catch (HttpStatusCodeException ex) {
                    int statusCode = ex.getStatusCode().value();
                    lastError = "HTTP " + statusCode + formatOptionalMessage(ex);
                    if (!MangaLibApiHelper.isRetryableStatus(statusCode)
                            || attempt == MAX_CHAPTER_REQUEST_ATTEMPTS - 1) {
                        break;
                    }
                    safeSleep(computeRetryDelay(attempt));
                } catch (RestClientException | IOException ex) {
                    lastError = ex.getMessage();
                    if (attempt == MAX_CHAPTER_REQUEST_ATTEMPTS - 1) {
                        break;
                    }
                    safeSleep(computeRetryDelay(attempt));
                }
            }
        }

        if (lastError == null) {
            lastError = "источник не вернул страницы";
        }
        chapter.setEmptyReason(lastError);
        return Collections.emptyList();
    }

    private List<SlideInfo> parseSlides(JsonNode pages, String imageServer) {
        List<SlideInfo> slides = new ArrayList<>();
        int index = 1;
        for (JsonNode page : pages) {
            String relative = page.path("url").asText(null);
            if (relative == null || relative.isBlank()) {
                continue;
            }
            String sanitized = relative.replace(" ", "%20");
            String link = imageServer + sanitized;
            Integer width = page.hasNonNull("width") ? page.get("width").asInt() : null;
            Integer height = page.hasNonNull("height") ? page.get("height").asInt() : null;
            slides.add(new SlideInfo(index++, link, width, height));
        }
        return slides;
    }

    private CatalogItem mapCatalogItem(JsonNode node) {
        CatalogItem item = new CatalogItem();

        String slugUrl = Optional.ofNullable(node.path("slug_url").asText(null))
                .orElse(node.path("slug").asText(null));
        if (slugUrl != null && slugUrl.isBlank()) {
            slugUrl = null;
        }

        String slug = node.path("slug").asText(null);
        if ((slug == null || slug.isBlank()) && slugUrl != null && slugUrl.contains("--")) {
            slug = slugUrl.substring(slugUrl.indexOf("--") + 2);
        }

        String title = node.path("rus_name").asText(null);
        if (title == null || title.isBlank()) {
            title = node.path("name").asText(null);
        }
        if (title == null || title.isBlank()) {
            title = node.path("eng_name").asText(null);
        }

        Integer chapters = extractChaptersCount(node);
        String type = mapTypeLabel(node.path("type"));

        item.setSlug(slug);
        item.setSlugUrl(slugUrl);
        item.setTitle(title);
        item.setChaptersCount(chapters);
        item.setType(type);
        return item;
    }

    private Integer extractChaptersCount(JsonNode node) {
        for (String field : List.of("chapters_count", "chapters", "count_chapters", "countChapters")) {
            JsonNode value = node.get(field);
            if (value != null && value.isInt()) {
                return value.asInt();
            }
        }
        return null;
    }

    private String mapTypeLabel(JsonNode typeNode) {
        if (typeNode == null || typeNode.isNull()) {
            return null;
        }
        if (typeNode.isTextual()) {
            return typeNode.asText();
        }
        if (typeNode.isObject()) {
            String label = typeNode.path("label").asText(null);
            if (label != null && !label.isBlank()) {
                return label;
            }
            return typeNode.path("code").asText(null);
        }
        return null;
    }

    private String buildCatalogUrl(int page) {
        return MANGALIB_API_BASE + "/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=" + page;
    }

    private Path saveToJson(SlugContext slugContext, MangaMetadata metadata, ChaptersPayload chaptersPayload) throws IOException {
        Path titlesDir = Paths.get(properties.getOutputPath(), "titles");
        Files.createDirectories(titlesDir);

        Path outputFile = titlesDir.resolve(slugContext.getFileSlug() + ".json");
        Map<String, Object> root = new LinkedHashMap<>();

        root.put("format", "melon-manga");
        root.put("site", metadata.getSite());
        root.put("id", metadata.getId());
        root.put("slug", slugContext.getFileSlug());
        root.put("content_language", Optional.ofNullable(metadata.getContentLanguage()).orElse("rus"));
        root.put("title", metadata.getTitle()); // Добавляем title для совместимости
        root.put("localized_name", metadata.getLocalizedName());
        root.put("eng_name", metadata.getEnglishTitle());
        root.put("another_names", Optional.ofNullable(metadata.getOtherNames()).orElse(Collections.emptyList()));
        root.put("covers", buildCovers(metadata));
        root.put("authors", Optional.ofNullable(metadata.getAuthors()).orElse(Collections.emptyList()));
        root.put("artists", Optional.ofNullable(metadata.getArtists()).orElse(Collections.emptyList()));
        root.put("publishers", Optional.ofNullable(metadata.getPublishers()).orElse(Collections.emptyList()));
        root.put("teams", Optional.ofNullable(metadata.getTeams()).orElse(Collections.emptyList()));
        root.put("publication_year", metadata.getReleaseYear());
        root.put("description", metadata.getSummary());
        root.put("age_limit", metadata.getAgeLimit());
        root.put("type", metadata.getTypeCode());
        root.put("status", metadata.getStatusCode());
        root.put("is_licensed", metadata.getLicensed());
        root.put("genres", Optional.ofNullable(metadata.getGenres()).orElse(Collections.emptyList()));
        root.put("tags", Optional.ofNullable(metadata.getTags()).orElse(Collections.emptyList()));
        root.put("franchises", Optional.ofNullable(metadata.getFranchises()).orElse(Collections.emptyList()));
        root.put("persons", Collections.emptyList());
        root.put("branches", chaptersPayload.getBranches().stream()
                .map(branch -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", branch.getId());
                    map.put("chapters_count", branch.getChaptersCount());
                    return map;
                })
                .collect(Collectors.toList()));

        Map<String, Object> contentJson = new LinkedHashMap<>();
        List<Map<String, Object>> flattenedChapters = new ArrayList<>();
        for (Map.Entry<Integer, List<ChapterInfo>> entry : chaptersPayload.getContent().entrySet()) {
            String branchKey = String.valueOf(entry.getKey());
            List<Map<String, Object>> chapters = new ArrayList<>();
            for (ChapterInfo chapter : entry.getValue()) {
                Map<String, Object> chapterJson = buildChapterJson(chapter);
                chapters.add(chapterJson);
                flattenedChapters.add(chapterJson);
            }
            contentJson.put(branchKey, chapters);
        }
        root.put("content", contentJson);
        root.put("chapters", flattenedChapters);
        root.put("chapters_count", flattenedChapters.size());

        objectMapper.writerWithDefaultPrettyPrinter().writeValue(outputFile.toFile(), root);
        logger.info("💾 JSON сохранён: {}", outputFile);
        return outputFile;
    }

    private List<Map<String, Object>> buildCovers(MangaMetadata metadata) {
        List<MangaCover> covers = metadata.getCovers();
        if (covers == null || covers.isEmpty()) {
            if (metadata.getCoverUrl() == null) {
                return Collections.emptyList();
            }
            String filename = metadata.getCoverUrl().substring(metadata.getCoverUrl().lastIndexOf('/') + 1);
            return List.of(Map.of("link", metadata.getCoverUrl(), "filename", filename));
        }
        return covers.stream()
                .map(cover -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("link", cover.getLink());
                    map.put("filename", cover.getFilename());
                    if (cover.getWidth() != null) {
                        map.put("width", cover.getWidth());
                    }
                    if (cover.getHeight() != null) {
                        map.put("height", cover.getHeight());
                    }
                    return map;
                })
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildChapterJson(ChapterInfo chapter) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", parseNumericId(chapter.getChapterId()));
        map.put("slug", chapter.getSlug());
        map.put("volume", formatVolume(chapter.getVolume()));
        map.put("number", formatNumber(chapter.getNumber()));
        map.put("name", chapter.getTitle());
        map.put("is_paid", Boolean.TRUE.equals(chapter.getIsPaid()));
        map.put("branch_id", chapter.getBranchId());
        
        // КРИТИЧНО: Сохраняем folder_name для корректного импорта изображений
        if (chapter.getFolderName() != null && !chapter.getFolderName().isBlank()) {
            map.put("folder_name", chapter.getFolderName());
        }
        
        if (chapter.getPagesCount() != null) {
            map.put("pages_count", chapter.getPagesCount());
        }
        if (chapter.getFreePublicationDate() != null) {
            map.put("free_publication_date", chapter.getFreePublicationDate());
        }
        if (chapter.getEmptyReason() != null && !chapter.getEmptyReason().isBlank()) {
            map.put("empty_reason", chapter.getEmptyReason());
        }
        map.put("workers", Optional.ofNullable(chapter.getWorkers()).orElse(Collections.emptyList()));
        map.put("slides", Optional.ofNullable(chapter.getSlides()).orElse(Collections.emptyList()).stream()
                .map(slide -> {
                    Map<String, Object> slideMap = new LinkedHashMap<>();
                    slideMap.put("index", slide.getIndex());
                    slideMap.put("link", slide.getLink());
                    if (slide.getWidth() != null) {
                        slideMap.put("width", slide.getWidth());
                    }
                    if (slide.getHeight() != null) {
                        slideMap.put("height", slide.getHeight());
                    }
                    return slideMap;
                })
                .collect(Collectors.toList()));
        map.put("moderated", chapter.getModerated() != null ? chapter.getModerated() : Boolean.TRUE);
        return map;
    }

    private HttpHeaders createMangaLibHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String token = MangaLibApiHelper.normalizeToken(properties.getMangalib().getToken());
        if (token != null) {
            headers.set("Authorization", token);
        }
        headers.set("Site-Id", properties.getMangalib().getSiteId());
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
        headers.set("Accept", "application/json, text/plain, */*");
        headers.set("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7");
        headers.set("Accept-Encoding", "gzip, deflate, br");
        headers.set("Origin", "https://" + properties.getMangalib().getSiteDomain());
        headers.set("Referer", properties.getMangalib().getReferer());
        headers.set("Sec-Fetch-Dest", "empty");
        headers.set("Sec-Fetch-Mode", "cors");
        headers.set("Sec-Fetch-Site", "cross-site");
        headers.set("Sec-CH-UA", "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"");
        headers.set("Sec-CH-UA-Mobile", "?0");
        headers.set("Sec-CH-UA-Platform", "\"Windows\"");
        return headers;
    }

    private MangaMetadata mapMetadata(SlugContext slugContext, JsonNode data) {
        MangaMetadata metadata = new MangaMetadata();
        Integer id = data.hasNonNull("id") ? data.get("id").asInt() : null;
        metadata.setId(id);
        metadata.setSlug(slugContext.getFileSlug());

        String localizedName = data.path("rus_name").asText(null);
        String engName = data.path("eng_name").asText(null);
        String canonicalName = data.path("name").asText(null);

        metadata.setLocalizedName(localizedName != null ? localizedName : canonicalName);
        metadata.setTitle(metadata.getLocalizedName());
        metadata.setEnglishTitle(engName != null ? engName : canonicalName);
        metadata.setSummary(data.path("summary").asText(""));

        metadata.setStatusCode(mapStatus(data.path("status")));
        metadata.setStatus(metadata.getStatusCode());
        metadata.setTypeCode(mapType(data.path("type")));
        metadata.setType(metadata.getTypeCode());

        // Парсим releaseDate - может быть строкой "2020" или числом 2020
        Integer releaseYear = null;
        if (data.hasNonNull("releaseDate")) {
            JsonNode releaseNode = data.get("releaseDate");
            if (releaseNode.isNumber()) {
                releaseYear = releaseNode.asInt();
            } else if (releaseNode.isTextual()) {
                try {
                    releaseYear = Integer.parseInt(releaseNode.asText().trim());
                } catch (NumberFormatException e) {
                    logger.warn("Не удалось распарсить releaseDate: {}", releaseNode.asText());
                }
            }
        }
        metadata.setReleaseYear(releaseYear);
        
        metadata.setCoverUrl(data.path("cover").path("default").asText(null));
        
        // DEBUG: Логируем что извлекли из API
        List<String> genres = readNamedArray(data.path("genres"), "name");
        logger.debug("📊 [PARSER DEBUG] Extracted genres from API: {}", genres);
        metadata.setGenres(genres);
        
        List<String> tags = readNamedArray(data.path("tags"), "name");
        logger.debug("🏷️ [PARSER DEBUG] Extracted tags from API: {}", tags);
        metadata.setTags(tags);
        
        List<String> authors = readNamedArray(data.path("authors"), "name");
        logger.debug("✍️ [PARSER DEBUG] Extracted authors from API: {}", authors);
        metadata.setAuthors(authors);
        metadata.setArtists(readNamedArray(data.path("artists"), "name"));
        metadata.setPublishers(readNamedArray(data.path("publisher"), "name"));
        metadata.setTeams(readNamedArray(data.path("teams"), "name"));
        metadata.setFranchises(filterFranchises(readNamedArray(data.path("franchise"), "name")));
        metadata.setOtherNames(buildOtherNames(data.path("otherNames"), canonicalName, localizedName));
        metadata.setLicensed(data.path("is_licensed").asBoolean(false));
        metadata.setAgeLimit(parseAgeLimit(data.path("ageRestriction")));
        metadata.setSite(properties.getMangalib().getSiteDomain());
        metadata.setContentLanguage("rus");
        metadata.setCovers(buildCoverList(metadata));
        return metadata;
    }

    private List<String> buildOtherNames(JsonNode otherNamesNode, String canonicalName, String localizedName) {
        List<String> names = new ArrayList<>();
        if (otherNamesNode.isArray()) {
            otherNamesNode.forEach(node -> {
                String value = node.asText(null);
                if (value != null && !value.isBlank()) {
                    names.add(value);
                }
            });
        }
        if (canonicalName != null && !canonicalName.isBlank()) {
            if (!canonicalName.equalsIgnoreCase(localizedName) && !names.contains(canonicalName)) {
                names.add(canonicalName);
            }
        }
        return names;
    }

    private List<MangaCover> buildCoverList(MangaMetadata metadata) {
        List<MangaCover> covers = metadata.getCovers();
        if (covers != null && !covers.isEmpty()) {
            return covers;
        }
        if (metadata.getCoverUrl() == null) {
            return Collections.emptyList();
        }
        String filename = metadata.getCoverUrl().substring(metadata.getCoverUrl().lastIndexOf('/') + 1);
        return List.of(new MangaCover(metadata.getCoverUrl(), filename, null, null));
    }

    private List<String> filterFranchises(List<String> franchises) {
        if (franchises == null) {
            return Collections.emptyList();
        }
        return franchises.stream()
                .filter(name -> !"Оригинальные работы".equalsIgnoreCase(name))
                .collect(Collectors.toList());
    }

    private String mapStatus(JsonNode statusNode) {
        int statusId = statusNode.path("id").asInt(-1);
        return switch (statusId) {
            case 1 -> "ongoing";
            case 2 -> "completed";
            case 3 -> "announced";
            case 4, 5 -> "dropped";
            default -> null;
        };
    }

    private String mapType(JsonNode typeNode) {
        int typeId = typeNode.path("id").asInt(-1);
        String label = typeNode.path("label").asText("");
        return switch (typeId) {
            case 9 -> "western_comic";
            case 4 -> "oel";
            case 8 -> "russian_comic";
            default -> switch (label) {
                case "Манга" -> "manga";
                case "Манхва" -> "manhwa";
                case "Маньхуа" -> "manhua";
                case "Руманга" -> "russian_comic";
                case "Комикс", "Комикс западный" -> "western_comic";
                case "OEL-манга" -> "oel";
                default -> null;
            };
        };
    }

    private Integer parseAgeLimit(JsonNode ageNode) {
        if (!ageNode.isObject()) {
            return null;
        }
        String label = ageNode.path("label").asText("");
        String numeric = label.replace("+", "").replace("Нет", "").trim();
        if (numeric.chars().allMatch(Character::isDigit) && !numeric.isEmpty()) {
            return Integer.parseInt(numeric);
        }
        return null;
    }

    private List<String> readNamedArray(JsonNode node, String fieldName) {
        if (!node.isArray()) {
            return Collections.emptyList();
        }
        List<String> values = new ArrayList<>();
        for (JsonNode entry : node) {
            JsonNode valueNode = entry.path(fieldName);
            if (valueNode.isTextual() && !valueNode.asText().isBlank()) {
                values.add(valueNode.asText());
            }
        }
        return values;
    }

    private String resolveImageServer() throws IOException {
        String cached = cachedImageServer;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (cachedImageServer != null) {
                return cachedImageServer;
            }
            HttpHeaders headers = createMangaLibHeaders();
            try {
                ResponseEntity<String> response = restTemplate.exchange(CONSTANTS_ENDPOINT, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode servers = root.path("data").path("imageServers");
                if (!servers.isArray() || servers.isEmpty()) {
                    throw new IOException("Список серверов изображений пуст");
                }

                String preferredId = Optional.ofNullable(properties.getMangalib().getServer()).orElse("main");
                Integer siteId = parseIntegerSafe(properties.getMangalib().getSiteId());

                String fallback = null;
                for (JsonNode serverNode : servers) {
                    String id = serverNode.path("id").asText("");
                    String url = serverNode.path("url").asText("");
                    if (url.isBlank()) {
                        continue;
                    }
                    boolean supportsSite = siteId == null || serverNode.path("site_ids").toString().contains(String.valueOf(siteId));
                    if (!supportsSite) {
                        continue;
                    }
                    url = ensureTrailingSlash(url);
                    if (id.equals(preferredId)) {
                        cachedImageServer = url;
                        return cachedImageServer;
                    }
                    if (fallback == null) {
                        fallback = url;
                    }
                }
                if (fallback != null) {
                    cachedImageServer = fallback;
                    return cachedImageServer;
                }
                throw new IOException("Не найден подходящий сервер изображений");
            } catch (HttpStatusCodeException ex) {
                throw new IOException("Не удалось получить конфигурацию серверов изображений: HTTP "
                        + ex.getStatusCode().value() + formatOptionalMessage(ex), ex);
            } catch (RestClientException ex) {
                throw new IOException("Ошибка запроса серверов изображений: " + ex.getMessage(), ex);
            }
        }
    }

    private String ensureTrailingSlash(String url) {
        return url.endsWith("/") ? url : url + "/";
    }

    private Integer parseIntegerSafe(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double parseDouble(JsonNode node) {
        if (node.isNumber()) {
            return node.asDouble();
        }
        if (node.isTextual()) {
            String text = node.asText();
            try {
                return Double.parseDouble(text.replace(',', '.'));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Integer parseInteger(JsonNode node) {
        if (node.isNumber()) {
            return node.asInt();
        }
        if (node.isTextual()) {
            try {
                return Integer.parseInt(node.asText());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private String formatNumber(Double number) {
        return number == null ? null : MangaLibApiHelper.formatDecimal(number);
    }

    private String formatVolume(Integer volume) {
        String formatted = MangaLibApiHelper.formatVolume(volume);
        return formatted != null ? formatted : "1";
    }

    private Object parseNumericId(String value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return value;
        }
    }

    private String formatOptionalMessage(HttpStatusCodeException ex) {
        String body = ex.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return "";
        }
        try {
            JsonNode node = objectMapper.readTree(body);
            if (node.isObject()) {
                for (String key : List.of("message", "error", "detail", "reason")) {
                    JsonNode value = node.get(key);
                    if (value != null && value.isTextual() && !value.asText().isBlank()) {
                        return " - " + value.asText();
                    }
                }
            }
        } catch (Exception ignored) {
            // ignore
        }
        return body.length() > 120 ? " - " + body.substring(0, 120) : " - " + body;
    }

    private long computeRetryDelay(int attempt) {
        double base = INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_BACKOFF_FACTOR, attempt);
        double jitter = ThreadLocalRandom.current().nextDouble(RETRY_JITTER_MIN, RETRY_JITTER_MAX);
        long delay = (long) (base * jitter);
        return Math.min(delay, MAX_RETRY_DELAY_MS);
    }

    private void safeSleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    public String normalizeSlug(String slug) {
        return resolveSlugContext(slug).getFileSlug();
    }

    private SlugContext resolveSlugContext(String raw) {
        if (raw == null || raw.isBlank()) {
            return new SlugContext("", "", "", null, false);
        }
        String trimmed = raw.trim();
        if (trimmed.contains("--")) {
            String[] parts = trimmed.split("--", 2);
            if (parts.length == 2 && parts[0].chars().allMatch(Character::isDigit)) {
                Integer id = parseIntegerSafe(parts[0]);
                String fileSlug = parts[1].isBlank() ? parts[1] : parts[1];
                return new SlugContext(trimmed, trimmed, fileSlug, id, true);
            }
        }
        String normalized = trimmed.replace('/', '-');
        return new SlugContext(trimmed, normalized, normalized, null, false);
    }

    private static final class ChaptersPayload {
        private final Map<Integer, List<ChapterInfo>> content;
        private final List<BranchSummary> branches;

        ChaptersPayload(Map<Integer, List<ChapterInfo>> content, List<BranchSummary> branches) {
            this.content = content;
            this.branches = branches;
        }

        Map<Integer, List<ChapterInfo>> getContent() {
            return content;
        }

        List<BranchSummary> getBranches() {
            return branches;
        }

        int totalChapters() {
            return content.values().stream().mapToInt(List::size).sum();
        }

        List<ChapterInfo> flatten() {
            return content.values().stream().flatMap(List::stream).collect(Collectors.toList());
        }
    }

    private static final class SlugContext {
        private final String rawSlug;
        private final boolean hasExplicitId;
        private String apiSlug;
        private String fileSlug;
        private Integer titleId;

        SlugContext(String rawSlug, String apiSlug, String fileSlug, Integer titleId, boolean hasExplicitId) {
            this.rawSlug = rawSlug;
            this.apiSlug = apiSlug;
            this.fileSlug = fileSlug == null || fileSlug.isBlank() ? rawSlug : fileSlug;
            this.titleId = titleId;
            this.hasExplicitId = hasExplicitId;
        }

        String getRawSlug() {
            return rawSlug;
        }

        String getApiSlug() {
            return apiSlug != null ? apiSlug : fileSlug;
        }

        String getFileSlug() {
            return fileSlug;
        }

        int getDefaultBranchId() {
            return titleId != null ? Integer.parseInt(titleId + "0") : 0;
        }

        void applyId(Integer id) {
            if (id == null) {
                return;
            }
            this.titleId = id;
            if (!hasExplicitId) {
                this.apiSlug = id + "--" + fileSlug;
            }
        }
    }
}
