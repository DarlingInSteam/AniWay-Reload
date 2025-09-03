package shadowshift.studio.commentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.commentservice.dto.UserInfoDTO;

/**
 * Сервис для взаимодействия с AuthService
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final RestTemplate restTemplate;
    
    private static final String AUTH_SERVICE_URL = "http://auth-service:8085/api/auth";

    /**
     * Получение информации о пользователе по ID
     */
    public UserInfoDTO getUserInfo(Long userId) {
        try {
            log.debug("Fetching user info for user ID: {}", userId);
            
            String url = AUTH_SERVICE_URL + "/users/" + userId + "/public";
            ResponseEntity<UserInfoDTO> response = restTemplate.getForEntity(url, UserInfoDTO.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.debug("Successfully fetched user info for user ID: {}", userId);
                return response.getBody();
            } else {
                log.warn("Failed to fetch user info for user ID: {}, status: {}", userId, response.getStatusCode());
                return null;
            }
        } catch (Exception e) {
            log.error("Error fetching user info for user ID: {}", userId, e);
            return null;
        }
    }

    /**
     * Проверка существования пользователя
     */
    public boolean userExists(Long userId) {
        try {
            UserInfoDTO userInfo = getUserInfo(userId);
            return userInfo != null;
        } catch (Exception e) {
            log.error("Error checking if user exists: {}", userId, e);
            return false;
        }
    }
}
