# Многоступенчатая сборка для оптимизации размера образа
FROM gradle:8.5-jdk21 AS builder

WORKDIR /app

# Копируем файлы сборки
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src

# Собираем приложение
RUN gradle clean build -x test --no-daemon

# Финальный образ
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Создаем пользователя для запуска приложения
RUN addgroup -S spring && adduser -S spring -G spring

# Создаем директории для данных
RUN mkdir -p /app/output /app/temp && \
    chown -R spring:spring /app

# Копируем JAR из builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

# Переключаемся на непривилегированного пользователя
USER spring:spring

# Открываем порт
EXPOSE 8084

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8084/actuator/health || exit 1

# Запуск приложения
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", \
    "app.jar"]
