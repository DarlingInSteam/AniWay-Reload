package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import shadowshift.studio.authservice.entity.AdminActionLog;
import shadowshift.studio.authservice.entity.ActionType;

import java.util.List;

public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, Long> {

    @Query("SELECT a FROM AdminActionLog a")
    List<AdminActionLog> findAllLogs();

    @Query("SELECT a FROM AdminActionLog a WHERE (:adminName IS NULL OR LOWER(a.adminName) LIKE LOWER(CONCAT('%',:adminName,'%'))) " +
        "AND (:targetName IS NULL OR LOWER(a.targetUserName) LIKE LOWER(CONCAT('%',:targetName,'%'))) " +
        "AND (:actionType IS NULL OR a.actionType = :actionType)")
    Page<AdminActionLog> searchLogs(String adminName, String targetName, ActionType actionType, Pageable pageable);
}
