plugins {
    java
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "shadowshift.studio"
version = "0.0.1-SNAPSHOT"
description = "ChapterService"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-webflux") // Добавляем WebFlux для WebClient
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework:spring-tx") // Добавляем для @Transactional
    implementation("org.springframework.boot:spring-boot-starter-amqp")
    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation("org.postgresql:postgresql")
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
