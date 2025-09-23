package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import shadowshift.studio.authservice.entity.AdminActionLog;
import shadowshift.studio.authservice.entity.ActionType;

import java.util.List;

public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, Long> {

    @Query("SELECT a FROM AdminActionLog a")
    List<AdminActionLog> findAllLogs();

    @Query("SELECT a FROM AdminActionLog a WHERE (:adminPattern IS NULL OR a.adminName LIKE :adminPattern) " +
        "AND (:targetPattern IS NULL OR a.targetUserName LIKE :targetPattern) " +
        "AND (:actionType IS NULL OR a.actionType = :actionType)")
    Page<AdminActionLog> searchLogs(@Param("adminPattern") String adminPattern,
                                    @Param("targetPattern") String targetPattern,
                                    @Param("actionType") ActionType actionType,
                                    Pageable pageable);
}
