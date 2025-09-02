plugins {
    java
    id("org.springframework.boot") version "3.4.0"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "shadowshift.studio"
version = "0.0.1-SNAPSHOT"
description = "GateWayService"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

extra["springCloudVersion"] = "2024.0.0"

dependencies {
    // Spring Cloud Gateway
    implementation("org.springframework.cloud:spring-cloud-starter-gateway")

    // Spring Boot Web (для CORS и других настроек)
    implementation("org.springframework.boot:spring-boot-starter-webflux")

    // Actuator для мониторинга
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Логирование
    implementation("org.springframework.boot:spring-boot-starter-logging")

    // Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // DevTools для разработки
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:${property("springCloudVersion")}")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
