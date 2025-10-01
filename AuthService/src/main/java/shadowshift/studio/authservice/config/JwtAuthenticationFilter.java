package shadowshift.studio.authservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import shadowshift.studio.authservice.service.JwtService;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        log.debug("JWT Filter: Processing request to {}", request.getRequestURI());
        
        // Пропускаем публичные auth endpoints (расширенный список)
        String path = request.getServletPath();
        if (isPublicAuthPath(path)) {
            log.trace("JWT Filter: Skipping public auth endpoint {}", path);
            filterChain.doFilter(request, response);
            return;
        }
        
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;
        
        log.debug("JWT Filter: Authorization header = {}", authHeader);
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("JWT Filter: No valid authorization header found");
            filterChain.doFilter(request, response);
            return;
        }
        
        jwt = authHeader.substring(7);
        username = jwtService.extractUsername(jwt);
        
        log.debug("JWT Filter: Extracted username = {}", username);
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (username != null && authentication == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
            
            if (jwtService.isTokenValid(jwt, userDetails)) {
                log.debug("JWT Filter: Token is valid, setting authentication");
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            } else {
                log.debug("JWT Filter: Token is invalid");
            }
        } else {
            log.debug("JWT Filter: Username is null or authentication already set");
        }
        
        filterChain.doFilter(request, response);
    }

    /**
     * Проверка принадлежности пути к публичным auth эндпоинтам.
     * Важно держать синхронизацию со списком в SecurityConfig.requestMatchers(...).permitAll().
     */
    private boolean isPublicAuthPath(String path) {
        // базовые
        if (path.equals("/api/auth/login") || path.equals("/api/auth/register")) return true;
        // email verification (registration)
        if (path.equals("/api/auth/email/request-code") || path.equals("/api/auth/email/verify-code")) return true;
        // password reset
        if (path.equals("/api/auth/password/reset/request-code") || path.equals("/api/auth/password/reset/verify-code") || path.equals("/api/auth/password/reset/perform")) return true;
        // two-step login dedicated endpoints
        if (path.equals("/api/auth/login/request-code") || path.equals("/api/auth/login/verify-code")) return true;
        return false;
    }
}
