package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.AdminActionLogDTO;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.entity.AdminActionLog;
import shadowshift.studio.authservice.mapper.AdminActionLogMapper;
import shadowshift.studio.authservice.repository.AdminActionLogRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUtilityService {
    private final UserService userService;
    private final AdminActionLogRepository adminActionLogRepository;

    public void banOrUnBanUserById(Long adminId, Long userId, String reason) {
        userService.banOrUnBanUser(adminId, userId, reason);
    }

    public List<UserDTO> getUsersPage(int page, int size) {
        return userService.getUsersPage(page, size);
    }

    public long getTotalUsersCount() {
        return userService.getTotalUsersCount();
    }

    public Page<UserDTO> getUsersSortablePage(int page, int size, String sortBy, String sortOrder, String query, String role) {
        return userService.getUsersSortablePage(page, size, sortBy, sortOrder, query, role);
    }

    public void updateUserRole(Long adminId, Long userId, String reason, String role) { userService.updateUserRole(adminId, userId, role, reason); }

    public List<AdminActionLogDTO> getLogs(){

        List<AdminActionLog> logs = adminActionLogRepository.findAllLogs();
        return logs.stream()
                .map(AdminActionLogMapper::toAdminActionLogDTO)
                .collect(Collectors.toList());
    }
}
