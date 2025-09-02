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
import shadowshift.studio.authservice.repository.UserRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    
    public AuthResponse register(RegisterRequest request) {
        // Check if user already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        
        // Create new user
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
        
        log.info("User registered successfully: {}", user.getUsername());
        
        var jwtToken = jwtService.generateToken(user);
        return AuthResponse.of(jwtToken, userService.convertToDTO(user));
    }
    
    public AuthResponse authenticate(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );
        
        var user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Update last login
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        
        log.info("User authenticated successfully: {}", user.getUsername());
        
        var jwtToken = jwtService.generateToken(user);
        return AuthResponse.of(jwtToken, userService.convertToDTO(user));
    }
    
    public UserDTO getCurrentUser(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return userService.convertToDTO(user);
    }
}
