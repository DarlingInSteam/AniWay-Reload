package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUtilityService {
    private final UserRepository userRepository;
    private final UserService userService;

    public void banOrUnBanUserById(Long userId) {
        userService.banOrUnBanUser(userId);
    }

    public List<UserDTO> getUsersPage(int page, int size) {
        return userService.getUsersPage(page, size);
    }

    public long getTotalUsersCount() {
        return userService.getTotalUsersCount();
    }

    public List<UserDTO> getUsersSortablePage(int page, int size, String sortBy, String sortOrder) {
        return userService.getUsersSortablePage(page, size, sortBy, sortOrder);
    }
}
