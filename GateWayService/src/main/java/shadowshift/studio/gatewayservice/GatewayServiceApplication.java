package shadowshift.studio.gatewayservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Главный класс приложения API Gateway для AniWay.
 *
 * API Gateway служит единой точкой входа для всех клиентских запросов
 * и маршрутизирует их к соответствующим микросервисам.
 *
 * Функции Gateway:
 * - Маршрутизация запросов к MangaService, ChapterService, ImageStorageService
 * - Настройка CORS политики для фронтенда
 * - Централизованная обработка ошибок
 * - Мониторинг и логирование всех запросов
 *
 * @author AniWay Development Team
 * @version 1.0.0
 * @since 1.0.0
 */
@SpringBootApplication
public class GatewayServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayServiceApplication.class, args);
    }
}
