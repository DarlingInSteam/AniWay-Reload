FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src
RUN --mount=type=cache,target=/root/.gradle ./gradlew build -x test || true

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY build/libs/LevelService-*.jar app.jar
EXPOSE 8098
ENTRYPOINT ["java","-jar","/app/app.jar"]
