package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.mangaservice.config.ServiceUrlProperties;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.dto.PageResponseDTO;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.entity.Genre;
import shadowshift.studio.mangaservice.entity.Tag;
import shadowshift.studio.mangaservice.exception.MangaServiceException;
import shadowshift.studio.mangaservice.mapper.MangaMapper;
import shadowshift.studio.mangaservice.repository.MangaRepository;
import shadowshift.studio.mangaservice.service.external.ChapterServiceClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Основной сервис для управления мангой в системе AniWay.
 * 
 * Этот сервис предоставляет полный набор операций CRUD для сущностей манги,
 * интегрируясь с внешними микросервисами для получения дополнительной информации.
 * Реализует принципы SOLID, обеспечивая высокую степень разделения ответственности
 * и возможность расширения функциональности.
 * 
 * Основные возможности:
 * - Создание, чтение, обновление и удаление манги
 * - Интеграция с ChapterService для получения актуального количества глав
 * - Автоматическая синхронизация данных между микросервисами
 * - Транзакционная безопасность операций
 * - Полное логирование всех операций
 * 
 * @author ShadowShiftStudio
 */
@Service
@Transactional
public class MangaService {

    private static final Logger logger = LoggerFactory.getLogger(MangaService.class);

    private final MangaRepository mangaRepository;
    private final ChapterServiceClient chapterServiceClient;
    private final MangaMapper mangaMapper;
    private final RestTemplate restTemplate;
    private final ServiceUrlProperties serviceUrlProperties;
    private final GenreService genreService;
    private final TagService tagService;

    // Кэш для rate limiting просмотров: ключ - "userId_mangaId", значение - timestamp последнего просмотра
    private final ConcurrentHashMap<String, Long> viewRateLimitCache = new ConcurrentHashMap<>();

    @Value("${image.storage.service.url}")
    private String imageStorageServiceUrl;

    /**
     * Конструктор сервиса с внедрением зависимостей.
     * 
     * Использует конструкторное внедрение зависимостей для обеспечения
     * неизменности полей и лучшей тестируемости кода.
     *
     * @param mangaRepository репозиторий для работы с сущностями манги
     * @param chapterServiceClient клиент для работы с сервисом глав
     * @param mangaMapper маппер для преобразования между DTO и сущностями
     * @param restTemplate шаблон для выполнения REST-запросов
     * @param serviceUrlProperties конфигурация URL сервисов
     * @param genreService сервис для работы с жанрами
     * @param tagService сервис для работы с тегами
     */
    public MangaService(MangaRepository mangaRepository, 
                       ChapterServiceClient chapterServiceClient,
                       MangaMapper mangaMapper,
                       RestTemplate restTemplate,
                       ServiceUrlProperties serviceUrlProperties,
                       GenreService genreService,
                       TagService tagService) {
        this.mangaRepository = mangaRepository;
        this.chapterServiceClient = chapterServiceClient;
        this.mangaMapper = mangaMapper;
        this.restTemplate = restTemplate;
        this.serviceUrlProperties = serviceUrlProperties;
        this.genreService = genreService;
        this.tagService = tagService;
        logger.info("Инициализирован MangaService");
    }

    /**
     * Получает список всех манг в системе.
     * 
     * Возвращает все манги, отсортированные по дате создания в убывающем порядке
     * (новые манги первыми). Для каждой манги пытается получить актуальное
     * количество глав из ChapterService.
     *
     * @return список DTO с информацией о всех мангах
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "mangaCatalog", key = "'all'")
    public List<MangaResponseDTO> getAllManga() {
        logger.debug("Запрос списка всех манг");
        
        List<Manga> mangaList = mangaRepository.findAllOrderByCreatedAtDesc();
        logger.debug("Найдено {} манг в базе данных", mangaList.size());
        
        List<MangaResponseDTO> responseDTOs = mangaMapper.toResponseDTOList(mangaList);
        
        // Обогащаем каждую мангу актуальным количеством глав и правильными URL обложек
        responseDTOs.forEach(dto -> {
            this.enrichWithChapterCount(dto);
            this.enrichWithCoverUrl(dto);
        });

        logger.debug("Возвращается список из {} манг с обогащенными данными", responseDTOs.size());
        return responseDTOs;
    }

    /**
     * Поиск манги по различным критериям.
     *
     * Выполняет поиск манги по названию, автору, жанру и статусу.
     * Все параметры являются опциональными и могут комбинироваться.
     * Поиск по строковым полям выполняется с игнорированием регистра.
     *
     * @param title название манги (частичное совпадение, может быть null)
     * @param author автор манги (частичное совпадение, может быть null)
     * @param genre жанр манги (частичное совпадение, может быть null)
     * @param status статус манги (точное совпадение, может быть null)
     * @return список DTO с найденными мангами
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "mangaSearch", key = "#title + '_' + #author + '_' + #genre + '_' + #status")
    public List<MangaResponseDTO> searchManga(String title, String author, String genre, String status) {
        logger.debug("Поиск манги с параметрами - title: '{}', author: '{}', genre: '{}', status: '{}'",
                    title, author, genre, status);

        // Валидируем и нормализуем статус
        String validatedStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                // Проверяем, что статус существует
                Manga.MangaStatus.valueOf(status.toUpperCase());
                validatedStatus = status.toUpperCase();
            } catch (IllegalArgumentException e) {
                logger.warn("Неизвестный статус манги: '{}'. Игнорируем этот параметр поиска.", status);
            }
        }

        List<Manga> searchResults = mangaRepository.searchManga(title, author, genre, validatedStatus);
        logger.debug("Найдено {} манг по поисковому запросу", searchResults.size());

        List<MangaResponseDTO> responseDTOs = mangaMapper.toResponseDTOList(searchResults);

        // Обогащаем каждую найденную мангу актуальным количеством глав и правильными URL обложек
        responseDTOs.forEach(dto -> {
            this.enrichWithChapterCount(dto);
            this.enrichWithCoverUrl(dto);
        });

        logger.debug("Возвращается список из {} найденных манг с обогащенными данными", responseDTOs.size());
        return responseDTOs;
    }

    /**
     * Получает пагинированный список всех манг в системе.
     *
     * @param page номер страницы (начиная с 0)
     * @param size размер страницы
     * @param sortBy поле для сортировки
     * @param sortOrder направление сортировки
     * @return PageResponseDTO с пагинированными данными манг
     */
    @Transactional(readOnly = true)
    public PageResponseDTO<MangaResponseDTO> getAllMangaPaged(int page, int size, String sortBy, String sortOrder) {
        logger.debug("Запрос пагинированного списка всех манг - page: {}, size: {}, sortBy: {}, sortOrder: {}", page, size, sortBy, sortOrder);

        // Используем JPQL-вариант без встроенного ORDER BY и передаём Sort из кода.
        Sort.Direction direction = "desc".equalsIgnoreCase(sortOrder) ? Sort.Direction.DESC : Sort.Direction.ASC;
        // Карта сортируемых полей -> поля сущности
        String sortProperty = switch (sortBy) {
            case "title" -> "title";
            case "author" -> "author";
            case "updatedAt" -> "updatedAt";
            case "views" -> "views";
            case "rating" -> "rating";
            case "ratingCount" -> "ratingCount";
            case "likes" -> "likes";
            case "reviews" -> "reviews";
            case "comments" -> "comments";
            case "chapterCount" -> "totalChapters";
            case "popularity" -> "views"; // временная подмена
            default -> "createdAt";
        };
        Sort sort = Sort.by(direction, sortProperty).and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Manga> mangaPage = mangaRepository.findAll(pageable);
        logger.debug("Найдено {} манг на странице {} из {}", mangaPage.getNumberOfElements(), page, mangaPage.getTotalPages());

        List<MangaResponseDTO> responseDTOs = mangaMapper.toResponseDTOList(mangaPage.getContent());

        // Обогащаем каждую мангу актуальным количеством глав и правильными URL обложек
        responseDTOs.forEach(dto -> {
            this.enrichWithChapterCount(dto);
            this.enrichWithCoverUrl(dto);
        });

        PageResponseDTO<MangaResponseDTO> result = new PageResponseDTO<>(
            responseDTOs,
            mangaPage.getNumber(),
            mangaPage.getSize(),
            mangaPage.getTotalElements()
        );

        logger.debug("Возвращается пагинированный список из {} манг", responseDTOs.size());
        return result;
    }

    /**
     * Получает пагинированный список всех манг с фильтрацией по различным критериям.
     *
     * @param page номер страницы (начиная с 0)
     * @param size размер страницы
     * @param sortBy поле для сортировки
     * @param sortOrder направление сортировки
     * @param genres список жанров (может быть null или пустой)
     * @param tags список тегов (может быть null или пустой)
     * @param mangaType тип манги (может быть null)
     * @param status статус манги (может быть null)
     * @param ageRatingMin минимальный возрастной рейтинг (может быть null)
     * @param ageRatingMax максимальный возрастной рейтинг (может быть null)
     * @param ratingMin минимальный рейтинг (может быть null)
     * @param ratingMax максимальный рейтинг (может быть null)
     * @param releaseYearMin минимальный год выпуска (может быть null)
     * @param releaseYearMax максимальный год выпуска (может быть null)
     * @param chapterRangeMin минимальное количество глав (может быть null)
     * @param chapterRangeMax максимальное количество глав (может быть null)
     * @return PageResponseDTO с найденными мангами
     */
    @Transactional(readOnly = true)
    public PageResponseDTO<MangaResponseDTO> getAllMangaPagedWithFilters(
        int page, int size, String sortBy, String sortOrder,
        List<String> genres, List<String> tags, String mangaType, String status,
        Integer ageRatingMin, Integer ageRatingMax, Double ratingMin, Double ratingMax,
        Integer releaseYearMin, Integer releaseYearMax, Integer chapterRangeMin, Integer chapterRangeMax,
        Boolean strictMatch) {

        logger.debug("Запрос пагинированного списка манг с фильтрами - page: {}, size: {}, sortBy: {}, sortOrder: {}, " +
                "genres: {}, tags: {}, mangaType: {}, status: {}, ageRatingMin: {}, ageRatingMax: {}, " +
                "ratingMin: {}, ratingMax: {}, releaseYearMin: {}, releaseYearMax: {}, chapterRangeMin: {}, chapterRangeMax: {}",
                page, size, sortBy, sortOrder, genres, tags, mangaType, status,
                ageRatingMin, ageRatingMax, ratingMin, ratingMax,
                releaseYearMin, releaseYearMax, chapterRangeMin, chapterRangeMax);

        // Валидируем и нормализуем статус
        String validatedStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                Manga.MangaStatus.valueOf(status.toUpperCase());
                validatedStatus = status.toUpperCase();
            } catch (IllegalArgumentException e) {
                logger.warn("Неизвестный статус манги: '{}'. Игнорируем этот параметр поиска.", status);
            }
        }

        // Валидируем и нормализуем тип манги
        String validatedMangaType = null;
        if (mangaType != null && !mangaType.trim().isEmpty()) {
            try {
                Manga.MangaType.valueOf(mangaType.toUpperCase());
                validatedMangaType = mangaType.toUpperCase();
            } catch (IllegalArgumentException e) {
                logger.warn("Неизвестный тип манги: '{}'. Игнорируем этот параметр поиска.", mangaType);
            }
        }

        // Создаем правильную сортировку на основе параметров
        Sort sort = createSort(sortBy, sortOrder);
        Pageable pageable = PageRequest.of(page, size, sort);

        // Заменяем null списки на пустые для корректной работы с SpEL выражениями
        List<String> safeGenres = genres != null ? genres : List.of();
        List<String> safeTags = tags != null ? tags : List.of();

    Page<Manga> searchResults;
    if (Boolean.TRUE.equals(strictMatch)) {
        searchResults = mangaRepository.findAllWithFiltersStrict(
            safeGenres, safeTags, validatedMangaType, validatedStatus,
            ageRatingMin, ageRatingMax, ratingMin, ratingMax,
            releaseYearMin, releaseYearMax, chapterRangeMin, chapterRangeMax,
            pageable);
        logger.debug("Строгий режим фильтрации активен (AND по жанрам/тегам)");
    } else {
        searchResults = mangaRepository.findAllWithFilters(
            safeGenres, safeTags, validatedMangaType, validatedStatus,
            ageRatingMin, ageRatingMax, ratingMin, ratingMax,
            releaseYearMin, releaseYearMax, chapterRangeMin, chapterRangeMax,
            pageable);
    }

        logger.debug("Найдено {} манг с фильтрами на странице {}", searchResults.getNumberOfElements(), page);

        List<MangaResponseDTO> responseDTOs = mangaMapper.toResponseDTOList(searchResults.getContent());

        // Обогащаем каждую найденную мангу актуальным количеством глав и правильными URL обложек
        responseDTOs.forEach(dto -> {
            this.enrichWithChapterCount(dto);
            this.enrichWithCoverUrl(dto);
        });

        PageResponseDTO<MangaResponseDTO> result = new PageResponseDTO<>(
                responseDTOs,
                searchResults.getNumber(),
                searchResults.getSize(),
                searchResults.getTotalElements()
        );

        logger.debug("Возвращается пагинированный список из {} найденных манг с фильтрами", responseDTOs.size());
        return result;
    }

    /**
     * Создает объект Sort на основе параметров сортировки.
     *
     * @param sortBy поле для сортировки
     * @param sortOrder направление сортировки (asc/desc)
     * @return объект Sort
     */
    private Sort createSort(String sortBy, String sortOrder) {
        Sort.Direction direction = "desc".equalsIgnoreCase(sortOrder) ? Sort.Direction.DESC : Sort.Direction.ASC;

        // Для нативных SQL запросов используем имена колонок базы данных
        Sort secondary = Sort.by(Sort.Direction.DESC, "created_at");
        return switch (sortBy != null ? sortBy.toLowerCase() : "createdat") {
            case "title" -> Sort.by(direction, "title").and(secondary);
            case "author" -> Sort.by(direction, "author").and(secondary);
            case "createdat" -> Sort.by(direction, "created_at").and(Sort.by(Sort.Direction.DESC, "id"));
            case "updatedat" -> Sort.by(direction, "updated_at").and(Sort.by(Sort.Direction.DESC, "id"));
            case "views" -> Sort.by(direction, "views").and(secondary);
            case "rating" -> Sort.by(direction, "rating").and(secondary);
            case "ratingcount" -> Sort.by(direction, "rating_count").and(secondary);
            case "likes" -> Sort.by(direction, "likes").and(secondary);
            case "reviews" -> Sort.by(direction, "reviews").and(secondary);
            case "comments" -> Sort.by(direction, "comments").and(secondary);
            case "chaptercount" -> Sort.by(direction, "total_chapters").and(secondary);
            case "popularity" -> Sort.by(direction, "views").and(secondary); // Простое поле для начала
            default -> secondary;
        };
    }

    /**
     * Поиск манги по различным критериям с пагинацией.
     *
     * @param title название манги (частичное совпадение, может быть null)
     * @param author автор манги (частичное совпадение, может быть null)
     * @param genre жанр манги (частичное совпадение, может быть null)
     * @param status статус манги (точное совпадение, может быть null)
     * @param page номер страницы (начиная с 0)
     * @param size размер страницы
     * @param sortBy поле для сортировки
     * @param sortOrder направление сортировки
     * @return PageResponseDTO с найденными мангами
     */
    @Transactional(readOnly = true)
    public PageResponseDTO<MangaResponseDTO> searchMangaPaged(String title, String author, String genre, String status,
                                                              int page, int size, String sortBy, String sortOrder) {
        logger.debug("Пагинированный поиск манги - title: '{}', author: '{}', genre: '{}', status: '{}', page: {}, size: {}, sortBy: {}, sortOrder: {}",
                    title, author, genre, status, page, size, sortBy, sortOrder);

        // Нормализация sortBy от фронтенда (в т.ч. snake/alias варианты)
        if (sortBy != null) {
            String normalized = switch (sortBy.toLowerCase()) {
                case "createdat", "created_at" -> "createdAt";
                case "updatedat", "updated_at" -> "updatedAt";
                case "chaptercount", "chapter_count", "chapters" -> "chapterCount";
                case "ratingcount", "rating_count" -> "ratingCount";
                case "popularity", "popular" -> "popularity";
                case "views" -> "views";
                case "likes" -> "likes";
                case "reviews" -> "reviews";
                case "comments" -> "comments";
                case "rating" -> "rating";
                case "title" -> "title";
                case "author" -> "author";
                default -> "createdAt"; // безопасный дефолт
            };
            if (!normalized.equals(sortBy)) {
                logger.debug("Нормализован sortBy '{}' -> '{}'", sortBy, normalized);
                sortBy = normalized;
            }
        } else {
            sortBy = "createdAt";
        }

        // Валидируем и нормализуем статус
        String validatedStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                Manga.MangaStatus.valueOf(status.toUpperCase());
                validatedStatus = status.toUpperCase();
            } catch (IllegalArgumentException e) {
                logger.warn("Неизвестный статус манги: '{}'. Игнорируем этот параметр поиска.", status);
            }
        }

        // Создаем сортировку для JPQL (используем имена полей сущности)
        Sort.Direction direction = "desc".equalsIgnoreCase(sortOrder) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String sortProperty = switch (sortBy) {
            case "title" -> "title";
            case "author" -> "author";
            case "createdAt" -> "createdAt";
            case "updatedAt" -> "updatedAt";
            case "views" -> "views";
            case "rating" -> "rating";
            case "ratingCount" -> "ratingCount";
            case "likes" -> "likes";
            case "reviews" -> "reviews";
            case "comments" -> "comments";
            case "chapterCount" -> "totalChapters";
            case "popularity" -> "views"; // временная подмена популярности
            default -> "createdAt";
        };
        Sort sort = Sort.by(direction, sortProperty).and(Sort.by(Sort.Direction.DESC, "createdAt"));
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Manga> searchResults = mangaRepository.searchMangaPagedJPQL(title, author, genre, validatedStatus, pageable);
        logger.debug("Найдено {} манг по поисковому запросу на странице {}", searchResults.getNumberOfElements(), page);

        List<MangaResponseDTO> responseDTOs = mangaMapper.toResponseDTOList(searchResults.getContent());

        // Обогащаем каждую найденную мангу актуальным количеством глав и правильными URL обложек
        responseDTOs.forEach(dto -> {
            this.enrichWithChapterCount(dto);
            this.enrichWithCoverUrl(dto);
        });

        PageResponseDTO<MangaResponseDTO> result = new PageResponseDTO<>(
            responseDTOs,
            searchResults.getNumber(),
            searchResults.getSize(),
            searchResults.getTotalElements()
        );

        logger.debug("Возвращается пагинированный список из {} найденных манг", responseDTOs.size());
        return result;
    }



    /**
     * Получает информацию о конкретной манге по её идентификатору.
     * 
     * Ищет мангу в базе данных и обогащает её актуальной информацией
     * о количестве глав из ChapterService.
     *
     * @param id идентификатор манги
     * @return Optional с DTO манги, если найдена, иначе пустой Optional
     * @throws IllegalArgumentException если id равен null или отрицательному значению
     */
    @Transactional
    public Optional<MangaResponseDTO> getMangaById(Long id, Long userId) {
        validateMangaId(id);
        
        logger.info("Поиск манги с ID: {}, userId: {}", id, userId);
        
        return mangaRepository.findById(id)
                .map(manga -> {
                    logger.debug("Манга найдена: {}", manga.getTitle());

                    // Исправляем NULL значение в поле views, если оно есть
                    if (manga.getViews() == null) {
                        logger.warn("Найдено NULL значение в поле views для манги {}. Исправляем на 0", manga.getId());
                        manga.setViews(0L);
                    }

                    // Инкрементируем просмотры, если пользователь авторизован и прошло больше часа с последнего просмотра
                    if (userId != null) {
                        logger.info("Текущее количество просмотров манги {}: {}", manga.getId(), manga.getViews());
                        logger.info("Инкрементируем просмотры для манги {} пользователем {}", manga.getId(), userId);
                        incrementViewsIfAllowed(manga.getId(), userId);

                        // После инкремента получаем актуальные данные из базы данных
                        manga = mangaRepository.findById(id).orElse(manga);
                        logger.info("После инкремента: просмотры манги {} = {}", manga.getId(), manga.getViews());
                    } else {
                        logger.info("Пользователь не авторизован, просмотры не инкрементируем для манги {}", manga.getId());
                    }

                    MangaResponseDTO responseDTO = mangaMapper.toResponseDTO(manga);
                    logger.info("Возвращаем мангу {} с просмотрами: {}", manga.getId(), responseDTO.getViews());
                    enrichWithChapterCount(responseDTO, manga);

                    return responseDTO;
                });
    }

    /**
     * Инкрементирует просмотры манги, если прошло больше часа с последнего просмотра пользователя.
     *
     * @param mangaId ID манги
     * @param userId ID пользователя
     */
    @Transactional
    private void incrementViewsIfAllowed(Long mangaId, Long userId) {
        String cacheKey = userId + "_" + mangaId;
        long currentTime = System.currentTimeMillis();
        long oneHourMillis = 60 * 60 * 1000; // 1 час в миллисекундах

        Long lastViewTime = viewRateLimitCache.get(cacheKey);

        logger.info("Проверка rate limit для пользователя {} манги {}: lastViewTime={}, currentTime={}, diff={}",
            userId, mangaId, lastViewTime, currentTime, lastViewTime != null ? (currentTime - lastViewTime) : "N/A");

        if (lastViewTime == null || (currentTime - lastViewTime) >= oneHourMillis) {
            // Обновляем кэш и инкрементируем просмотры
            viewRateLimitCache.put(cacheKey, currentTime);
            logger.info("Выполняем incrementViews для манги {}", mangaId);
            try {
                mangaRepository.incrementViews(mangaId);
                // Принудительно сохраняем изменения в базу данных
                mangaRepository.flush();
                logger.info("Успешно инкрементированы просмотры для манги {} пользователем {}", mangaId, userId);
            } catch (Exception e) {
                logger.error("Ошибка при инкременте просмотров для манги {} пользователем {}: {}", mangaId, userId, e.getMessage(), e);
                throw e;
            }
        } else {
            logger.info("Просмотр манги {} пользователем {} заблокирован rate limit", mangaId, userId);
        }
    }    /**
     * Создает новую мангу в системе.
     * 
     * Принимает DTO с данны��и для создания, валидирует их,
     * преобразует в сущность и сохраняет в базе данных.
     *
     * @param createDTO DTO с данными д��я создания манги
     * @return DTO созданной манги
     * @throws IllegalArgumentException если createDTO равен null
     * @throws MangaValidationException если данные не прошли валидацию
     */
    @CacheEvict(value = {"mangaCatalog", "mangaSearch"}, allEntries = true)
    public MangaResponseDTO createManga(MangaCreateDTO createDTO) {
        if (createDTO == null) {
            throw new IllegalArgumentException("DTO создания манги не может быть null");
        }
        
        logger.info("Создание новой манги: {}", createDTO.getTitle());
        
        try {
            Manga manga = mangaMapper.toEntity(createDTO);
            
            // Обработка жанров
            if (createDTO.getGenreNames() != null && !createDTO.getGenreNames().isEmpty()) {
                List<Genre> genres = genreService.createOrGetGenres(createDTO.getGenreNames());
                for (Genre genre : genres) {
                    manga.addGenre(genre);
                    // Явно сохраняем жанр с обновленным счетчиком
                    genreService.saveGenre(genre);
                }
                logger.info("Добавлено {} жанров к манге: {}", genres.size(), createDTO.getTitle());
            }
            
            // Обработка тегов
            if (createDTO.getTagNames() != null && !createDTO.getTagNames().isEmpty()) {
                List<Tag> tags = tagService.createOrGetTags(createDTO.getTagNames());
                for (Tag tag : tags) {
                    manga.addTag(tag);
                    // Явно сохраняем тег с обновленным счетчиком
                    tagService.saveTag(tag);
                }
                logger.info("Добавлено {} тегов к манге: {}", tags.size(), createDTO.getTitle());
            }
            
            Manga savedManga = mangaRepository.save(manga);
            
            logger.info("Манга успешно создана с ID: {}", savedManga.getId());
            
            return mangaMapper.toResponseDTO(savedManga);
            
        } catch (Exception e) {
            logger.error("Ошибка при создании манги: {}", e.getMessage(), e);
            throw new MangaValidationException("Не удалось создать мангу: " + e.getMessage(), e);
        }
    }

    /**
     * Создает мангу с обработкой жанров и тегов из строковых значений (для импорта из Melon).
     * 
     * @param createDTO DTO с данными манги
     * @param genresString строка с жанрами, разделенными запятыми
     * @param tagsString строка с тегами, разделенными запятыми
     * @return DTO созданной манги
     */
    @CacheEvict(value = {"mangaCatalog", "mangaSearch"}, allEntries = true)
    public MangaResponseDTO createMangaFromMelon(MangaCreateDTO createDTO, String genresString, String tagsString) {
        if (createDTO == null) {
            throw new IllegalArgumentException("DTO создания манги не может быть null");
        }
        
        logger.info("Создание новой манги из Melon: {}", createDTO.getTitle());
        
        try {
            Manga manga = mangaMapper.toEntity(createDTO);
            
            // Обработка жанров из строки
            if (genresString != null && !genresString.trim().isEmpty()) {
                List<String> genreNames = parseCommaDelimitedString(genresString);
                if (!genreNames.isEmpty()) {
                    List<Genre> genres = genreService.createOrGetGenres(genreNames);
                    for (Genre genre : genres) {
                        manga.addGenre(genre);
                        // Явно сохраняем жанр с обновленным счетчиком
                        genreService.saveGenre(genre);
                    }
                    logger.info("Добавлено {} жанров к манге из Melon: {}", genres.size(), createDTO.getTitle());
                }
            }
            
            // Обработка тегов из строки
            if (tagsString != null && !tagsString.trim().isEmpty()) {
                List<String> tagNames = parseCommaDelimitedString(tagsString);
                if (!tagNames.isEmpty()) {
                    List<Tag> tags = tagService.createOrGetTags(tagNames);
                    for (Tag tag : tags) {
                        manga.addTag(tag);
                        // Явно сохраняем тег с обновленным счетчиком
                        tagService.saveTag(tag);
                    }
                    logger.info("Добавлено {} тегов к манге из Melon: {}", tags.size(), createDTO.getTitle());
                }
            }
            
            // Сохранение старых строковых представлений для обратной совместимости
            manga.setGenre(genresString);
            manga.setTagsString(tagsString);
            
            Manga savedManga = mangaRepository.save(manga);
            
            logger.info("Манга из Melon успешно создана с ID: {}", savedManga.getId());
            
            return mangaMapper.toResponseDTO(savedManga);
            
        } catch (Exception e) {
            logger.error("Ошибка при создании манги из Melon: {}", e.getMessage(), e);
            throw new MangaValidationException("Не удалось создать мангу из Melon: " + e.getMessage(), e);
        }
    }

    /**
     * Разбирает строку с элементами, разделенными запятыми.
     * 
     * @param input строка для разбора
     * @return список очищенных элементов
     */
    private List<String> parseCommaDelimitedString(String input) {
        if (input == null || input.trim().isEmpty()) {
            return List.of();
        }
        
        return List.of(input.split(","))
                .stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .toList();
    }

    /**
     * Обновляет существующую мангу.
     * 
     * Находит мангу по идентификатору, применяет изменения из DTO
     * и сохраняет обновленную сущность в базе данных.
     *
     * @param id идентификатор обновляемой манги
     * @param updateDTO DTO с новыми данными
     * @return Optional с DTO обновленной манги, если найдена, иначе пустой Optional
     * @throws IllegalArgumentException если id равен null или updateDTO равен null
     * @throws MangaValidationException если данные не прошли валидацию
     */
    @CacheEvict(value = {"mangaCatalog", "mangaSearch", "mangaDetails"}, key = "#id")
    public Optional<MangaResponseDTO> updateManga(Long id, MangaCreateDTO updateDTO) {
        validateMangaId(id);
        
        if (updateDTO == null) {
            throw new IllegalArgumentException("DTO обновления манги не может быть null");
        }
        
        logger.info("Обновление манги с ID: {}", id);
        
        return mangaRepository.findById(id)
                .map(existingManga -> {
                    try {
                        String oldTitle = existingManga.getTitle();
                        mangaMapper.updateEntity(existingManga, updateDTO);
                        Manga updatedManga = mangaRepository.save(existingManga);
                        
                        logger.info("Манга обновлена: '{}' -> '{}'", oldTitle, updatedManga.getTitle());
                        
                        return mangaMapper.toResponseDTO(updatedManga);
                        
                    } catch (Exception e) {
                        logger.error("Ошибка при обновлении манги с ID {}: {}", id, e.getMessage(), e);
                        throw new MangaValidationException("Не удалось обновить мангу: " + e.getMessage(), e);
                    }
                });
    }

    /**
     * Удаляет мангу из системы.
     * 
     * Выполняет каскадное удаление манги по идентификатору.
     * Удаляет саму мангу и все связанные с ней закладки пользователей.
     *
     * @param id идентификатор удаляемой манги
     * @throws IllegalArgumentException если id равен null или отрицательному значению
     */
    @CacheEvict(value = {"mangaCatalog", "mangaSearch", "mangaDetails"}, key = "#id")
    public void deleteManga(Long id) {
        validateMangaId(id);
        
        logger.info("Удаление манги с ID: {}", id);
        
        try {
            if (mangaRepository.existsById(id)) {
                // Сначала удаляем все закладки для этой манги
                deleteBookmarksForManga(id);
                
                // Затем удаляем саму мангу
                mangaRepository.deleteById(id);
                logger.info("Манга с ID {} успешно удалена", id);
            } else {
                logger.warn("Попытка удалить несуществующую мангу с ID: {}", id);
            }
        } catch (Exception e) {
            logger.error("Ошибка при удалении манги с ID {}: {}", id, e.getMessage(), e);
            throw new MangaServiceException("Не удалось удалить мангу", "MANGA_DELETE_ERROR", e) {};
        }
    }
    
    /**
     * Удаляет все закладки для указанной манги через AuthService.
     * 
     * @param mangaId идентификатор манги
     */
    private void deleteBookmarksForManga(Long mangaId) {
        try {
            String authServiceUrl = serviceUrlProperties.getAuthServiceUrl();
            String deleteBookmarksUrl = authServiceUrl + "/api/bookmarks/manga/" + mangaId;
            
            restTemplate.delete(deleteBookmarksUrl);
            logger.info("Закладки для манги ID {} успешно удалены", mangaId);
        } catch (Exception e) {
            logger.warn("Не удалось удалить закладки для манги ID {}: {}", mangaId, e.getMessage());
            // Не прерываем процесс удаления манги, если не удалось удалить закладки
        }
    }

    /**
     * Обновляет URL обложки манги.
     * 
     * Специализированный метод для обновления только URL изображения обложки,
     * что часто требуется при работе с системами управления файлами.
     *
     * @param mangaId идентификатор манги
     * @param imageUrl новый URL изображения обложки
     * @throws IllegalArgumentException если mangaId равен null или imageUrl пустой
     */
    public void updateCoverImage(Long mangaId, String imageUrl) {
        validateMangaId(mangaId);
        
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("URL изображения не может быть пустым");
        }
        
        logger.info("Обновление обложки манги с ID: {}", mangaId);
        
        mangaRepository.findById(mangaId)
                .ifPresentOrElse(
                    manga -> {
                        String oldUrl = manga.getCoverImageUrl();
                        manga.setCoverImageUrl(imageUrl);
                        mangaRepository.save(manga);
                        
                        logger.info("Обложка манги {} обновлена: '{}' -> '{}'", 
                                  mangaId, oldUrl, imageUrl);
                    },
                    () -> {
                        logger.warn("Попытка обновить обложку несуществующей манги с ID: {}", mangaId);
                        throw new MangaNotFoundException(mangaId);
                    }
                );
    }

    /**
     * Обогащает DTO манги актуальным количеством глав.
     * 
     * Частный метод для получения и обновления информации о количестве глав
     * из ChapterService. Обеспечивает синхронизацию данных между микросервисами.
     *
     * @param responseDTO DTO для обогащения
     */
    private void enrichWithChapterCount(MangaResponseDTO responseDTO) {
        Optional<Manga> mangaOpt = mangaRepository.findById(responseDTO.getId());
        mangaOpt.ifPresent(manga -> enrichWithChapterCount(responseDTO, manga));
    }

    /**
     * Обогащает DTO манги актуальным количеством глав с возможностью обновления сущности.
     *
     * @param responseDTO DTO для обогащения
     * @param manga соответствующая сущность для возможного обновления
     */
    private void enrichWithChapterCount(MangaResponseDTO responseDTO, Manga manga) {
        try {
            Optional<Integer> chapterCountOpt = chapterServiceClient.getChapterCount(responseDTO.getId());
            
            if (chapterCountOpt.isPresent()) {
                Integer actualCount = chapterCountOpt.get();
                responseDTO.setTotalChapters(actualCount);
                
                // Синхронизируем с базой данных если данные устарели
                if (!actualCount.equals(manga.getTotalChapters())) {
                    manga.setTotalChapters(actualCount);
                    mangaRepository.save(manga);
                    logger.debug("Обновлено количество глав для манги {}: {}", 
                               responseDTO.getId(), actualCount);
                }
            } else {
                logger.debug("Не удалось получить количество глав для манги {}, " +
                           "используется сохраненное значение: {}", 
                           responseDTO.getId(), manga.getTotalChapters());
            }
        } catch (Exception e) {
            logger.warn("Ошибка при обогащении данных о главах для манги {}: {}", 
                       responseDTO.getId(), e.getMessage());
        }
    }

    /**
     * Обогащает DTO манги правильным URL обложки из ImageStorageService.
     *
     * Получает URL обложки из MinIO через ImageStorageService и обновляет поле в DTO.
     *
     * @param responseDTO DTO для обогащения
     */
    private void enrichWithCoverUrl(MangaResponseDTO responseDTO) {
        try {
            // Получаем обложку из ImageStorageService по manga_id
            String coverUrl = imageStorageServiceUrl + "/api/images/cover/" + responseDTO.getId();

            @SuppressWarnings("unchecked")
            Map<String, Object> coverResponse = restTemplate.getForObject(coverUrl, Map.class);

            if (coverResponse != null && coverResponse.containsKey("imageUrl")) {
                String minioImageUrl = (String) coverResponse.get("imageUrl");
                responseDTO.setCoverImageUrl(minioImageUrl);
                logger.debug("Обновлен URL обложки для манги {} из MinIO: {}",
                           responseDTO.getId(), minioImageUrl);
            } else {
                logger.debug("Обложка не найдена в ImageStorageService для манги {}, " +
                           "используется сохраненный URL", responseDTO.getId());
            }
        } catch (Exception e) {
            logger.debug("Не удалось получить обложку из ImageStorageService для манги {}: {}, " +
                       "используется сохраненный URL", responseDTO.getId(), e.getMessage());
        }
    }

    /**
     * Валидирует идентификатор манги.
     *
     * @param id идентификатор для валидации
     * @throws IllegalArgumentException если id некорректен
     */
    private void validateMangaId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("ID манги должен быть положительным числом");
        }
    }

    // Внутренние классы исключений для лучшей читаемости
    /**
     * Исключение, выбрасываемое когда запрашиваемая манга не найдена.
     */
    public static class MangaNotFoundException extends MangaServiceException {

        /**
         * Конструктор с ID манги.
         *
         * @param mangaId ID манги, которая не найдена
         */
        public MangaNotFoundException(Long mangaId) {
            super(String.format("Манга с ID %d не найдена", mangaId), "MANGA_NOT_FOUND");
        }
    }

    /**
     * Исключение, выбрасываемое при ошибках валидации данных манги.
     */
    public static class MangaValidationException extends MangaServiceException {

        /**
         * Конструктор с сообщением об ошибке.
         *
         * @param message описание ошибки валидации
         */
        public MangaValidationException(String message) {
            super(message, "MANGA_VALIDATION_ERROR");
        }
        
        /**
         * Конструктор с сообщением об ошибке и причиной.
         *
         * @param message описание ошибки валидации
         * @param cause первопричина исключения
         */
        public MangaValidationException(String message, Throwable cause) {
            super(message, "MANGA_VALIDATION_ERROR", cause);
        }
    }
}
