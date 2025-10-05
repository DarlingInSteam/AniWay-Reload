package shadowshift.studio.friendservice.security;

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
import java.util.ArrayList;
import java.util.List;

/**
 * Reads gateway-provided headers (X-User-Id, X-User-Role) and injects principal into the security context.
 * Assumes JWT validation already happened upstream.
 */
public class GatewayAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String userIdHeader = request.getHeader("X-User-Id");
            String roleHeader = request.getHeader("X-User-Role");
            if (userIdHeader != null && !userIdHeader.isBlank() && roleHeader != null && !roleHeader.isBlank()) {
                Long userId = parseLongSafe(userIdHeader);
                if (userId != null && userId > 0) {
                    List<GrantedAuthority> authorities = toAuthorities(roleHeader);
                    AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(userId, roleHeader.trim());
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            authorities
                    );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private Long parseLongSafe(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private List<GrantedAuthority> toAuthorities(String roleHeader) {
        String normalized = roleHeader.trim().toUpperCase();
        List<GrantedAuthority> authorities = new ArrayList<>();
        switch (normalized) {
            case "ADMIN" -> {
                authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                authorities.add(new SimpleGrantedAuthority("ROLE_MODERATOR"));
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            }
            case "MODERATOR" -> {
                authorities.add(new SimpleGrantedAuthority("ROLE_MODERATOR"));
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            }
            case "USER" -> authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            default -> authorities.add(new SimpleGrantedAuthority("ROLE_" + normalized));
        }
        return authorities;
    }

    public record AuthenticatedUserPrincipal(Long id, String role) {}
}
