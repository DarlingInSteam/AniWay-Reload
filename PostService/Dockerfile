# Multi-stage build for PostService
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
COPY src src
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
ENV JAVA_OPTS="-Xms256m -Xmx512m"
COPY --from=build /app/build/libs/*-SNAPSHOT.jar app.jar
EXPOSE 8097
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
