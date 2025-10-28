package shadowshift.studio.parserservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
@ConfigurationProperties(prefix = "parser")
public class ParserProperties {
    
    private static final Logger log = LoggerFactory.getLogger(ParserProperties.class);

    /**
     * Путь для output (используется для property binding из application.yml).
     */
    private String outputPath = "/app/output";
    
    /**
     * Путь для temp (используется для property binding из application.yml).
     */
    private String tempPath = "/app/temp";

    /**
     * Каталог логов.
     */
    private Path logsPath = Paths.get("/app/output/logs");

    /**
     * Базовый путь до legacy MelonService (python) для вызова CLI.
     */
    private Path legacyRoot = Paths.get("/app");

    /**
     * Команда python для запуска legacy-скриптов.
     */
    private String pythonCommand = "python3";

    /**
     * Таймаут выполнения команд парсинга/билда.
     */
    private Duration commandTimeout = Duration.ofMinutes(30);

    /**
     * URL MangaService для отправки прогресса.
     */
    private String mangaServiceUrl = "http://manga-service:8081";

    /**
     * Настройки MangaLib API
     */
    private MangaLibConfig mangalib = new MangaLibConfig();

    /**
     * Настройки MangaBuff авторизации для 18+ контента
     */
    private MangaBuffAuthConfig mangabuffAuth = new MangaBuffAuthConfig();

    public static class MangaBuffAuthConfig {
        private String login = "artempronko241@gmail.com";
        private String password = "Artem11112003!";

        public String getLogin() {
            return login;
        }

        public void setLogin(String login) {
            this.login = login;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public boolean isEnabled() {
            return !login.isBlank() && !password.isBlank();
        }
    }

    public static class MangaLibConfig {
        private String token = "";
        private String siteId = "1";
        private String server = "main";
        private String siteDomain = "mangalib.me";
        private String referer = "https://mangalib.me";
        private String apiBase = "https://api.cdnlibs.org/api";
        private List<String> alternateApiBases = new ArrayList<>();
        private boolean useProxyForApi = false; // 🔥 По умолчанию false для обхода блокировки RU прокси

        public String getToken() {
            return token;
        }

        public void setToken(String token) {
            this.token = token;
        }

        public String getSiteId() {
            return siteId;
        }

        public void setSiteId(String siteId) {
            this.siteId = siteId;
        }

        public String getServer() {
            return server;
        }

        public void setServer(String server) {
            if (StringUtils.hasText(server)) {
                this.server = server;
            }
        }

        public String getSiteDomain() {
            return siteDomain;
        }

        public void setSiteDomain(String siteDomain) {
            if (StringUtils.hasText(siteDomain)) {
                this.siteDomain = siteDomain;
            }
        }

        public String getReferer() {
            return referer;
        }

        public void setReferer(String referer) {
            if (StringUtils.hasText(referer)) {
                this.referer = referer;
            }
        }

        public String getApiBase() {
            return apiBase;
        }

        public void setApiBase(String apiBase) {
            if (StringUtils.hasText(apiBase)) {
                this.apiBase = normalizeApiBase(apiBase);
            }
        }

        public List<String> getAlternateApiBases() {
            return new ArrayList<>(alternateApiBases);
        }

        public void setAlternateApiBases(List<String> alternateApiBases) {
            if (alternateApiBases == null) {
                this.alternateApiBases = new ArrayList<>();
                return;
            }
            this.alternateApiBases = alternateApiBases.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(this::normalizeApiBase)
                .collect(Collectors.toCollection(ArrayList::new));
        }

        public List<String> resolveApiBases() {
            List<String> bases = new ArrayList<>();
            bases.add(apiBase);
            bases.addAll(alternateApiBases);
            return bases;
        }

        private String normalizeApiBase(String base) {
            String normalized = base.trim();
            if (normalized.endsWith("/")) {
                normalized = normalized.substring(0, normalized.length() - 1);
            }
            return normalized;
        }

        public boolean isUseProxyForApi() {
            return useProxyForApi;
        }

        public void setUseProxyForApi(boolean useProxyForApi) {
            this.useProxyForApi = useProxyForApi;
        }
    }

    /**
     * Стратегия прокси (пока не используется, но оставляем для совместимости).
     */
    private boolean useProxyPool = true;

    /**
     * Разрешить отправку прогресса в MangaService.
     */
    private boolean progressWebhookEnabled = true;

    /**
     * Максимальное количество одновременно выполняемых задач.
     */
    private int maxConcurrentTasks = 2;
    
    /**
     * Максимальное количество параллельных загрузок изображений.
     */
    private int maxParallelDownloads = 80; // 10 быстрых прокси × 8 потоков на каждую ноду
    
    /**
    * ⚡ КРИТИЧНО: Максимальное количество глав, загружаемых параллельно.
    * При значении 1 - главы качаются последовательно (медленно).
    * При значении 2 сохраняем запас до rate-limit при 10 быстрых прокси.
    */
    private int maxParallelChapters = 2;
    
    /**
     * Таймаут загрузки изображения в секундах.
     */
    private int imageTimeoutSeconds = 30;

    public Path getStorageBasePath() {
        return Paths.get(outputPath);
    }
    
    /**
     * Алиас для совместимости с кодом, использующим getOutputPath().
     */
    public String getOutputPath() {
        log.debug("📂 getOutputPath() возвращает: {}", outputPath);
        return outputPath;
    }
    
    /**
     * Setter для outputPath (для Spring Boot property binding).
     * Принимает строку и конвертирует в Path.
     */
    public void setOutputPath(String outputPath) {
        log.info("🔧 setOutputPath вызван с значением: '{}'", outputPath);
        if (StringUtils.hasText(outputPath)) {
            this.outputPath = outputPath;
            log.info("✅ outputPath установлен в: {}", this.outputPath);
        } else {
            log.warn("⚠️ outputPath пустой, используется дефолт: {}", this.outputPath);
        }
    }

    public Path getTempPath() {
        return Paths.get(tempPath);
    }

    /**
     * Setter для tempPath (для Spring Boot property binding).
     * Принимает и строку, и Path.
     */
    public void setTempPath(String tempPath) {
        log.info("🔧 setTempPath вызван с значением: '{}'", tempPath);
        if (StringUtils.hasText(tempPath)) {
            this.tempPath = tempPath;
            log.info("✅ tempPath установлен в: {}", this.tempPath);
        }
    }

    public Path getLogsPath() {
        return logsPath;
    }

    public void setLogsPath(Path logsPath) {
        if (logsPath != null) {
            this.logsPath = logsPath;
        }
    }

    public Path getLegacyRoot() {
        return legacyRoot;
    }

    public void setLegacyRoot(Path legacyRoot) {
        if (legacyRoot != null) {
            this.legacyRoot = legacyRoot;
        }
    }

    public String getPythonCommand() {
        return pythonCommand;
    }

    public void setPythonCommand(String pythonCommand) {
        if (StringUtils.hasText(pythonCommand)) {
            this.pythonCommand = pythonCommand;
        }
    }

    public Duration getCommandTimeout() {
        return commandTimeout;
    }

    public void setCommandTimeout(Duration commandTimeout) {
        if (commandTimeout != null) {
            this.commandTimeout = commandTimeout;
        }
    }

    public String getMangaServiceUrl() {
        return mangaServiceUrl;
    }

    public void setMangaServiceUrl(String mangaServiceUrl) {
        if (StringUtils.hasText(mangaServiceUrl)) {
            this.mangaServiceUrl = mangaServiceUrl;
        }
    }

    public boolean isUseProxyPool() {
        return useProxyPool;
    }

    public void setUseProxyPool(boolean useProxyPool) {
        this.useProxyPool = useProxyPool;
    }

    public boolean isProgressWebhookEnabled() {
        return progressWebhookEnabled;
    }

    public void setProgressWebhookEnabled(boolean progressWebhookEnabled) {
        this.progressWebhookEnabled = progressWebhookEnabled;
    }

    public int getMaxConcurrentTasks() {
        return maxConcurrentTasks;
    }

    public void setMaxConcurrentTasks(int maxConcurrentTasks) {
        if (maxConcurrentTasks > 0) {
            this.maxConcurrentTasks = maxConcurrentTasks;
        }
    }
    
    public int getMaxParallelDownloads() {
        return maxParallelDownloads;
    }
    
    public void setMaxParallelDownloads(int maxParallelDownloads) {
        if (maxParallelDownloads > 0) {
            this.maxParallelDownloads = maxParallelDownloads;
            log.info("🔧 maxParallelDownloads установлен в: {}", maxParallelDownloads);
        }
    }
    
    public int getMaxParallelChapters() {
        return maxParallelChapters;
    }
    
    public void setMaxParallelChapters(int maxParallelChapters) {
        if (maxParallelChapters > 0) {
            this.maxParallelChapters = maxParallelChapters;
            log.info("🔧 maxParallelChapters установлен в: {}", maxParallelChapters);
        }
    }
    
    public int getImageTimeoutSeconds() {
        return imageTimeoutSeconds;
    }
    
    public void setImageTimeoutSeconds(int imageTimeoutSeconds) {
        if (imageTimeoutSeconds > 0) {
            this.imageTimeoutSeconds = imageTimeoutSeconds;
        }
    }

    public MangaLibConfig getMangalib() {
        return mangalib;
    }

    public void setMangalib(MangaLibConfig mangalib) {
        if (mangalib != null) {
            this.mangalib = mangalib;
        }
    }

    public MangaBuffAuthConfig getMangabuffAuth() {
        return mangabuffAuth;
    }

    public void setMangabuffAuth(MangaBuffAuthConfig mangabuffAuth) {
        if (mangabuffAuth != null) {
            this.mangabuffAuth = mangabuffAuth;
        }
    }
}