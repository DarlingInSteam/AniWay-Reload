package shadowshift.studio.parserservice.service;

import org.jsoup.Connection;
import org.jsoup.nodes.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.service.ProxyManagerService;
import shadowshift.studio.parserservice.util.MangaBuffApiHelper;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Сервис для авторизации на MangaBuff для доступа к 18+ контенту.
 */
@Service
public class MangaBuffAuthService {

    private static final Logger logger = LoggerFactory.getLogger(MangaBuffAuthService.class);

    private final ParserProperties properties;
    private final ProxyManagerService proxyManager;

    // Кеш авторизованных cookies
    private volatile Map<String, String> authCookies = null;

    public MangaBuffAuthService(ParserProperties properties, ProxyManagerService proxyManager) {
        this.properties = properties;
        this.proxyManager = proxyManager;
    }

    /**
     * Получает авторизованные cookies для MangaBuff.
     * Если авторизация не настроена, возвращает null.
     */
    public Map<String, String> getAuthCookies() {
        if (!properties.getMangabuffAuth().isEnabled()) {
            logger.debug("🔐 MangaBuff auth not configured, skipping");
            return null;
        }

        if (authCookies != null) {
            return authCookies;
        }

        synchronized (this) {
            if (authCookies != null) {
                return authCookies;
            }

            try {
                authCookies = authenticate();
                logger.info("🔐 MangaBuff auth successful, cached {} cookies", authCookies.size());
            } catch (Exception e) {
                logger.error("❌ MangaBuff auth failed: {}", e.getMessage(), e);
                authCookies = null;
            }

            return authCookies;
        }
    }

    private Map<String, String> authenticate() throws IOException {
        String loginUrl = MangaBuffApiHelper.BASE_URL + "/login";
        logger.info("🔐 [AUTH] GET {}", loginUrl);

        // Получаем страницу логина для CSRF токена
        Connection.Response loginPageResponse = MangaBuffApiHelper.newConnection(loginUrl, getProxyConfig())
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Cache-Control", "no-cache")
                .header("Pragma", "no-cache")
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "none")
                .header("Sec-Fetch-User", "?1")
                .header("Upgrade-Insecure-Requests", "1")
                .execute();

        Document loginPage = loginPageResponse.parse();

        // Извлекаем CSRF токен
        String csrfToken = MangaBuffApiHelper.extractCsrfToken(loginPage);
        if (csrfToken == null || csrfToken.isBlank()) {
            throw new IOException("Failed to extract CSRF token from login page");
        }

        logger.info("🔐 [AUTH] Extracted CSRF token: {}", csrfToken.substring(0, Math.min(10, csrfToken.length())) + "...");

        // Отправляем POST запрос на авторизацию
        String login = properties.getMangabuffAuth().getLogin();
        String password = properties.getMangabuffAuth().getPassword();

        Connection loginRequest = MangaBuffApiHelper.newConnection(loginUrl, getProxyConfig())
                .method(Connection.Method.POST)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Cache-Control", "no-cache")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Origin", MangaBuffApiHelper.BASE_URL)
                .header("Pragma", "no-cache")
                .header("Referer", loginUrl)
                .header("Sec-Fetch-Dest", "document")
                .header("Sec-Fetch-Mode", "navigate")
                .header("Sec-Fetch-Site", "same-origin")
                .header("Sec-Fetch-User", "?1")
                .header("Upgrade-Insecure-Requests", "1")
                .header("X-CSRF-TOKEN", csrfToken)
                .header("X-Requested-With", "XMLHttpRequest")
                .referrer(loginUrl)
                .data("email", login)
                .data("password", password)
                .data("_token", csrfToken)
                .ignoreContentType(true)
                .followRedirects(false); // Важно не следовать редиректам для проверки статуса

        // Передаем cookies от GET запроса
        for (Map.Entry<String, String> cookie : loginPageResponse.cookies().entrySet()) {
            loginRequest.cookie(cookie.getKey(), cookie.getValue());
        }

        Connection.Response authResponse = loginRequest.execute();

        if (authResponse.statusCode() != 302 && authResponse.statusCode() != 200) {
            throw new IOException("Auth failed with status: " + authResponse.statusCode() + ", body: " + authResponse.body());
        }

        // Проверяем, что авторизация успешна (редирект на главную или профиль)
        String location = authResponse.header("Location");
        if (location != null && (location.contains("/login") || location.contains("error"))) {
            throw new IOException("Auth failed, redirected to: " + location);
        }

        Map<String, String> cookies = authResponse.cookies();
        if (cookies.isEmpty()) {
            throw new IOException("No cookies received after auth");
        }

        logger.info("🔐 [AUTH] Auth successful, received {} cookies", cookies.size());
        return cookies;
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
}