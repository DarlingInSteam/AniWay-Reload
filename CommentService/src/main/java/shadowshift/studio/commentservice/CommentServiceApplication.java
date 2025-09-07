package shadowshift.studio.commentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Основной класс приложения CommentService.
 * Запускает Spring Boot приложение для сервиса комментариев,
 * которое предоставляет REST API для управления комментариями,
 * реакциями и взаимодействием пользователей с контентом.
 *
 * @author ShadowShiftStudio
 */
@SpringBootApplication
public class CommentServiceApplication {

    /**
     * Точка входа в приложение.
     * Инициализирует и запускает Spring Boot контекст приложения.
     *
     * @param args аргументы командной строки
     */
    public static void main(String[] args) {
        SpringApplication.run(CommentServiceApplication.class, args);
    }

}
