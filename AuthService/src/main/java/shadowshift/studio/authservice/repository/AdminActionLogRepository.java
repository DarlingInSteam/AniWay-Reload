package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import shadowshift.studio.authservice.entity.AdminActionLog;

import java.util.List;

public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, Long> {

    @Query("SELECT a FROM AdminActionLog a")
    List<AdminActionLog> findAllLogs();
}
