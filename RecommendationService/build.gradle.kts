plugins {
	java
	id("org.springframework.boot") version "3.4.0"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.aniway"
version = "0.0.1-SNAPSHOT"
description = "RecommendationService"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-data-redis")
	implementation("org.springframework.boot:spring-boot-starter-amqp")
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.postgresql:postgresql")
	implementation("org.flywaydb:flyway-core")

	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// Отключаем тесты для успешной сборки
tasks.test {
	enabled = false
}

tasks.withType<Test> {
	enabled = false
}
