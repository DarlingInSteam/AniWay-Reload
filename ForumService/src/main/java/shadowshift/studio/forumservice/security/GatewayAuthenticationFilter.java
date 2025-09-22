package shadowshift.studio.forumservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * Читает заголовки, проставленные Gateway (JwtAuthFilter): X-User-Id, X-User-Role.
 * Если присутствуют — создаёт аутентификацию в SecurityContext.
 * Предполагается, что сам JWT уже проверен на уровне Gateway.
 */
public class GatewayAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String userIdHeader = request.getHeader("X-User-Id");
            String roleHeader = request.getHeader("X-User-Role");
            if (userIdHeader != null && !userIdHeader.isBlank() && roleHeader != null) {
                Long userId = parseLongSafe(userIdHeader);
                List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + roleHeader));
                AuthUserPrincipal principal = new AuthUserPrincipal(userId, roleHeader);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        principal, null, authorities);
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        filterChain.doFilter(request, response);
    }

    private Long parseLongSafe(String v) {
        try { return Long.valueOf(v); } catch (NumberFormatException e) { return null; }
    }

    public record AuthUserPrincipal(Long id, String role) {}
}
