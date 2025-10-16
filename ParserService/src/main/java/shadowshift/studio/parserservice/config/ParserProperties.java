package shadowshift.studio.parserservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

@ConfigurationProperties(prefix = "parser")
public class ParserProperties {

    /**
     * Корневая директория хранения артефактов (Output/...).
     */
    private Path storageBasePath = Paths.get("/melon/Output");

    /**
     * Каталог временных файлов.
     */
    private Path tempPath = Paths.get("/melon/Temp");

    /**
     * Каталог логов.
     */
    private Path logsPath = Paths.get("/melon/Logs");

    /**
     * Базовый путь до legacy MelonService (python) для вызова CLI.
     */
    private Path legacyRoot = Paths.get("/melon");

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

    public Path getStorageBasePath() {
        return storageBasePath;
    }

    public void setStorageBasePath(Path storageBasePath) {
        if (storageBasePath != null) {
            this.storageBasePath = storageBasePath;
        }
    }

    public Path getTempPath() {
        return tempPath;
    }

    public void setTempPath(Path tempPath) {
        if (tempPath != null) {
            this.tempPath = tempPath;
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
}