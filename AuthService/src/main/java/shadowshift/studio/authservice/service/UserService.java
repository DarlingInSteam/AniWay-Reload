package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.entity.ActionType;
import shadowshift.studio.authservice.entity.AdminActionLog;
import shadowshift.studio.authservice.entity.Role;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.entity.BanType;
import shadowshift.studio.authservice.mapper.UserMapper;
import shadowshift.studio.authservice.repository.AdminActionLogRepository;
import shadowshift.studio.authservice.repository.ReadingProgressRepository;
import shadowshift.studio.authservice.repository.UserRepository;
import shadowshift.studio.authservice.dto.UserStatsDTO;

import jakarta.persistence.criteria.Predicate;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Сервис для управления пользователями.
 * Предоставляет функциональность поиска, обновления профилей,
 * получения статистики чтения и конвертации в DTO.
 *
 * @author ShadowShiftStudio
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserDetailsService {
    
    private final UserRepository userRepository;
    private final AdminActionLogRepository adminActionLogRepository;
    private final ReadingProgressRepository readingProgressRepository;

    /**
     * Загружает пользователя по имени пользователя или email для аутентификации.
     *
     * @param username имя пользователя или email
     * @return объект UserDetails для аутентификации
     * @throws UsernameNotFoundException если пользователь не найден
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
    
    /**
     * Получает пользователя по идентификатору.
     *
     * @param id идентификатор пользователя
     * @return объект DTO пользователя
     * @throws IllegalArgumentException если пользователь не найден
     */
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return UserMapper.toFullUserDTO(user);
    }
    
    /**
     * Получает пользователя по имени пользователя.
     *
     * @param username имя пользователя
     * @return объект DTO пользователя
     * @throws IllegalArgumentException если пользователь не найден
     */
    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return UserMapper.toFullUserDTO(user);
    }
    
    /**
     * Ищет пользователей по запросу.
     *
     * @param query поисковый запрос
     * @return список DTO найденных пользователей
     */
    public List<UserDTO> searchUsers(String query) {
        List<User> users = userRepository.searchUsers(query);
        return users.stream()
                .map(UserMapper::toFullUserDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Ищет пользователей с расширенными фильтрами и пагинацией.
     *
     * @param query поисковый запрос
     * @param role фильтр по роли
     * @param pageable параметры пагинации
     * @return страница пользователей
     */
    public Page<User> searchUsers(String query, String role, Pageable pageable) {
        return userRepository.findAll(buildSearchSpecification(query, role), pageable);
    }
    
    /**
     * Находит пользователя по идентификатору.
     *
     * @param id идентификатор пользователя
     * @return объект пользователя или null, если не найден
     */
    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    /**
     * Находит пользователя по имени пользователя.
     *
     * @param username имя пользователя
     * @return объект пользователя или null, если не найден
     */
    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }
    
    private Specification<User> buildSearchSpecification(String query, String role) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (query != null && !query.trim().isEmpty()) {
                String likePattern = "%" + query.toLowerCase() + "%";
                predicates.add(
                    criteriaBuilder.like(
                        criteriaBuilder.lower(root.get("username")), 
                        likePattern
                    )
                );
            }
            
            if (role != null && !role.trim().isEmpty()) {
                try {
                    Role roleEnum = Role.valueOf(role.toUpperCase());
                    predicates.add(criteriaBuilder.equal(root.get("role"), roleEnum));
                } catch (IllegalArgumentException e) {
                    log.warn("Unknown role filter provided: {}", role);
                }
            }
            
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
    
    /**
     * Получает топ-10 читателей по количеству прочитанных глав.
     *
     * @return список DTO топ-читателей
     */
    public List<UserDTO> getTopReaders() {
        List<User> topReaders = userRepository.findTopReaders();
        return topReaders.stream()
                .limit(10)
                .map(UserMapper::toFullUserDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Обновляет профиль пользователя.
     *
     * @param username имя пользователя
     * @param updateRequest данные для обновления
     * @return объект DTO обновленного пользователя
     * @throws IllegalArgumentException если пользователь не найден
     */
    public UserDTO updateUserProfile(String username, UserDTO updateRequest) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (updateRequest.getDisplayName() != null) {
            user.setDisplayName(updateRequest.getDisplayName());
        }
        
        if (updateRequest.getBio() != null) {
            user.setBio(updateRequest.getBio());
        }
        
        if (updateRequest.getAvatar() != null) {
            user.setAvatar(updateRequest.getAvatar());
        }
        
        userRepository.save(user);
        log.info("User profile updated: {}", username);
        
        return UserMapper.toFullUserDTO(user);
    }
    
    /**
     * Обновляет статистику чтения пользователя.
     * Увеличивает счетчик прочитанных глав, если текущее значение больше сохраненного.
     *
     * @param username имя пользователя
     * @throws IllegalArgumentException если пользователь не найден
     */
    public void updateReadingStats(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Long currentCompletedChapters = readingProgressRepository.countCompletedChaptersByUser(user.getId());
        
        if (currentCompletedChapters.intValue() > user.getChaptersReadCount()) {
            user.setChaptersReadCount(currentCompletedChapters.intValue());
            userRepository.save(user);
        }
    }
    
    /**
     * Увеличивает счетчик прочитанных глав пользователя на 1.
     *
     * @param username имя пользователя
     * @throws IllegalArgumentException если пользователь не найден
     */
    public void incrementChapterCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.setChaptersReadCount(user.getChaptersReadCount() + 1);
        userRepository.save(user);
    }

    public void banOrUnBanUser(Long adminId, Long userId, String reason) {
        // Legacy toggle kept for backward compatibility: if user currently NONE => PERM ban, otherwise UNBAN
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        boolean currentlyBanned = user.getBanType() != null && user.getBanType() != BanType.NONE;
        AdminActionLog logEntry;
        if (currentlyBanned) {
            // Unban
            user.setBanType(BanType.NONE);
            user.setBanExpiresAt(null);
            user.setIsEnabled(true);
            user.setTokenVersion(user.getTokenVersion() + 1); // invalidate sessions
            logEntry = AdminActionLog.builder()
                    .adminId(adminId)
                    .userId(userId)
                    .adminName(admin.getUsername())
                    .targetUserName(user.getUsername())
                    .actionType(ActionType.UNBAN_USER)
                    .description("The administrator " + admin.getUsername() + " unbanned the user " + user.getUsername())
                    .reason(reason)
                    .timestamp(LocalDateTime.now(ZoneOffset.UTC))
                    .build();
        } else {
            // Apply PERM ban by default (legacy behavior)
            user.setBanType(BanType.PERM);
            user.setBanExpiresAt(null);
            user.setIsEnabled(false);
            user.setTokenVersion(user.getTokenVersion() + 1);
            logEntry = AdminActionLog.builder()
                    .adminId(adminId)
                    .userId(userId)
                    .adminName(admin.getUsername())
                    .targetUserName(user.getUsername())
                    .actionType(ActionType.BAN_USER)
                    .description("The administrator " + admin.getUsername() + " banned the user " + user.getUsername())
                    .reason(reason)
                    .timestamp(LocalDateTime.now(ZoneOffset.UTC))
                    .build();
        }

        adminActionLogRepository.save(logEntry);
        userRepository.save(user);
        log.info("Legacy ban toggle applied for user {} -> banType {} tokenVersion {}", user.getUsername(), user.getBanType(), user.getTokenVersion());
    }

    public void applyBanAction(Long adminId, Long userId, BanType banType, LocalDateTime expiresAt, String reason, String reasonCode, String reasonDetails, String metaJson, String diffJson) {
        User user = userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));
        User admin = userRepository.findById(adminId).orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        if (banType == null) banType = BanType.NONE;

        if (banType == BanType.TEMP) {
            if (expiresAt == null || expiresAt.isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("TEMP ban requires future expiry");
            }
        } else {
            expiresAt = null; // only TEMP uses expiry
        }

        // Determine account enabled status: PERM disables, TEMP disables until expiry, SHADOW stays enabled, NONE enabled
        boolean enableAccount;
        if (banType == BanType.PERM) {
            enableAccount = false;
        } else if (banType == BanType.TEMP) {
            enableAccount = false; // treated as disabled for auth
        } else if (banType == BanType.SHADOW) {
            enableAccount = true; // user believes active
        } else { // NONE
            enableAccount = true;
        }

        user.setBanType(banType);
        user.setBanExpiresAt(expiresAt);
        user.setIsEnabled(enableAccount);
        user.setTokenVersion(user.getTokenVersion() + 1); // force reauth after moderation action

        ActionType at = (banType == BanType.NONE) ? ActionType.UNBAN_USER : ActionType.BAN_USER;

        AdminActionLog logEntry = AdminActionLog.builder()
                .adminId(adminId)
                .userId(userId)
                .adminName(admin.getUsername())
                .targetUserName(user.getUsername())
                .actionType(at)
                .description("Ban action set to " + banType + " by admin " + admin.getUsername())
                .reason(reason)
                .reasonCode(reasonCode)
                .reasonDetails(reasonDetails)
                .metaJson(metaJson)
                .diffJson(diffJson)
                .timestamp(LocalDateTime.now(ZoneOffset.UTC))
                .build();

        adminActionLogRepository.save(logEntry);
        userRepository.save(user);
        log.info("Applied ban action {} to user {} (expiresAt={}, tokenVersion={})", banType, user.getUsername(), expiresAt, user.getTokenVersion());
    }

    public long getTotalUsersCount() {
        return userRepository.count();
    }

    public UserStatsDTO getUserStats() {
        long total = userRepository.count();
        long translators = userRepository.countByRole(Role.TRANSLATOR);
        long admins = userRepository.countByRole(Role.ADMIN);
        long banned = userRepository.countByBanTypeNot(BanType.NONE);
        long active7 = userRepository.countActiveSince(LocalDateTime.now().minusDays(7));
        return UserStatsDTO.builder()
                .totalUsers(total)
                .translators(translators)
                .admins(admins)
                .banned(banned)
                .activeLast7Days(active7)
                .build();
    }

    public List<UserDTO> getUsersPage(int page, int size) {
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        Page<User> userPage = userRepository.findAll(pageable);
        return userPage.stream()
                .map(UserMapper::toFullUserDTO)
                .collect(Collectors.toList());
    }

    /**
     * Пример использования ниже:
     * Получение страницы пользователей с сортировкой.
     * Пример запроса к контроллеру: GET /api/auth/users?page=0&size=20&sortBy=username&sortOrder=asc
     */
    public Page<UserDTO> getUsersSortablePage(int page, int size, String sortBy, String sortOrder, String query, String role) {
         if (sortBy == null || sortBy.isBlank()) {
             sortBy = "username";
         }
         if (sortOrder == null || sortOrder.isBlank()) {
             sortOrder = "asc";
         }

         Sort.Direction direction = Sort.Direction.fromString(sortOrder);
         PageRequest pageRequest = PageRequest.of(page, size, Sort.by(direction, sortBy));

         return searchUsers(query, role, pageRequest).map(UserMapper::toFullUserDTO);
     }

    public void updateUserRole(Long adminId, Long userId, String role, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        try {
            Role roleEnum = Role.valueOf(role.toUpperCase());
            user.setRole(roleEnum);
            userRepository.save(user);

            AdminActionLog logEntry = AdminActionLog.builder()
                    .adminId(adminId)
                    .userId(userId)
                    .adminName(admin.getUsername())
                    .actionType(ActionType.CHANGE_ROLE)
                    .targetUserName(user.getUsername())
                    .description("Changed role of user " + user.getUsername() + " to " + role)
                    .reason(reason)
                    .timestamp(LocalDateTime.now())
                    .build();
            adminActionLogRepository.save(logEntry);


            log.info("Updated role for user: {} to {}", user.getUsername(), roleEnum);
        } catch (IllegalArgumentException e) {
            log.error("Invalid role provided: {}", role);
            throw new IllegalArgumentException("Invalid role: " + role);
        }
     }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email.toLowerCase());
    }
}
