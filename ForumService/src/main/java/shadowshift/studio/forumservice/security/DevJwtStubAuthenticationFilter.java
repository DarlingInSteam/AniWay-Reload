package shadowshift.studio.forumservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Временный dev-фильтр: если есть заголовок Authorization: Bearer <token>,
 * то считаем пользователя аутентифицированным с ролью USER и userId=1.
 * Заменить на полноценную JWT валидацию позже.
 */
public class DevJwtStubAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            String auth = request.getHeader("Authorization");
            if (auth != null && auth.startsWith("Bearer ")) {
                // Заглушка: userId=1, username="dev-user"
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        new DevUserPrincipal(1L, "dev-user"),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }

    public record DevUserPrincipal(Long id, String username) {}
}
