package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.*;
import shadowshift.studio.authservice.entity.Role;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.mapper.UserMapper;
import shadowshift.studio.authservice.repository.UserRepository;
import shadowshift.studio.authservice.repository.EmailVerificationRepository;

import java.time.LocalDateTime;

/**
 * Сервис для управления аутентификацией и авторизацией пользователей.
 * Предоставляет функциональность регистрации, входа в систему,
 * валидации токенов и получения информации о текущем пользователе.
 *
 * @author ShadowShiftStudio
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    
    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailVerificationService emailVerificationService;
    
    /**
     * Регистрирует нового пользователя в системе.
     * Проверяет уникальность имени пользователя и email, создает нового пользователя
     * с закодированным паролем и генерирует JWT токен.
     *
     * @param request объект запроса на регистрацию
     * @return объект ответа аутентификации с токеном и данными пользователя
     * @throws IllegalArgumentException если имя пользователя или email уже существуют
     */
    public AuthResponse register(RegisterRequest request) {
        // Enforce email verification
        if (request.getVerificationToken() == null || request.getVerificationToken().isBlank()) {
            throw new IllegalArgumentException("EMAIL_NOT_VERIFIED");
        }

    String verifiedEmail = emailVerificationService.consumeVerificationToken(request.getVerificationToken(), shadowshift.studio.authservice.entity.EmailVerification.Purpose.REGISTRATION);
        if (!verifiedEmail.equalsIgnoreCase(request.getEmail())) {
            throw new IllegalArgumentException("EMAIL_MISMATCH");
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        
        var user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .displayName(request.getDisplayName() != null ? request.getDisplayName() : request.getUsername())
                .role(Role.USER)
                .isEnabled(true)
                .isAccountNonExpired(true)
                .isAccountNonLocked(true)
                .isCredentialsNonExpired(true)
                .build();
        
        userRepository.save(user);

    emailVerificationService.markEmailUsed(verifiedEmail);
        
        log.info("User registered successfully: {}", user.getUsername());

    // UserDTO userDTO = UserMapper.toUserDTO(user); // Removed unused variable
        
    var jwtToken = jwtService.generateToken(user);

        return AuthResponse.of(jwtToken, UserMapper.toFullUserDTO(user));
    }
    
    /**
     * Аутентифицирует пользователя по имени пользователя и паролю.
     * Обновляет время последнего входа и генерирует новый JWT токен.
     *
     * @param request объект запроса на вход
     * @return объект ответа аутентификации с токеном и данными пользователя
     * @throws IllegalArgumentException если пользователь не найден
     */
    public AuthResponse authenticate(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );
        
        var user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        
        log.info("User authenticated successfully: {}", user.getUsername());

    // UserDTO userDTO = UserMapper.toUserDTO(user); // Removed unused variable

    var jwtToken = jwtService.generateToken(user);

        return AuthResponse.of(jwtToken, UserMapper.toFullUserDTO(user));
    }

    // Credentials check only (for two-step login) without issuing token yet
    public void authenticateCredentialsOnly(String usernameOrEmail, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        usernameOrEmail,
                        password
                )
        );
    }

    // Issue final JWT based on previously verified verificationToken purpose LOGIN
    public AuthResponse issueTokenFromVerificationToken(String verificationToken, shadowshift.studio.authservice.entity.EmailVerification.Purpose purpose) {
        if (purpose != shadowshift.studio.authservice.entity.EmailVerification.Purpose.LOGIN) {
            throw new IllegalArgumentException("Unsupported purpose for token issuance: " + purpose);
        }
        // Find EmailVerification by token
    var ev = emailVerificationRepository.findFirstByVerificationTokenAndStatusAndPurpose(verificationToken, shadowshift.studio.authservice.entity.EmailVerification.Status.VERIFIED, purpose)
        .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification token"));
    var user = userRepository.findByEmail(ev.getEmail()).orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setLastLogin(java.time.LocalDateTime.now());
        userRepository.save(user);
    var jwt = jwtService.generateToken(user);
    return AuthResponse.of(jwt, UserMapper.toFullUserDTO(user));
    }
    
    /**
     * Получает данные текущего пользователя по имени пользователя.
     *
     * @param username имя пользователя
     * @return объект DTO с данными пользователя
     * @throws IllegalArgumentException если пользователь не найден
     */
    public UserDTO getCurrentUser(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        
        return UserMapper.toFullUserDTO(user);
    }
    
    /**
     * Валидирует JWT токен и возвращает соответствующего пользователя.
     * Извлекает имя пользователя из токена, проверяет его валидность
     * и возвращает пользователя, если токен действителен.
     *
     * @param token JWT токен для валидации
     * @return объект пользователя, если токен валиден, иначе null
     */
    public User validateTokenAndGetUser(String token) {
        try {
            String username = jwtService.extractUsername(token);
            User user = userRepository.findByUsername(username).orElse(null);
            
            if (user != null && jwtService.isTokenValid(token, user)) {
                return user;
            }
            
            return null;
            
        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return null;
        }
    }

    // Password reset using previously verified token (PASSWORD_RESET purpose)
    public AuthResponse resetPasswordWithToken(String verificationToken, String newPassword) {
        String email = emailVerificationService.consumeVerificationToken(verificationToken, shadowshift.studio.authservice.entity.EmailVerification.Purpose.PASSWORD_RESET);
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("USER_NOT_FOUND");
        }
        var user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        log.info("Password reset for user {}", user.getUsername());
        var jwtToken = jwtService.generateToken(user);
        return AuthResponse.of(jwtToken, UserMapper.toFullUserDTO(user));
    }

    // Authenticated password change
    public void changePassword(String username, String currentPassword, String newPassword) {
        var user = userRepository.findByUsername(username).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("BAD_CREDENTIALS");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed for user {}", username);
    }

    // Account deletion after email confirmation token (ACCOUNT_DELETION purpose)
    public void deleteAccountWithToken(String verificationToken) {
        String email = emailVerificationService.consumeVerificationToken(verificationToken, shadowshift.studio.authservice.entity.EmailVerification.Purpose.ACCOUNT_DELETION);
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new IllegalArgumentException("USER_NOT_FOUND");
        }
        var user = userOpt.get();
        userRepository.delete(user);
        log.info("Account deleted for user {}", user.getUsername());
    }
}
