package shadowshift.studio.commentservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Фильтр для аутентификации через JWT токены
 */
@Component
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Value("${auth.service.url:http://auth-service:8085}")
    private String authServiceUrl;
    
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String token = getTokenFromRequest(request);
        log.debug("JWT Filter - Request: {} {}, Token present: {}", 
                request.getMethod(), request.getRequestURI(), token != null);
        
        if (token != null) {
            log.debug("JWT Filter - Token: {}", token.substring(0, Math.min(20, token.length())) + "...");
            
            // Вместо локальной валидации, обращаемся к AuthService
            UserValidationResponse validationResponse = validateTokenWithAuthService(token);
            
            if (validationResponse != null && validationResponse.isValid()) {
                log.debug("JWT Filter - Valid token for user: {} (ID: {}), role: {}", 
                    validationResponse.getUsername(), validationResponse.getUserId(), validationResponse.getRole());
                
                // Создаем аутентификацию
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        validationResponse.getUsername(), 
                        validationResponse.getUserId(), 
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + validationResponse.getRole()))
                    );
                
                // Устанавливаем дополнительные детали
                UserPrincipal userPrincipal = new UserPrincipal(
                    validationResponse.getUserId(), 
                    validationResponse.getUsername(), 
                    validationResponse.getRole()
                );
                authentication.setDetails(userPrincipal);
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("JWT Filter - Authentication set for user: {}", validationResponse.getUsername());
            } else {
                log.warn("JWT Filter - Invalid token");
            }
        } else {
            log.debug("JWT Filter - No token found in request");
        }
        
        filterChain.doFilter(request, response);
    }

    private UserValidationResponse validateTokenWithAuthService(String token) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + token);
            
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<UserValidationResponse> response = restTemplate.exchange(
                authServiceUrl + "/api/auth/validate",
                HttpMethod.POST,
                entity,
                UserValidationResponse.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to validate token with AuthService: {}", e.getMessage());
            return null;
        }
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
