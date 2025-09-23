package shadowshift.studio.forumservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lightweight client to AuthService for fetching user display names & avatars.
 * Uses in-memory cache with short TTL to avoid N+1 calls under load.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserDirectoryClient {

    private final WebClient.Builder webClientBuilder;

    @Value("${auth-service.base-url:http://auth-service:8080}")
    private String authServiceBaseUrl;

    // Simple cache (id -> entry)
    private final Map<Long, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final Duration TTL = Duration.ofMinutes(5);

    public record UserBasic(Long id, String displayName, String username, String avatar) {}
    private record CacheEntry(UserBasic user, long expiresAt) {}

    public Map<Long, UserBasic> fetchUsers(Collection<Long> ids) {
        List<Long> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) return Collections.emptyMap();

        long now = System.currentTimeMillis();
        List<Long> toLoad = new ArrayList<>();
        Map<Long, UserBasic> result = new HashMap<>();
        for (Long id : distinct) {
            CacheEntry ce = cache.get(id);
            if (ce != null && ce.expiresAt > now) {
                result.put(id, ce.user);
            } else {
                toLoad.add(id);
            }
        }

        // No batch endpoint currently present; fall back to sequential fetch.
        for (Long id : toLoad) {
            try {
                UserBasic u = webClientBuilder.build()
                        .get()
                        .uri(authServiceBaseUrl + "/api/users/" + id)
                        .accept(MediaType.APPLICATION_JSON)
                        .retrieve()
                        .bodyToMono(AuthUserDTO.class)
                        .timeout(Duration.ofSeconds(2))
                        .map(dto -> new UserBasic(dto.id, dto.displayName != null && !dto.displayName.isBlank() ? dto.displayName : dto.username, dto.username, dto.avatar))
                        .onErrorResume(ex -> { log.debug("Failed to fetch user {}: {}", id, ex.getMessage()); return reactor.core.publisher.Mono.empty(); })
                        .block();
                if (u != null) {
                    cache.put(id, new CacheEntry(u, System.currentTimeMillis() + TTL.toMillis()));
                    result.put(id, u);
                }
            } catch (Exception e) {
                log.debug("Error fetching user {}: {}", id, e.getMessage());
            }
        }
        return result;
    }

    // Minimal projection of AuthService user JSON
    private static class AuthUserDTO { public Long id; public String username; public String displayName; public String avatar; }

    /** Simple slug combining id and sanitized display/username */
    public static String buildProfileSlug(UserBasic user) {
        String base = user.displayName() != null ? user.displayName() : (user.username() != null ? user.username() : ("user" + user.id()));
        String sanitized = base.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (sanitized.length() > 40) sanitized = sanitized.substring(0, 40);
        return user.id() + "--" + sanitized;
    }
}
