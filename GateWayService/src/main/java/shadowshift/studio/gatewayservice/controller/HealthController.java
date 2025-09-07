package shadowshift.studio.gatewayservice.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;

/**
 * Контроллер для проверки состояния здоровья Gateway Service.
 * Предоставляет эндпоинты для мониторинга доступности сервиса
 * и тестирования различных аспектов его работы.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    /**
     * Проверяет состояние здоровья Gateway Service.
     * Возвращает подтверждение работоспособности сервиса.
     *
     * @return ResponseEntity с сообщением о состоянии здоровья
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Gateway is healthy!");
    }

    /**
     * Тестирует работу CORS конфигурации.
     * Используется для проверки корректности настроек Cross-Origin Resource Sharing.
     *
     * @return ResponseEntity с подтверждением работы CORS
     */
    @GetMapping("/cors-test")
    public ResponseEntity<String> corsTest() {
        return ResponseEntity.ok("CORS is working!");
    }
}
