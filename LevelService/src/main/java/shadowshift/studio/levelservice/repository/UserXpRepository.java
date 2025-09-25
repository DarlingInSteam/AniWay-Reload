package shadowshift.studio.levelservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shadowshift.studio.levelservice.entity.UserXp;

public interface UserXpRepository extends JpaRepository<UserXp, Long> {
}
