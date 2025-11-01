FROM gradle:8-jdk21 AS build
WORKDIR /app

# Копируем gradle wrapper и конфигурационные файлы
COPY gradle/ ./gradle/
COPY gradlew ./
COPY gradlew.bat ./
COPY build.gradle settings.gradle ./

# Копируем исходный код
COPY src ./src

# Собираем приложение
RUN chmod +x ./gradlew && ./gradlew build -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app

# Устанавливаем curl для healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Копируем собранный JAR
COPY --from=build /app/build/libs/FriendService.jar app.jar

EXPOSE 8102
ENTRYPOINT ["java", "-jar", "app.jar"]
