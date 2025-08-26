package shadowshift.studio.gatewayservice.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Контроллер для мониторинга состояния API Gateway и подключенных сервисов.
 *
 * Предоставляет endpoints для проверки здоровья Gateway и всех
 * маршрутизируемых микросервисов.
 *
 * @author AniWay Development Team
 * @version 1.0.0
 */
@RestController
@RequestMapping("/api/gateway")
public class GatewayController {

    private static final Logger logger = LoggerFactory.getLogger(GatewayController.class);

    private final RouteLocator routeLocator;
    private final WebClient.Builder webClientBuilder;

    @Autowired
    public GatewayController(RouteLocator routeLocator, WebClient.Builder webClientBuilder) {
        this.routeLocator = routeLocator;
        this.webClientBuilder = webClientBuilder;
    }

    /**
     * Проверка здоровья Gateway.
     */
    @GetMapping("/health")
    public Mono<ResponseEntity<Map<String, Object>>> health() {
        logger.debug("Health check requested for Gateway");

        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "gateway-service");
        health.put("timestamp", System.currentTimeMillis());
        health.put("message", "API Gateway работает корректно");

        return Mono.just(ResponseEntity.ok(health));
    }

    /**
     * Получение списка всех активных маршрутов.
     */
    @GetMapping("/routes")
    public Mono<ResponseEntity<List<Map<String, String>>>> getRoutes() {
        logger.debug("Routes information requested");

        return routeLocator.getRoutes()
                .map(route -> {
                    Map<String, String> routeInfo = new HashMap<>();
                    routeInfo.put("id", route.getId());
                    routeInfo.put("uri", route.getUri().toString());
                    routeInfo.put("predicates", route.getPredicate().toString());
                    return routeInfo;
                })
                .collectList()
                .map(ResponseEntity::ok);
    }

    /**
     * Комплексная проверка здоровья всех подключенных сервисов.
     */
    @GetMapping("/services/health")
    public Mono<ResponseEntity<Map<String, Object>>> servicesHealth() {
        logger.debug("Services health check requested");

        WebClient webClient = webClientBuilder.build();
        Map<String, Object> servicesHealth = new HashMap<>();

        // Проверяем MangaService через основной API endpoint (работает)
        Mono<String> mangaHealth = webClient.get()
                .uri("http://localhost:8081/api/manga")
                .retrieve()
                .bodyToMono(String.class)
                .map(response -> "UP")
                .onErrorReturn("DOWN");

        // Проверяем ChapterService через простое подключение к порту
        // Используем endpoint с тестовыми данными и проверяем только статус ответа
        Mono<String> chapterHealth = webClient.get()
                .uri("http://localhost:8082/api/chapters/manga/1")
                .retrieve()
                .toBodilessEntity()
                .map(response -> "UP")
                .onErrorReturn("DOWN");

        // Проверяем ImageStorageService через простое подключение
        // Используем endpoint который может вернуть пустой список, но это означает что сервис работает
        Mono<String> imageHealth = webClient.get()
                .uri("http://localhost:8083/api/images/chapter/1")
                .retrieve()
                .toBodilessEntity()
                .map(response -> "UP")
                .onErrorReturn("DOWN");

        return Mono.zip(mangaHealth, chapterHealth, imageHealth)
                .map(tuple -> {
                    servicesHealth.put("gateway", "UP");
                    servicesHealth.put("manga-service", tuple.getT1());
                    servicesHealth.put("chapter-service", tuple.getT2());
                    servicesHealth.put("image-storage-service", tuple.getT3());
                    servicesHealth.put("timestamp", System.currentTimeMillis());

                    // Определяем общий статус
                    boolean allUp = "UP".equals(tuple.getT1()) &&
                                   "UP".equals(tuple.getT2()) &&
                                   "UP".equals(tuple.getT3());
                    servicesHealth.put("overall-status", allUp ? "UP" : "DEGRADED");

                    logger.info("Services health check completed - MangaService: {}, ChapterService: {}, ImageService: {}",
                               tuple.getT1(), tuple.getT2(), tuple.getT3());

                    return ResponseEntity.ok(servicesHealth);
                });
    }

    /**
     * Информация о Gateway версии и конфигурации.
     */
    @GetMapping("/info")
    public Mono<ResponseEntity<Map<String, Object>>> info() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "AniWay API Gateway");
        info.put("version", "1.0.0");
        info.put("description", "Единая точка входа для всех AniWay микросервисов");
        info.put("author", "AniWay Development Team");
        info.put("routes-count", routeLocator.getRoutes().count().block());

        Map<String, String> services = new HashMap<>();
        services.put("manga-service", "http://localhost:8081");
        services.put("chapter-service", "http://localhost:8082");
        services.put("image-storage-service", "http://localhost:8083");
        info.put("backend-services", services);

        return Mono.just(ResponseEntity.ok(info));
    }
}
