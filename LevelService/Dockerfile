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
# Copy only the Spring Boot fat jar (exclude *-plain.jar if present). We first copy all then move the right one.
COPY --from=build /workspace/build/libs/ /tmp/libs/
RUN set -eux; \
	ls -l /tmp/libs; \
	FAT_JAR=$(ls /tmp/libs/LevelService-*.jar | grep -v '\-plain\.jar' | head -n1); \
	test -n "$FAT_JAR"; \
	mv "$FAT_JAR" /app/app.jar; \
	rm -f /tmp/libs/*.jar; \
	ls -l /app/app.jar
EXPOSE 8098
ENTRYPOINT ["java","-jar","/app/app.jar"]
