FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Copy Gradle wrapper & config first for layer caching
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle.kts settings.gradle.kts ./
COPY src ./src

# Ensure gradlew is executable
RUN chmod +x gradlew \
	&& ./gradlew --no-daemon clean bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*SNAPSHOT.jar app.jar
EXPOSE 8098
ENTRYPOINT ["java","-jar","/app/app.jar"]
