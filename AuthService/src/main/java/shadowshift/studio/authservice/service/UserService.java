package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.entity.Role;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.repository.ReadingProgressRepository;
import shadowshift.studio.authservice.repository.UserRepository;

import jakarta.persistence.criteria.Predicate;
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
        
        return convertToDTO(user);
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
        
        return convertToDTO(user);
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
                .map(this::convertToDTO)
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
                .map(this::convertToDTO)
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
        
        return convertToDTO(user);
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
    
    /**
     * Конвертирует объект User в UserDTO.
     *
     * @param user объект пользователя
     * @return объект DTO пользователя
     */
    public UserDTO convertToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatar())
                .bio(user.getBio())
                .role(user.getRole())
                .isEnabled(user.getIsEnabled())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .chaptersReadCount(user.getChaptersReadCount())
                .likesGivenCount(user.getLikesGivenCount())
                .commentsCount(user.getCommentsCount())
                .build();
    }
}
