package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated statistics for admin dashboard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatsDTO {
    private long totalUsers;
    private long translators;
    private long admins;
    private long banned; // users with banType != NONE
    private long activeLast7Days; // lastLogin within 7 days OR created within 7 days if never logged in
}
