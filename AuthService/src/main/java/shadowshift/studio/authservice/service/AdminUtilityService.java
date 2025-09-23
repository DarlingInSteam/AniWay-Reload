package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.AdminActionLogDTO;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.dto.UserStatsDTO;
import shadowshift.studio.authservice.entity.AdminActionLog;
import shadowshift.studio.authservice.mapper.AdminActionLogMapper;
import shadowshift.studio.authservice.repository.AdminActionLogRepository;
import shadowshift.studio.authservice.entity.BanType;
import shadowshift.studio.authservice.entity.ActionType;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;

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

    public UserStatsDTO getUserStats() { return userService.getUserStats(); }

    public Page<UserDTO> getUsersSortablePage(int page, int size, String sortBy, String sortOrder, String query, String role) {
        return userService.getUsersSortablePage(page, size, sortBy, sortOrder, query, role);
    }

    public void updateUserRole(Long adminId, Long userId, String reason, String role) { userService.updateUserRole(adminId, userId, role, reason); }

    public void applyBan(Long adminId, Long userId, BanType banType, LocalDateTime expiresAt, String reason, String reasonCode, String reasonDetails, String metaJson, String diffJson) {
        userService.applyBanAction(adminId, userId, banType, expiresAt, reason, reasonCode, reasonDetails, metaJson, diffJson);
    }

    public List<AdminActionLogDTO> getLogs(){

        List<AdminActionLog> logs = adminActionLogRepository.findAllLogs();
        return logs.stream()
                .map(AdminActionLogMapper::toAdminActionLogDTO)
                .collect(Collectors.toList());

    }

    public Page<AdminActionLogDTO> getLogsPaged(int page, int size, String sortBy, String sortOrder, String admin, String target, String action) {
        if (sortBy == null || sortBy.isBlank()) sortBy = "timestamp";
        if (sortOrder == null || sortOrder.isBlank()) sortOrder = "desc";
        Sort.Direction dir = Sort.Direction.fromString(sortOrder);
        PageRequest pr = PageRequest.of(page, size, Sort.by(dir, sortBy));
        ActionType at = null;
        if (action != null && !action.isBlank() && !action.equalsIgnoreCase("all")) {
            try { at = ActionType.valueOf(action); } catch (Exception ignored) {}
        }
        var result = adminActionLogRepository.searchLogs(
                (admin==null||admin.isBlank())?null:admin,
                (target==null||target.isBlank())?null:target,
                at,
                pr
        );
        return result.map(AdminActionLogMapper::toAdminActionLogDTO);
    }
}
