package shadowshift.studio.momentservice.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.momentservice.entity.MomentReaction;
import shadowshift.studio.momentservice.entity.ReactionType;

@Repository
public interface MomentReactionRepository extends JpaRepository<MomentReaction, Long> {

    Optional<MomentReaction> findByMomentIdAndUserId(Long momentId, Long userId);

    long countByMomentIdAndReaction(Long momentId, ReactionType reaction);

    List<MomentReaction> findByUserIdAndMomentIdIn(Long userId, List<Long> momentIds);

    @Query("select r.moment.id as momentId, r.reaction as reaction from MomentReaction r where r.userId = :userId and r.moment.id in :momentIds")
    List<ReactionView> findReactionViews(@Param("userId") Long userId, @Param("momentIds") List<Long> momentIds);

    interface ReactionView {
        Long getMomentId();
        ReactionType getReaction();
    }
}
