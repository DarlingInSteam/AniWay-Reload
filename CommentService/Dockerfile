FROM gradle:8-jdk21 AS build
WORKDIR /app

# Копируем gradle wrapper файлы
COPY gradle/ ./gradle/
COPY gradlew ./
COPY gradlew.bat ./

# Копируем конфигурационные файлы проекта
COPY build.gradle.kts settings.gradle.kts ./

# Копируем исходный код
COPY src ./src

# Собираем проект
RUN ./gradlew build -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app

# Установим curl для healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build/libs/*.jar app.jar

# Открываем порт
EXPOSE 8086

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"]