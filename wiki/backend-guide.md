# Backend Guide

Руководство по разработке backend для проекта AniWay. Проект построен на микросервисной архитектуре с использованием Spring Boot 3 и Java 21.

## Архитектура системы

### Микросервисная архитектура

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Gateway       │
│   (React)       │    │   Service       │
└─────────────────┘    └─────────────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
         ┌───────▼────┐ ┌─────▼─────┐ ┌───▼────┐
         │    Auth    │ │   Manga   │ │Chapter │
         │  Service   │ │ Service   │ │Service │
         └────────────┘ └───────────┘ └────────┘
                 │            │            │
         ┌───────▼────┐ ┌─────▼─────┐ ┌───▼────┐
         │Image Storage│ │  Melon    │ │  DB    │
         │  Service   │ │ Service   │ │ Layer  │
         └────────────┘ └───────────┘ └────────┘
```

## Сервисы

### AuthService (Порт: 8081)

**Назначение**: Управление пользователями, аутентификация, авторизация, закладки, отзывы, прогресс чтения.

**Технологии**:
- Spring Boot 3.5.5
- Spring Security + JWT
- PostgreSQL
- Spring Data JPA

**Структура пакетов**:
```
shadowshift.studio.authservice/
├── config/              # Конфигурация (Security, CORS, JWT)
├── controller/          # REST контроллеры
│   ├── AuthController   # Регистрация, логин, logout
│   ├── UserController   # Управление пользователями
│   ├── BookmarkController # Закладки манги
│   ├── ProgressController # Прогресс чтения
│   ├── ReviewController # Отзывы и рейтинги
│   └── AdminController  # Админ функции
├── dto/                 # Data Transfer Objects
├── entity/              # JPA сущности
├── repository/          # Spring Data репозитории
└── service/             # Бизнес-логика
```

**Основные endpoints**:
```
POST /api/auth/register     # Регистрация
POST /api/auth/login        # Вход в систему
GET  /api/auth/users/search # Поиск пользователей
GET  /api/bookmarks         # Закладки пользователя
POST /api/auth/reviews      # Создание отзыва
GET  /api/auth/progress     # Прогресс чтения
```

**База данных**: PostgreSQL (auth-postgres:5432)

### MangaService (Порт: 8082)

**Назначение**: Управление мангой, метаданными, каталогом, поиском.

**Технологии**:
- Spring Boot 3
- PostgreSQL
- Spring Data JPA
- WebSocket для уведомлений

**Структура пакетов**:
```
shadowshift.studio.mangaservice/
├── config/              # Конфигурация
├── controller/          # REST контроллеры
│   ├── MangaRestController # CRUD операции с мангой
│   └── ProgressController  # Синхронизация прогресса
├── dto/                 # DTO для API
├── entity/              # JPA сущности
├── exception/           # Обработка исключений
├── mapper/              # Маппинг между entity и DTO
├── repository/          # Репозитории
├── service/             # Бизнес-логика
├── util/                # Утилиты
└── websocket/           # WebSocket конфигурация
```

**Основные endpoints**:
```
GET  /api/manga                    # Список манги с пагинацией
GET  /api/manga/{id}               # Детали манги
POST /api/manga                    # Создание манги (админ)
PUT  /api/manga/{id}               # Обновление манги
GET  /api/manga/search             # Поиск манги
GET  /api/manga/{id}/chapters      # Главы манги
```

**База данных**: PostgreSQL (manga-postgres:5433)

### ChapterService (Порт: 8083)

**Назначение**: Управление главами манги, страницами, чтением.

**Технологии**:
- Spring Boot 3
- PostgreSQL
- Spring Data JPA

**Структура пакетов**:
```
shadowshift.studio.chapterservice/
├── config/              # Конфигурация
├── controller/          # REST контроллеры
│   └── ChapterRestController # CRUD для глав
├── dto/                 # DTO
├── entity/              # JPA сущности
├── repository/          # Репозитории
└── service/             # Бизнес-логика
```

**Основные endpoints**:
```
GET  /api/chapters/{id}            # Детали главы
GET  /api/chapters/{id}/pages      # Страницы главы
POST /api/chapters                 # Создание главы
PUT  /api/chapters/{id}            # Обновление главы
```

**База данных**: PostgreSQL (chapter-postgres:5434)

### ImageStorageService (Порт: 8084)

**Назначение**: Хранение и обработка изображений (обложки, страницы манги).

**Технологии**:
- Spring Boot 3
- PostgreSQL
- MinIO/S3 для хранения файлов

**Структура пакетов**:
```
shadowshift.studio.imagestorageservice/
├── config/              # Конфигурация
├── controller/          # REST контроллеры
│   └── ImageStorageController # Загрузка/получение изображений
├── dto/                 # DTO
├── entity/              # JPA сущности
├── repository/          # Репозитории
└── service/             # Логика обработки изображений
```

**Основные endpoints**:
```
POST /api/images/upload            # Загрузка изображения
GET  /api/images/{id}              # Получение изображения
DELETE /api/images/{id}            # Удаление изображения
```

**База данных**: PostgreSQL (image-postgres:5435)

### GatewayService (Порт: 8080)

**Назначение**: API Gateway, маршрутизация запросов, аутентификация.

**Технологии**:
- Spring Boot 3
- Spring Cloud Gateway
- WebFlux (реактивный стек)

**Структура пакетов**:
```
shadowshift.studio.gatewayservice/
├── config/              # Конфигурация маршрутов
├── controller/          # Управляющие контроллеры
├── exception/           # Обработка ошибок
└── filter/              # Фильтры запросов
```

**Маршрутизация**:
```yaml
# application.yml
spring:
  cloud:
    gateway:
      routes:
        - id: auth-service
          uri: http://auth-service:8081
          predicates:
            - Path=/api/auth/**
        - id: manga-service
          uri: http://manga-service:8082
          predicates:
            - Path=/api/manga/**
```

### MelonService (Порт: 8085)

**Назначение**: Парсинг контента с внешних источников, обработка данных.

**Технологии**:
- Python 3
- FastAPI
- AsyncIO для асинхронной обработки

**Структура**:
```
MelonService/
├── api_server.py        # FastAPI сервер
├── main.py              # Основной модуль парсинга
├── Parsers/             # Парсеры различных сайтов
├── Source/              # Исходные данные
├── Output/              # Результаты парсинга
├── Temp/                # Временные файлы
└── Templates/           # Шаблоны обработки
```

**Основные endpoints**:
```
POST /parse                        # Парсинг манги
POST /build                        # Сборка данных
GET  /status/{task_id}             # Статус задачи
POST /batch-parse                  # Массовый парсинг
```

## Общие принципы разработки

### Структура Spring Boot сервиса

```java
// Стандартная структура контроллера
@RestController
@RequestMapping("/api/entity")
@RequiredArgsConstructor
@Slf4j
public class EntityController {
    
    private final EntityService entityService;
    
    @GetMapping
    public ResponseEntity<List<EntityDTO>> getAll() {
        List<EntityDTO> entities = entityService.findAll();
        return ResponseEntity.ok(entities);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<EntityDTO> getById(@PathVariable Long id) {
        EntityDTO entity = entityService.findById(id);
        return ResponseEntity.ok(entity);
    }
    
    @PostMapping
    public ResponseEntity<EntityDTO> create(@Valid @RequestBody CreateEntityRequest request) {
        EntityDTO created = entityService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
```

### Обработка ошибок

```java
// Глобальный обработчик исключений
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(EntityNotFoundException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .message(ex.getMessage())
            .status(HttpStatus.NOT_FOUND.value())
            .timestamp(LocalDateTime.now())
            .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        // обработка ошибок валидации
    }
}
```

### Валидация данных

```java
// DTO с валидацией
public class CreateUserRequest {
    
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters")
    private String username;
    
    @Email(message = "Invalid email format")
    private String email;
    
    @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$", 
             message = "Password must contain at least 8 characters, one letter and one number")
    private String password;
}
```

### Безопасность

```java
// JWT конфигурация
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) {
        String token = extractTokenFromRequest(request);
        
        if (token != null && jwtService.validateToken(token)) {
            String username = jwtService.extractUsername(token);
            UserDetails userDetails = userService.loadUserByUsername(username);
            
            UsernamePasswordAuthenticationToken auth = 
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
}
```

## База данных

### JPA Entity

```java
@Entity
@Table(name = "manga")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Manga {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 255)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "cover_image_url")
    private String coverImageUrl;
    
    @Enumerated(EnumType.STRING)
    private MangaStatus status;
    
    @Column(name = "total_chapters")
    private Integer totalChapters;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Связи
    @OneToMany(mappedBy = "manga", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Chapter> chapters = new ArrayList<>();
}
```

### Repository

```java
@Repository
public interface MangaRepository extends JpaRepository<Manga, Long>, JpaSpecificationExecutor<Manga> {
    
    List<Manga> findByStatusOrderByCreatedAtDesc(MangaStatus status);
    
    Page<Manga> findByTitleContainingIgnoreCase(String title, Pageable pageable);
    
    @Query("SELECT m FROM Manga m WHERE m.title LIKE %:search% OR m.description LIKE %:search%")
    List<Manga> searchManga(@Param("search") String search);
    
    @Modifying
    @Query("UPDATE Manga m SET m.totalChapters = :totalChapters WHERE m.id = :id")
    void updateTotalChapters(@Param("id") Long id, @Param("totalChapters") Integer totalChapters);
}
```

### Service Layer

```java
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class MangaService {
    
    private final MangaRepository mangaRepository;
    private final MangaMapper mangaMapper;
    
    @Transactional(readOnly = true)
    public Page<MangaDTO> findAll(Pageable pageable) {
        return mangaRepository.findAll(pageable)
            .map(mangaMapper::toDTO);
    }
    
    @Transactional(readOnly = true)
    public MangaDTO findById(Long id) {
        Manga manga = mangaRepository.findById(id)
            .orElseThrow(() -> new MangaNotFoundException("Manga not found with id: " + id));
        return mangaMapper.toDTO(manga);
    }
    
    public MangaDTO create(CreateMangaRequest request) {
        Manga manga = mangaMapper.toEntity(request);
        Manga saved = mangaRepository.save(manga);
        log.info("Created manga with id: {}", saved.getId());
        return mangaMapper.toDTO(saved);
    }
}
```

## Межсервисное взаимодействие

### REST Client

```java
@Component
@RequiredArgsConstructor
public class MangaServiceClient {
    
    private final RestTemplate restTemplate;
    
    @Value("${manga.service.url}")
    private String mangaServiceUrl;
    
    public MangaDTO getManga(Long mangaId) {
        String url = mangaServiceUrl + "/api/manga/" + mangaId;
        
        try {
            ResponseEntity<MangaDTO> response = restTemplate.getForEntity(url, MangaDTO.class);
            return response.getBody();
        } catch (HttpClientErrorException.NotFound e) {
            throw new MangaNotFoundException("Manga not found: " + mangaId);
        } catch (Exception e) {
            throw new ServiceCommunicationException("Failed to fetch manga: " + e.getMessage());
        }
    }
}
```

### Конфигурация

```java
@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        
        // Timeout конфигурация
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        restTemplate.setRequestFactory(factory);
        
        // Error Handler
        restTemplate.setErrorHandler(new CustomResponseErrorHandler());
        
        return restTemplate;
    }
}
```

## Логирование и мониторинг

### Логирование

```java
@Slf4j
@Service
public class UserService {
    
    public UserDTO create(CreateUserRequest request) {
        log.info("Creating user with username: {}", request.getUsername());
        
        try {
            // бизнес-логика
            log.debug("User validation passed for: {}", request.getUsername());
            
            User saved = userRepository.save(user);
            log.info("Successfully created user with id: {}", saved.getId());
            
            return userMapper.toDTO(saved);
        } catch (Exception e) {
            log.error("Failed to create user: {}", e.getMessage(), e);
            throw e;
        }
    }
}
```

### Actuator Endpoints

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
```

## Тестирование

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class MangaServiceTest {
    
    @Mock
    private MangaRepository mangaRepository;
    
    @Mock
    private MangaMapper mangaMapper;
    
    @InjectMocks
    private MangaService mangaService;
    
    @Test
    void shouldFindMangaById() {
        // Given
        Long mangaId = 1L;
        Manga manga = createTestManga();
        MangaDTO expectedDTO = createTestMangaDTO();
        
        when(mangaRepository.findById(mangaId)).thenReturn(Optional.of(manga));
        when(mangaMapper.toDTO(manga)).thenReturn(expectedDTO);
        
        // When
        MangaDTO result = mangaService.findById(mangaId);
        
        // Then
        assertThat(result).isEqualTo(expectedDTO);
        verify(mangaRepository).findById(mangaId);
        verify(mangaMapper).toDTO(manga);
    }
}
```

### Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class MangaControllerIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateManga() {
        CreateMangaRequest request = CreateMangaRequest.builder()
            .title("Test Manga")
            .description("Test Description")
            .build();
        
        ResponseEntity<MangaDTO> response = restTemplate.postForEntity(
            "/api/manga", request, MangaDTO.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getTitle()).isEqualTo("Test Manga");
    }
}
```

## Полезные команды

```bash
# Gradle
./gradlew build                    # Сборка проекта
./gradlew test                     # Запуск тестов
./gradlew bootRun                  # Запуск приложения
./gradlew clean build -x test      # Сборка без тестов

# Docker
docker-compose logs auth-service   # Логи сервиса
docker exec -it auth-service bash  # Подключение к контейнеру
docker logs auth-service --tail=50 # Последние 50 строк логов

# База данных
docker exec -it auth-postgres psql -U postgres -d authdb
```

## Best Practices

1. **Используйте DTOs** для API контрактов
2. **Валидируйте входные данные** на уровне контроллера
3. **Обрабатывайте исключения** глобально
4. **Логируйте важные события** и ошибки
5. **Тестируйте бизнес-логику** unit и integration тестами
6. **Используйте транзакции** для консистентности данных
7. **Кэшируйте** часто запрашиваемые данные
8. **Мониторьте производительность** через Actuator

---

**Помните**: Каждый сервис должен быть независимым и отвечать за одну бизнес-область.
