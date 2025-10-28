package shadowshift.studio.parserservice.util;

import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * Вспомогательный класс для работы с MangaBuff.
 */
public final class MangaBuffApiHelper {

    public static final String BASE_URL = "https://mangabuff.ru";
    public static final String IMAGE_CDN = "https://c3.mangabuff.ru";
    private static final DateTimeFormatter SOURCE_DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.ROOT);

    private MangaBuffApiHelper() {
    }

    public static Connection newConnection(String url) {
        return newConnection(url, null);
    }

    public static Connection newConnection(String url, ProxyConfig proxyConfig) {
        Connection connection = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                .header("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Cache-Control", "no-cache")
                .referrer(BASE_URL) // Добавляем Referer для всех запросов
                .timeout(20_000)
                .followRedirects(true);
        
        if (proxyConfig != null && proxyConfig.host != null && !proxyConfig.host.isBlank()) {
            Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyConfig.host, proxyConfig.port));
            connection.proxy(proxy);
            
            if (proxyConfig.username != null && proxyConfig.password != null) {
                connection.header("Proxy-Authorization", 
                    "Basic " + java.util.Base64.getEncoder().encodeToString(
                        (proxyConfig.username + ":" + proxyConfig.password).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            }
        }
        
        return connection;
    }

    public static class ProxyConfig {
        public final String host;
        public final int port;
        public final String username;
        public final String password;

        public ProxyConfig(String host, int port, String username, String password) {
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
        }
    }

    public static String buildCatalogUrl(int page) {
        int safePage = Math.max(page, 1);
        return BASE_URL + "/manga?page=" + safePage;
    }

    public static String buildMangaUrl(String slug) {
        return BASE_URL + "/manga/" + slug;
    }

    public static String buildChapterUrl(String slug, String volume, String chapter) {
        String normalizedVolume = volume == null || volume.isBlank() ? "1" : volume.trim();
        String normalizedChapter = chapter == null ? "" : chapter.trim();
        return BASE_URL + "/manga/" + slug + "/" + normalizedVolume + "/" + normalizedChapter;
    }

    public static String buildChapterLoadUrl() {
        return BASE_URL + "/chapters/load";
    }

    public static String extractSlugFromUrl(String href) {
        if (href == null || href.isBlank()) {
            return null;
        }
        try {
            URI uri = URI.create(href.startsWith("/") ? BASE_URL + href : href);
            String path = uri.getPath();
            if (path == null) {
                return null;
            }
            String[] segments = path.split("/");
            for (int i = 0; i < segments.length; i++) {
                if ("manga".equals(segments[i]) && i + 1 < segments.length) {
                    return segments[i + 1];
                }
            }
            return segments.length > 0 ? segments[segments.length - 1] : null;
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public static String extractCsrfToken(Document doc) {
        if (doc == null) {
            return null;
        }
        Element meta = doc.selectFirst("meta[name=csrf-token]");
        return meta != null ? meta.attr("content") : null;
    }

    public static String extractMangaId(Document doc) {
        if (doc == null) {
            return null;
        }
        Element root = doc.selectFirst(".manga[data-id]");
        if (root != null) {
            return root.attr("data-id");
        }
        Element button = doc.selectFirst("button[data-id]");
        if (button != null) {
            return button.attr("data-id");
        }
        Element info = doc.selectFirst("[data-manga-id]");
        return info != null ? info.attr("data-manga-id") : null;
    }

    public static Integer parseViews(String raw) {
        if (raw == null) {
            return null;
        }
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return null;
        }
        try {
            long value = Long.parseLong(digits);
            return value > Integer.MAX_VALUE ? Integer.MAX_VALUE : (int) value;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static String parseDateToIso(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            LocalDate date = LocalDate.parse(raw.trim(), SOURCE_DATE);
            return date.atStartOfDay().toString();
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    public static String ensureAbsoluteImageUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        return IMAGE_CDN + "/" + trimmed;
    }

    public static boolean hasAdditionalChapters(Document doc) {
        if (doc == null) {
            return false;
        }
        return doc.selectFirst(".load-chapters-trigger") != null;
    }

    public static int countChapters(Document doc) {
        if (doc == null) {
            return 0;
        }
        return doc.select("a.chapters__item").size();
    }

    public static Connection cloneConnection(String url, Connection.Response baseResponse) {
        return cloneConnection(url, baseResponse, null);
    }

    public static Connection cloneConnection(String url, Connection.Response baseResponse, ProxyConfig proxyConfig) {
        Connection connection = newConnection(url, proxyConfig);
        if (baseResponse != null) {
            Map<String, String> cookies = baseResponse.cookies();
            if (cookies != null && !cookies.isEmpty()) {
                connection.cookies(cookies);
            }
            Map<String, String> headers = baseResponse.headers();
            if (headers != null) {
                headers.forEach((key, value) -> {
                    if (key != null && value != null && isSafeHeader(key)) {
                        connection.header(key, value);
                    }
                });
            }
        }
        return connection;
    }

    private static boolean isSafeHeader(String key) {
        if (key == null) {
            return false;
        }
        String normalized = key.toLowerCase(Locale.ROOT);
        return !(normalized.equals("content-length") || normalized.equals("content-type"));
    }

    public static Double parseChapterNumber(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim().replace(',', '.');
        try {
            return Double.parseDouble(normalized);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static Integer parseVolume(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim();
        if (!normalized.chars().allMatch(Character::isDigit)) {
            return null;
        }
        try {
            return Integer.parseInt(normalized);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    public static String safeText(Element element) {
        if (element == null) {
            return null;
        }
        String text = element.text();
        return text != null ? text.trim() : null;
    }

    public static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    public static String coalesce(String first, String second) {
        return !isBlank(first) ? first : second;
    }

    public static String nonEmpty(String value) {
        return isBlank(value) ? null : value.trim();
    }

    public static <T> T firstNonNull(T first, T second) {
        return first != null ? first : Objects.requireNonNullElse(second, null);
    }

    public static String normalizeChapterId(String volume, String chapter) {
        String vol = volume == null || volume.isBlank() ? "1" : volume.trim();
        String ch = chapter == null ? "" : chapter.trim();
        return vol + "_" + ch;
    }
}
