package shadowshift.studio.messageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shadowshift.studio.messageservice.entity.ChannelReadMarkerEntity;

import java.util.List;

public interface ChannelReadMarkerRepository extends JpaRepository<ChannelReadMarkerEntity, ChannelReadMarkerEntity.ChannelReadMarkerId> {

    List<ChannelReadMarkerEntity> findByIdUserId(Long userId);
}
