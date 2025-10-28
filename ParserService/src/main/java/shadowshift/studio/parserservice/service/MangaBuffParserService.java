package shadowshift.studio.parserservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Connection;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
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
import shadowshift.studio.parserservice.util.MangaBuffApiHelper;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Парсер MangaBuff.ru с сохранением прежнего формата DTO.
 */
@Service
public class MangaBuffParserService {

    private static final Logger logger = LoggerFactory.getLogger(MangaBuffParserService.class);
    private static final int DEFAULT_BRANCH_ID = 1;
    private final ParserProperties properties;
    private final ObjectMapper objectMapper;
    private final TaskStorageService taskStorage;
    private final ProxyManagerService proxyManager;
    
    // Кеш cookies для избежания повторных запросов к главной странице манги
    // Key: slug, Value: Response с cookies от DDoS-Guard
    private final Map<String, Connection.Response> cookieCache = new ConcurrentHashMap<>();

    public MangaBuffParserService(ParserProperties properties,
                                  ObjectMapper objectMapper,
                                  TaskStorageService taskStorage,
                                  ProxyManagerService proxyManager) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.taskStorage = taskStorage;
        this.proxyManager = proxyManager;
    }

    private MangaBuffApiHelper.ProxyConfig getProxyConfig() {
        ProxyManagerService.ProxyServer proxy = proxyManager.getProxyForCurrentThread();
        if (proxy == null) {
            return null;
        }
        return new MangaBuffApiHelper.ProxyConfig(
            proxy.getHost(),
            proxy.getPort(),
            proxy.getUsername(),
            proxy.getPassword()
        );
    }

    public CompletableFuture<CatalogResult> fetchCatalog(int page, Integer minChapters, Integer maxChapters) {
        return CompletableFuture.supplyAsync(() -> {
            SlugContext context = new SlugContext("catalog");
            try {
                String url = MangaBuffApiHelper.buildCatalogUrl(page);
                logger.info("📄 [CATALOG] GET {}", url);
                Connection.Response response = MangaBuffApiHelper.newConnection(url, getProxyConfig()).execute();
                Document document = response.parse();

                List<CatalogItem> items = parseCatalog(document);
                if (minChapters != null || maxChapters != null) {
                    items = items.stream()
                            .map(item -> enrichChaptersCount(item, minChapters, maxChapters))
                            .filter(Optional::isPresent)
                            .map(Optional::get)
                            .collect(Collectors.toList());
                }

                CatalogResult result = new CatalogResult();
                result.setItems(items);
                result.setPage(Math.max(page, 1));
                result.setTotal(items.size());
                return result;
            } catch (IOException ex) {
                throw new RuntimeException("Не удалось получить каталог: " + ex.getMessage(), ex);
            }
        });
    }

    public CompletableFuture<ParseResult> parseManga(String slug, String parser) {
        String taskId = UUID.randomUUID().toString();
        SlugContext slugContext = new SlugContext(slug);
        ParseTask task = taskStorage.createParseTask(taskId, slugContext.getFileSlug(), parser);

        return CompletableFuture.supplyAsync(() -> {
            long startedAt = System.currentTimeMillis();
            task.updateStatus("running", 5, "Загрузка страницы манги...");

            try {
                Connection.Response response = fetchMangaPage(slugContext);
                Document document = response.parse();
                
                // КРИТИЧНО: Кешируем cookies сразу после получения страницы манги
                // Эти cookies будут использоваться для загрузки глав в BUILD фазе
                String cacheKey = slugContext.getFileSlug();
                cookieCache.put(cacheKey, response);
                logger.info("🍪 [COOKIES] Cached {} cookies for {} from manga page", 
                           response.cookies().size(), cacheKey);

                task.updateProgress(10, "Парсинг метаданных...");
                MangaMetadata metadata = buildMetadata(slugContext, document);

                task.updateProgress(25, "Парсинг списка глав...");
                ChaptersPayload chaptersPayload = buildChapters(slugContext, document, response, task);

                task.updateProgress(95, "Сохранение JSON...");
                Path output = saveToJson(slugContext, metadata, chaptersPayload);

                task.updateStatus("completed", 100, "Парсинг завершен");

                ParseResult result = new ParseResult();
                result.setSuccess(true);
                result.setSlug(slugContext.getFileSlug());
                result.setTitle(Optional.ofNullable(metadata.getLocalizedName()).orElse(metadata.getTitle()));
                result.setChaptersCount(chaptersPayload.totalChapters());
                result.setOutputPath(output.toString());
                result.setMetadata(metadata);
                result.setChapters(chaptersPayload.flatten());

                long elapsed = System.currentTimeMillis() - startedAt;
                logger.info("✅ [PARSE] {}: {} глав за {} мс", slugContext.getFileSlug(), chaptersPayload.totalChapters(), elapsed);
                return result;
            } catch (Exception ex) {
                task.updateStatus("failed", 0, "Ошибка: " + ex.getMessage());
                logger.error("❌ [PARSE] {}: {}", slugContext.getFileSlug(), ex.getMessage(), ex);

                ParseResult result = new ParseResult();
                result.setSuccess(false);
                result.setError(ex.getMessage());
                return result;
            }
        });
    }

    public List<SlideInfo> fetchChapterSlides(String slug, String volume, String chapter) throws IOException {
        return fetchChapterSlidesWithRetry(slug, volume, chapter, false);
    }
    
    private List<SlideInfo> fetchChapterSlidesWithRetry(String slug, String volume, String chapter, boolean isRetry) throws IOException {
        final int maxAttempts = 3;
        int attempt = 0;
        while (true) {
            boolean forceCookieRefresh = attempt > 0;
            if (isRetry) {
                forceCookieRefresh = true;
            }

            if (forceCookieRefresh) {
                Connection.Response refreshed = fetchAndCacheCookies(slug, true);
                if (refreshed == null) {
                    throw new IOException("Failed to refresh cookies for slug: " + slug);
                }
            }

            Connection.Response mangaResponse = cookieCache.computeIfAbsent(slug, key -> fetchAndCacheCookies(key, false));
            if (mangaResponse == null) {
                throw new IOException("Failed to obtain DDoS-Guard cookies for slug: " + slug);
            }

            String url = MangaBuffApiHelper.buildChapterUrl(slug, volume, chapter);
            logger.info("📘 [SLIDES] GET {}{}", url, attempt > 0 || isRetry ? " (RETRY)" : "");

            Connection connection = MangaBuffApiHelper.cloneConnection(url, mangaResponse, getProxyConfig());
            if (slug != null && !slug.isBlank()) {
                connection.referrer(MangaBuffApiHelper.buildMangaUrl(slug));
            }
            String xsrf = mangaResponse.cookie("XSRF-TOKEN");
            if (xsrf != null && !xsrf.isBlank()) {
                String decoded = xsrf;
                try {
                    decoded = URLDecoder.decode(xsrf, StandardCharsets.UTF_8);
                } catch (IllegalArgumentException ignored) {
                    // если не удалось декодировать, используем исходное значение
                }
                connection.header("X-XSRF-TOKEN", decoded);
            }
            connection.header("Sec-Fetch-Site", "same-origin");
            connection.header("Sec-Fetch-Mode", "navigate");
            connection.header("Sec-Fetch-Dest", "document");
            connection.header("Sec-Fetch-User", "?1");
            connection.header("Pragma", "no-cache");
            connection.header("Cache-Control", "no-cache");
            connection.header("Upgrade-Insecure-Requests", "1");
            connection.header("Accept-Encoding", "gzip, deflate, br, zstd");
            connection.ignoreHttpErrors(true);

            Connection.Response response = connection.execute();

            if (!response.cookies().isEmpty() && response.statusCode() < 400) {
                logger.info("🔄 [COOKIES] Server sent {} cookies (status {}), updating cache for {}",
                        response.cookies().size(), response.statusCode(), slug);
                cookieCache.put(slug, response);
            }

            if (response.statusCode() == 401) {
                logUnauthorizedBody(response);
                if (++attempt < maxAttempts) {
                    int retryNumber = attempt + 1;
                    long backoffMs = 600L * retryNumber;
                    logger.warn("🔄 [RETRY] 401 from {}, retry {}/{} for {}/{} (sleep {}ms)",
                            url, retryNumber, maxAttempts, volume, chapter, backoffMs);
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException interrupted) {
                        Thread.currentThread().interrupt();
                    }
                    continue;
                }
                throw new IOException("401 Unauthorized for chapter " + slug + " " + volume + "/" + chapter);
            }

            if (response.statusCode() >= 400) {
                throw new IOException("HTTP " + response.statusCode() + " for " + url);
            }

            Document document = response.parse();
            return parseSlides(document);
        }
    }

    private void logUnauthorizedBody(Connection.Response response) {
        String body = response.body();
        if (body != null && !body.isBlank()) {
            String preview = body.length() > 300 ? body.substring(0, 300) + "…" : body;
            logger.warn("🚫 [401 BODY] {}", preview.replaceAll("\n", " "));
        }
    }

    public String normalizeSlug(String slug) {
        return new SlugContext(slug).getFileSlug();
    }

    private Connection.Response fetchMangaPage(SlugContext context) throws IOException {
        String url = MangaBuffApiHelper.buildMangaUrl(context.getPageSlug());
        logger.info("🌐 [MANGA] GET {}", url);
        return MangaBuffApiHelper.newConnection(url, getProxyConfig()).execute();
    }

    private List<CatalogItem> parseCatalog(Document document) {
        Elements cards = document.select("a.cards__item[data-id]");
        List<CatalogItem> items = new ArrayList<>();
        for (Element card : cards) {
            String slug = MangaBuffApiHelper.extractSlugFromUrl(card.attr("href"));
            if (MangaBuffApiHelper.isBlank(slug)) {
                continue;
            }
            String id = card.attr("data-id");
            CatalogItem item = new CatalogItem();
            item.setSlug(slug);
            item.setSlugUrl(!MangaBuffApiHelper.isBlank(id) ? id + "--" + slug : slug);
            item.setTitle(MangaBuffApiHelper.safeText(card.selectFirst(".cards__name")));

            String info = MangaBuffApiHelper.safeText(card.selectFirst(".cards__info"));
            if (info != null && !info.isBlank()) {
                String[] parts = info.split(",");
                if (parts.length > 0) {
                    item.setType(parts[0].trim());
                }
            }

            items.add(item);
        }
        return items;
    }

    private Optional<CatalogItem> enrichChaptersCount(CatalogItem item, Integer minChapters, Integer maxChapters) {
        try {
            SlugContext context = new SlugContext(item.getSlug());
            Connection.Response response = fetchMangaPage(context);
            Document document = response.parse();
            int total = MangaBuffApiHelper.countChapters(document);
            if (total == 0 && MangaBuffApiHelper.hasAdditionalChapters(document)) {
                Elements additional = loadAllAdditionalChapters(context, document, response);
                total += additional.size();
            }
            item.setChaptersCount(total);
            if (minChapters != null && total < minChapters) {
                return Optional.empty();
            }
            if (maxChapters != null && total > maxChapters) {
                return Optional.empty();
            }
            return Optional.of(item);
        } catch (IOException ex) {
            logger.warn("⚠️  [CATALOG] {}: {}", item.getSlug(), ex.getMessage());
            return Optional.empty();
        }
    }

    private MangaMetadata buildMetadata(SlugContext context, Document document) {
        MangaMetadata metadata = new MangaMetadata();
        metadata.setSlug(context.getFileSlug());

        String title = MangaBuffApiHelper.safeText(document.selectFirst("h1.manga__name"));
        metadata.setLocalizedName(title);
        metadata.setTitle(title);

        // Парсим альтернативные названия (десктоп и мобильная версия)
        Elements otherNames = document.select("h3.manga__other-names span, h3.manga-mobile__name-alt span");
        List<String> allNames = new ArrayList<>();
        for (Element element : otherNames) {
            String value = MangaBuffApiHelper.safeText(element);
            if (!MangaBuffApiHelper.isBlank(value)) {
                allNames.add(value);
            }
        }
        
        if (!allNames.isEmpty()) {
            String englishTitle = allNames.get(0);
            metadata.setEnglishTitle(englishTitle);
            
            List<String> extraNames = new ArrayList<>();
            for (int i = 1; i < allNames.size(); i++) {
                extraNames.add(allNames.get(i));
            }
            metadata.setOtherNames(extraNames);
        } else {
            metadata.setOtherNames(Collections.emptyList());
        }

        Element descriptionMeta = document.selectFirst("meta[name=description]");
        metadata.setSummary(descriptionMeta != null ? descriptionMeta.attr("content") : null);

        // Парсим жанры (href начинается с /genres/)
        metadata.setGenres(extractTexts(document.select(".tags a[href*='/genres/']")));
        // Парсим теги (href содержит ?tags)
        metadata.setTags(extractTexts(document.select(".tags a[href*='?tags']")));

        Element adultTag = document.selectFirst(".tags__item--warning");
        metadata.setAgeLimit(adultTag != null ? 18 : null);

        Map<String, String> info = parseInfoList(document);

        metadata.setType(mapType(info.get("Тип")));
        metadata.setTypeCode(metadata.getType());
        metadata.setStatus(mapStatus(info.get("Статус")));
        metadata.setStatusCode(metadata.getStatus());
        
        // Год парсим из ссылки типа /types/manxva/2024
        Integer year = parseYearFromLink(document);
        if (year == null) {
            year = parseYear(info.get("Год"));
        }
        logger.info("📅 [YEAR] Parsed year for {}: {} (from link: {})", 
                 context.getFileSlug(), year, parseYearFromLink(document));
        metadata.setReleaseYear(year);

        metadata.setAuthors(splitByComma(info.get("Автор")));
        metadata.setArtists(splitByComma(info.get("Художник")));
        metadata.setPublishers(splitByComma(info.get("Издатель")));
        metadata.setTeams(Collections.emptyList());
        metadata.setFranchises(Collections.emptyList());
        metadata.setLicensed(null);

        Element coverMeta = document.selectFirst("meta[property=og:image]");
        String coverUrl = coverMeta != null ? coverMeta.attr("content") : null;
        metadata.setCoverUrl(coverUrl);
        metadata.setCovers(buildCovers(coverUrl));

        metadata.setSite("mangabuff.ru");
        metadata.setContentLanguage("rus");

        return metadata;
    }

    private Map<String, String> parseInfoList(Document document) {
        Map<String, String> info = new LinkedHashMap<>();
        Elements rows = document.select(".info-list__row");
        for (Element row : rows) {
            Element label = row.selectFirst(".info-list__title");
            Element value = row.selectFirst(".info-list__value");
            if (label == null || value == null) {
                continue;
            }
            String key = label.text().trim();
            String val = value.text().trim();
            if (!key.isEmpty() && !val.isEmpty()) {
                info.put(key, val);
            }
        }
        return info;
    }

    private ChaptersPayload buildChapters(SlugContext context,
                                          Document document,
                                          Connection.Response response,
                                          ParseTask task) throws IOException {
        Elements anchors = document.select("a.chapters__item");
        List<ChapterInfo> chapters = parseChapterAnchors(context, anchors);

            if (MangaBuffApiHelper.hasAdditionalChapters(document)) {
                Elements additional = loadAllAdditionalChapters(context, document, response);
                chapters.addAll(parseChapterAnchors(context, additional));
            }

        Collections.reverse(chapters); // упорядочим от старых к новым (для стабильности)

        Map<Integer, List<ChapterInfo>> content = new LinkedHashMap<>();
        content.put(DEFAULT_BRANCH_ID, chapters);
        List<BranchSummary> branches = List.of(new BranchSummary(DEFAULT_BRANCH_ID, chapters.size()));

        int total = chapters.size();
        int processed = 0;
        for (ChapterInfo chapter : chapters) {
            processed++;
            try {
                List<SlideInfo> slides = fetchChapterSlidesByPath(chapter.getSlug());
                chapter.setSlides(slides);
                chapter.setPagesCount(slides.size());
            } catch (IOException ex) {
                chapter.setSlides(Collections.emptyList());
                chapter.setPagesCount(0);
                chapter.setEmptyReason(ex.getMessage());
                logger.warn("⚠️  [SLIDES] {} {}: {}", context.getFileSlug(), chapter.getChapterId(), ex.getMessage());
            }
            int progress = 25 + (int) Math.round(processed * 60.0 / Math.max(total, 1));
            task.updateProgress(Math.min(progress, 90),
                    String.format(Locale.ROOT, "Обработано %d/%d глав", processed, total));
        }

        return new ChaptersPayload(content, branches);
    }

    private Elements loadAllAdditionalChapters(SlugContext context,
                                                    Document document,
                                                    Connection.Response response) throws IOException {
        Elements result = new Elements();
        String mangaId = MangaBuffApiHelper.extractMangaId(document);
        String csrf = MangaBuffApiHelper.extractCsrfToken(document);
        if (MangaBuffApiHelper.isBlank(mangaId) || MangaBuffApiHelper.isBlank(csrf)) {
            logger.warn("⚠️  [CHAPTERS] {}: отсутствует manga_id или csrf", context.getFileSlug());
            return result;
        }

        Document currentDoc = document;
        Connection.Response currentResponse = response;

        while (MangaBuffApiHelper.hasAdditionalChapters(currentDoc)) {
            Connection connection = MangaBuffApiHelper.cloneConnection(
                MangaBuffApiHelper.buildChapterLoadUrl(), 
                currentResponse, 
                getProxyConfig()
            );
            connection.method(Connection.Method.POST);
            connection.ignoreContentType(true);
            connection.header("X-CSRF-TOKEN", csrf);
            connection.header("X-Requested-With", "XMLHttpRequest");
            connection.referrer(MangaBuffApiHelper.buildMangaUrl(context.getPageSlug()));
            connection.data("manga_id", mangaId);

            currentResponse = connection.execute();
            currentDoc = currentResponse.parse();
            Elements anchors = currentDoc.select("a.chapters__item");
            result.addAll(anchors);

            if (anchors.isEmpty()) {
                break;
            }
        }

        return result;
    }

    private List<ChapterInfo> parseChapterAnchors(SlugContext context, Elements anchors) {
        List<ChapterInfo> chapters = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (Element anchor : anchors) {
            String href = anchor.attr("href");
            if (MangaBuffApiHelper.isBlank(href)) {
                continue;
            }
            
            // Убираем BASE_URL если он есть
            String normalizedHref = href;
            if (normalizedHref.startsWith("http://") || normalizedHref.startsWith("https://")) {
                normalizedHref = normalizedHref.replace(MangaBuffApiHelper.BASE_URL + "/", "")
                                               .replace(MangaBuffApiHelper.BASE_URL, "");
            }
            normalizedHref = normalizedHref.startsWith("/") ? normalizedHref.substring(1) : normalizedHref;
            
            String[] parts = normalizedHref.split("/");
            if (parts.length < 4) {
                continue;
            }
            String volumeSegment = parts[parts.length - 2];
            String chapterSegment = parts[parts.length - 1];

            String chapterId = MangaBuffApiHelper.normalizeChapterId(volumeSegment, chapterSegment);
            if (seen.contains(chapterId)) {
                continue;
            }
            seen.add(chapterId);

            ChapterInfo chapter = new ChapterInfo();
            chapter.setChapterId(chapterId);
            chapter.setBranchId(DEFAULT_BRANCH_ID);
            chapter.setSlug(normalizedHref);  // Сохраняем относительный путь

            Double number = MangaBuffApiHelper.parseChapterNumber(anchor.attr("data-chapter"));
            if (number == null) {
                number = MangaBuffApiHelper.parseChapterNumber(chapterSegment.replace('-', '.'));
            }
            chapter.setNumber(number);

            Integer volume = MangaBuffApiHelper.parseVolume(volumeSegment);
            chapter.setVolume(volume);

            String dateIso = MangaBuffApiHelper.parseDateToIso(anchor.attr("data-chapter-date"));
            chapter.setFreePublicationDate(dateIso);

            chapter.setIsPaid(Boolean.FALSE);
            chapter.setModerated(Boolean.TRUE);
            chapter.setWorkers(Collections.emptyList());

            chapters.add(chapter);
        }
        return chapters;
    }

    private List<SlideInfo> fetchChapterSlidesByPath(String relativePath) throws IOException {
        ChapterPath chapterPath = parseChapterPath(relativePath);
        if (chapterPath == null || chapterPath.getVolume() == null || chapterPath.getChapter() == null) {
            throw new IOException("Invalid chapter path: " + relativePath);
        }
        return fetchChapterSlidesWithRetry(chapterPath.getSlug(), chapterPath.getVolume(), chapterPath.getChapter(), false);
    }

    private Connection.Response fetchAndCacheCookies(String slug, boolean forceLog) {
        try {
            String mangaUrl = MangaBuffApiHelper.buildMangaUrl(slug);
            if (forceLog) {
                logger.info("🍪 [COOKIES] Forcing refresh from {}", mangaUrl);
            } else {
                logger.info("🍪 [COOKIES] Fetching DDoS-Guard cookies from {}", mangaUrl);
            }
            Connection.Response response = MangaBuffApiHelper.newConnection(mangaUrl, getProxyConfig()).execute();
            cookieCache.put(slug, response);
            logger.info("🍪 [COOKIES] Cached {} cookies for {}: {}", 
                    response.cookies().size(), slug, response.cookies().keySet());
            return response;
        } catch (IOException e) {
            logger.error("❌ [COOKIES] Failed to fetch cookies for {}: {}", slug, e.getMessage());
            return null;
        }
    }

    private ChapterPath parseChapterPath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            return null;
        }
        String normalized = rawPath.trim();
        try {
            if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
                normalized = new java.net.URI(normalized).getPath();
            }
        } catch (Exception ex) {
            return null;
        }
        if (normalized == null || normalized.isBlank()) {
            return null;
        }
        if (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }

        String[] parts = normalized.split("/");
        if (parts.length < 4 || !"manga".equals(parts[0])) {
            return null;
        }

        String slug = cleanPathSegment(parts[1]);
        String volume = cleanPathSegment(parts[parts.length - 2]);
        String chapter = cleanPathSegment(parts[parts.length - 1]);

        if (slug == null || slug.isBlank() || volume == null || volume.isBlank() || chapter == null || chapter.isBlank()) {
            return null;
        }

        return new ChapterPath(slug, volume, chapter);
    }

    private String cleanPathSegment(String value) {
        if (value == null) {
            return null;
        }
        int queryIndex = value.indexOf('?');
        if (queryIndex >= 0) {
            value = value.substring(0, queryIndex);
        }
        int hashIndex = value.indexOf('#');
        if (hashIndex >= 0) {
            value = value.substring(0, hashIndex);
        }
        return value.trim();
    }

    private List<SlideInfo> parseSlides(Document document) {
        Elements items = document.select(".reader__item img");
        List<SlideInfo> slides = new ArrayList<>();
        int index = 1;
        for (Element image : items) {
            String link = image.hasAttr("src") ? image.absUrl("src") : null;
            if (MangaBuffApiHelper.isBlank(link) && image.hasAttr("data-src")) {
                link = image.absUrl("data-src");
            }
            if (MangaBuffApiHelper.isBlank(link)) {
                continue;
            }
            link = MangaBuffApiHelper.ensureAbsoluteImageUrl(link);
            slides.add(new SlideInfo(index++, link, null, null));
        }
        return slides;
    }

    private Path saveToJson(SlugContext context,
                             MangaMetadata metadata,
                             ChaptersPayload payload) throws IOException {
        Path titlesDir = Paths.get(properties.getOutputPath(), "titles");
        Files.createDirectories(titlesDir);

        Path outputFile = titlesDir.resolve(context.getFileSlug() + ".json");

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("format", "melon-manga");
        root.put("site", metadata.getSite());
        root.put("id", metadata.getId());
        root.put("slug", context.getFileSlug());
        root.put("content_language", Optional.ofNullable(metadata.getContentLanguage()).orElse("rus"));
        root.put("title", metadata.getTitle());
        root.put("localized_name", metadata.getLocalizedName());
        root.put("eng_name", metadata.getEnglishTitle());
        root.put("another_names", Optional.ofNullable(metadata.getOtherNames()).orElse(Collections.emptyList()));
        root.put("covers", buildCoverEntries(metadata));
        root.put("authors", Optional.ofNullable(metadata.getAuthors()).orElse(Collections.emptyList()));
        root.put("artists", Optional.ofNullable(metadata.getArtists()).orElse(Collections.emptyList()));
        root.put("publishers", Optional.ofNullable(metadata.getPublishers()).orElse(Collections.emptyList()));
        root.put("teams", Optional.ofNullable(metadata.getTeams()).orElse(Collections.emptyList()));
        root.put("publication_year", metadata.getReleaseYear());
        logger.info("📄 [JSON] Writing publication_year: {} for {}", metadata.getReleaseYear(), context.getFileSlug());
        root.put("description", metadata.getSummary());
        root.put("age_limit", metadata.getAgeLimit());
        root.put("type", metadata.getTypeCode());
        root.put("status", metadata.getStatusCode());
        root.put("is_licensed", metadata.getLicensed());
        root.put("genres", Optional.ofNullable(metadata.getGenres()).orElse(Collections.emptyList()));
        root.put("tags", Optional.ofNullable(metadata.getTags()).orElse(Collections.emptyList()));
        root.put("franchises", Optional.ofNullable(metadata.getFranchises()).orElse(Collections.emptyList()));
        root.put("persons", Collections.emptyList());
        root.put("branches", payload.getBranches().stream()
                .map(branch -> Map.of(
                        "id", branch.getId(),
                        "chapters_count", branch.getChaptersCount()
                ))
                .collect(Collectors.toList()));

        Map<String, Object> contentJson = new LinkedHashMap<>();
        List<Map<String, Object>> flattened = new ArrayList<>();
        for (Map.Entry<Integer, List<ChapterInfo>> entry : payload.getContent().entrySet()) {
            List<Map<String, Object>> chapters = new ArrayList<>();
            for (ChapterInfo chapter : entry.getValue()) {
                Map<String, Object> json = buildChapterJson(chapter);
                chapters.add(json);
                flattened.add(json);
            }
            contentJson.put(String.valueOf(entry.getKey()), chapters);
        }

        root.put("content", contentJson);
        root.put("chapters", flattened);
        root.put("chapters_count", flattened.size());

        objectMapper.writerWithDefaultPrettyPrinter().writeValue(outputFile.toFile(), root);
        return outputFile;
    }

    private Map<String, Object> buildChapterJson(ChapterInfo chapter) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", chapter.getChapterId());
        map.put("slug", chapter.getSlug());
        map.put("volume", formatVolume(chapter.getVolume()));
        map.put("number", formatNumber(chapter.getNumber()));
        map.put("name", chapter.getTitle());
        map.put("is_paid", Boolean.TRUE.equals(chapter.getIsPaid()));
        map.put("branch_id", chapter.getBranchId());
        map.put("pages_count", chapter.getPagesCount());
        map.put("free_publication_date", chapter.getFreePublicationDate());
        map.put("empty_reason", chapter.getEmptyReason());
        map.put("folder_name", chapter.getFolderName());
        map.put("workers", Optional.ofNullable(chapter.getWorkers()).orElse(Collections.emptyList()));
        map.put("moderated", chapter.getModerated() != null ? chapter.getModerated() : Boolean.TRUE);
    map.put("slides", Optional.ofNullable(chapter.getSlides()).orElse(Collections.emptyList()).stream()
                .map(slide -> {
                    Map<String, Object> slideMap = new LinkedHashMap<>();
                    slideMap.put("index", slide.getIndex());
                    slideMap.put("link", slide.getLink());
                    slideMap.put("width", slide.getWidth());
                    slideMap.put("height", slide.getHeight());
                    return slideMap;
                })
                .collect(Collectors.toList()));
        return map;
    }

    private List<Map<String, Object>> buildCoverEntries(MangaMetadata metadata) {
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
                    map.put("width", cover.getWidth());
                    map.put("height", cover.getHeight());
                    return map;
                })
                .collect(Collectors.toList());
    }

    private List<MangaCover> buildCovers(String coverUrl) {
        if (MangaBuffApiHelper.isBlank(coverUrl)) {
            return Collections.emptyList();
        }
        String filename = coverUrl.substring(coverUrl.lastIndexOf('/') + 1);
        return List.of(new MangaCover(coverUrl, filename, null, null));
    }

    private List<String> extractTexts(Elements elements) {
        if (elements == null || elements.isEmpty()) {
            return Collections.emptyList();
        }
        List<String> values = new ArrayList<>();
        for (Element element : elements) {
            String text = element.text().trim();
            if (!text.isEmpty()) {
                values.add(text);
            }
        }
        return values;
    }

    private List<String> splitByComma(String value) {
        if (value == null || value.isBlank()) {
            return Collections.emptyList();
        }
        String[] parts = value.split(",");
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private Integer parseYear(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Integer parseYearFromLink(Document document) {
        // Ищем ссылку вида /types/manxva/2024
        Elements links = document.select(".manga__middle-link[href*='/types/']");
        for (Element link : links) {
            String href = link.attr("href");
            if (href != null && href.contains("/types/")) {
                String[] parts = href.split("/");
                if (parts.length > 0) {
                    String lastPart = parts[parts.length - 1];
                    if (lastPart.matches("\\d{4}")) {
                        try {
                            return Integer.parseInt(lastPart);
                        } catch (NumberFormatException ex) {
                            // ignore
                        }
                    }
                }
            }
        }
        return null;
    }

    private String mapType(String value) {
        if (value == null) {
            return null;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "манга" -> "manga";
            case "манхва" -> "manhwa";
            case "маньхуа" -> "manhua";
            case "комикс" -> "western_comic";
            case "роман" -> "novel";
            default -> null;
        };
    }

    private String mapStatus(String value) {
        if (value == null) {
            return null;
        }
        return switch (value.trim().toLowerCase(Locale.ROOT)) {
            case "продолжается", "ongoing" -> "ongoing";
            case "завершено", "completed" -> "completed";
            case "заморожено", "приостановлено" -> "dropped";
            case "анонс", "анонсировано" -> "announced";
            default -> null;
        };
    }

    private String formatNumber(Double value) {
        if (value == null) {
            return null;
        }
        BigDecimal decimal = BigDecimal.valueOf(value).stripTrailingZeros();
        return decimal.toPlainString();
    }

    private String formatVolume(Integer volume) {
        if (volume == null) {
            return null;
        }
        return String.format(Locale.ROOT, "%d", volume);
    }

    /**
     * Контекст slug для совместимости со старыми id--slug форматами.
     */
    private static final class SlugContext {
        private final String rawSlug;
        private final String pageSlug;
        private final String fileSlug;

        SlugContext(String rawSlug) {
            String value = rawSlug == null ? "" : rawSlug.trim();
            String slugPart = value;
            String effectiveRaw = value;
            
            if (value.contains("--")) {
                String[] parts = value.split("--", 2);
                if (parts.length == 2 && parts[0].chars().allMatch(Character::isDigit)) {
                    slugPart = parts[1];
                } else {
                    this.rawSlug = value;
                    this.pageSlug = value;
                    this.fileSlug = value.replace('/', '-');
                    return;
                }
            }
            
            this.rawSlug = effectiveRaw;
            this.pageSlug = slugPart;
            this.fileSlug = slugPart.replace('/', '-');
        }

        String getFileSlug() {
            return fileSlug;
        }

        String getPageSlug() {
            return pageSlug;
        }
    }

    private static final class ChapterPath {
        private final String slug;
        private final String volume;
        private final String chapter;

        ChapterPath(String slug, String volume, String chapter) {
            this.slug = slug;
            this.volume = volume;
            this.chapter = chapter;
        }

        String getSlug() {
            return slug;
        }

        String getVolume() {
            return volume;
        }

        String getChapter() {
            return chapter;
        }
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
}
