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
 * ВРЕМЕННО ОТКЛЮЧЕН для исправления конфликта со Spring Cloud Gateway.
 * Spring Cloud Gateway работает на WebFlux, а @RestController на servlet стеке.
 * Они не могут сосуществовать в одном приложении.
 *
 * @author AniWay Development Team
 * @version 1.0.0
 */
// @RestController  // ВРЕМЕННО ОТКЛЮЧЕН
// @RequestMapping("/api/gateway")  // ВРЕМЕННО ОТКЛЮЧЕН
public class GatewayController {

    private static final Logger logger = LoggerFactory.getLogger(GatewayController.class);

    private final RouteLocator routeLocator;
    private final WebClient.Builder webClientBuilder;

    @Autowired
    public GatewayController(RouteLocator routeLocator, WebClient.Builder webClientBuilder) {
        this.routeLocator = routeLocator;
        this.webClientBuilder = webClientBuilder;
    }

    // Все методы временно отключены до исправления архитектуры
}
