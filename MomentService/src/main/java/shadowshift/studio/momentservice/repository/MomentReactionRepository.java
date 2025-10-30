package shadowshift.studio.momentservice.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shadowshift.studio.momentservice.entity.MomentReaction;
import shadowshift.studio.momentservice.entity.ReactionType;

@Repository
public interface MomentReactionRepository extends JpaRepository<MomentReaction, Long> {

    Optional<MomentReaction> findByMomentIdAndUserId(Long momentId, Long userId);

    long countByMomentIdAndReaction(Long momentId, ReactionType reaction);
}
