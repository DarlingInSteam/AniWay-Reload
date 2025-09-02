package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.mangaservice.config.ServiceUrlProperties;
import shadowshift.studio.mangaservice.dto.MangaCreateDTO;
import shadowshift.studio.mangaservice.dto.MangaResponseDTO;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.exception.MangaServiceException;
import shadowshift.studio.mangaservice.mapper.MangaMapper;
import shadowshift.studio.mangaservice.repository.MangaRepository;
import shadowshift.studio.mangaservice.service.external.ChapterServiceClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

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
 * @author AniWay Development Team
 * @version 2.0.0
 * @since 1.0.0
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
     */
    public MangaService(MangaRepository mangaRepository, 
                       ChapterServiceClient chapterServiceClient,
                       MangaMapper mangaMapper,
                       RestTemplate restTemplate,
                       ServiceUrlProperties serviceUrlProperties) {
        this.mangaRepository = mangaRepository;
        this.chapterServiceClient = chapterServiceClient;
        this.mangaMapper = mangaMapper;
        this.restTemplate = restTemplate;
        this.serviceUrlProperties = serviceUrlProperties;
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
     * Получает информацию о конкретной манге по её идентификатору.
     * 
     * Ищет мангу в базе данных и обогащает её актуальной информацией
     * о количестве глав из ChapterService.
     *
     * @param id идентификатор манги
     * @return Optional с DTO манги, если найдена, иначе пустой Optional
     * @throws IllegalArgumentException если id равен null или отрицательному значению
     */
    @Transactional(readOnly = true)
    public Optional<MangaResponseDTO> getMangaById(Long id) {
        validateMangaId(id);
        
        logger.debug("Поиск ��анги с ID: {}", id);
        
        return mangaRepository.findById(id)
                .map(manga -> {
                    logger.debug("Манга найдена: {}", manga.getTitle());
                    
                    MangaResponseDTO responseDTO = mangaMapper.toResponseDTO(manga);
                    enrichWithChapterCount(responseDTO, manga);
                    
                    return responseDTO;
                });
    }

    /**
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
    public MangaResponseDTO createManga(MangaCreateDTO createDTO) {
        if (createDTO == null) {
            throw new IllegalArgumentException("DTO создания манги не может быть null");
        }
        
        logger.info("Создание новой манги: {}", createDTO.getTitle());
        
        try {
            Manga manga = mangaMapper.toEntity(createDTO);
            Manga savedManga = mangaRepository.save(manga);
            
            logger.info("Манга успешно создана с ID: {}", savedManga.getId());
            
            return mangaMapper.toResponseDTO(savedManga);
            
        } catch (Exception e) {
            logger.error("Ошибка при создании манги: {}", e.getMessage(), e);
            throw new MangaValidationException("Не удалось создать мангу: " + e.getMessage(), e);
        }
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
    public static class MangaNotFoundException extends MangaServiceException {
        public MangaNotFoundException(Long mangaId) {
            super(String.format("Манга с ID %d не найдена", mangaId), "MANGA_NOT_FOUND");
        }
    }

    public static class MangaValidationException extends MangaServiceException {
        public MangaValidationException(String message) {
            super(message, "MANGA_VALIDATION_ERROR");
        }
        
        public MangaValidationException(String message, Throwable cause) {
            super(message, "MANGA_VALIDATION_ERROR", cause);
        }
    }
}
