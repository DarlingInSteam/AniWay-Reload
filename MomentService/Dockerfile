FROM gradle:8-jdk21 AS build
WORKDIR /app

COPY gradle/ ./gradle/
COPY gradlew ./
COPY gradlew.bat ./
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src

RUN chmod +x ./gradlew && ./gradlew clean build -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8099
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl --fail http://localhost:8099/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
