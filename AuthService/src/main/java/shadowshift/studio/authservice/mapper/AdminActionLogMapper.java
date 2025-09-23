package shadowshift.studio.authservice.mapper;

import shadowshift.studio.authservice.dto.AdminActionLogDTO;
import shadowshift.studio.authservice.entity.AdminActionLog;

import java.util.ArrayList;
import java.util.List;

public class AdminActionLogMapper {

    private AdminActionLogMapper() {}

    public static AdminActionLogDTO toAdminActionLogDTO(AdminActionLog adminActionLog) {
        if (adminActionLog == null) return null;

        return AdminActionLogDTO.builder()
                .id(adminActionLog.getId())
                .adminName(adminActionLog.getAdminName())
                .targetUserName(adminActionLog.getTargetUserName())
                .actionType(adminActionLog.getActionType())
                .description(adminActionLog.getDescription())
                .reason(adminActionLog.getReason())
        .reasonCode(adminActionLog.getReasonCode())
        .reasonDetails(adminActionLog.getReasonDetails())
        .metaJson(adminActionLog.getMetaJson())
        .diffJson(adminActionLog.getDiffJson())
                .timestamp(adminActionLog.getTimestamp())
                .build();
    }

    public static AdminActionLogDTO toFullAdminActionLogDTO(AdminActionLog adminActionLog) {
        if (adminActionLog == null) return null;

        return AdminActionLogDTO.builder()
                .id(adminActionLog.getId())
                .adminId(adminActionLog.getAdminId())
                .userId(adminActionLog.getUserId())
                .adminName(adminActionLog.getAdminName())
                .targetUserName(adminActionLog.getTargetUserName())
                .targetUserName(adminActionLog.getTargetUserName())
                .description(adminActionLog.getDescription())
                .reason(adminActionLog.getReason())
        .reasonCode(adminActionLog.getReasonCode())
        .reasonDetails(adminActionLog.getReasonDetails())
        .metaJson(adminActionLog.getMetaJson())
        .diffJson(adminActionLog.getDiffJson())
                .timestamp(adminActionLog.getTimestamp())
                .build();
    }

    public static List<AdminActionLogDTO> toAdminActionLogDTOs(List<AdminActionLog> adminActionLogs) {
        List<AdminActionLogDTO> adminActionLogDTOS = new ArrayList<>();

        for (AdminActionLog adminActionLog : adminActionLogs) {
            adminActionLogDTOS.add(toAdminActionLogDTO(adminActionLog));
        }
        return adminActionLogDTOS;
    }
}
