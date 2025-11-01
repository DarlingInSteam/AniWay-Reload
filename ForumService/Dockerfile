# Dockerfile для ForumService (Production)
FROM openjdk:21-jdk-slim AS builder

# Установка рабочей директории
WORKDIR /app

# Копирование gradle wrapper
COPY gradlew .
COPY gradle gradle

# Копирование файлов сборки
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Установка прав на выполнение для gradlew
RUN chmod +x ./gradlew

# Загрузка зависимостей (для кэширования слоев)
RUN ./gradlew dependencies --no-daemon

# Копирование исходного кода
COPY src src

# Сборка приложения
RUN ./gradlew build --no-daemon -x test

# Финальная стадия
FROM openjdk:21-jdk-slim

# Установка переменных окружения
ENV SPRING_PROFILES_ACTIVE=prod

# Создание пользователя для безопасности
RUN addgroup --system spring && adduser --system spring --ingroup spring

# Создание директории приложения
WORKDIR /app

# Копирование JAR файла из builder стадии
COPY --from=builder /app/build/libs/ForumService.jar app.jar

# Изменение владельца файлов
RUN chown spring:spring app.jar

# Переключение на пользователя spring
USER spring

# Экспорт порта
EXPOSE 8087

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8087/actuator/health || exit 1

# Команда запуска
ENTRYPOINT ["java", "-jar", "/app/app.jar"]