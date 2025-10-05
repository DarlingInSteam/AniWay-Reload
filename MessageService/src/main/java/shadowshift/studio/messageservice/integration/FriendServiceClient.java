package shadowshift.studio.messageservice.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@Slf4j
public class FriendServiceClient {

    private final WebClient webClient;

    public FriendServiceClient(WebClient.Builder builder,
                               @Value("${friends.base-url}") String friendsBaseUrl) {
        this.webClient = builder.baseUrl(friendsBaseUrl).build();
    }

    public long fetchIncomingPending(Long userId, String role) {
        if (userId == null) {
            return 0;
        }
        try {
            FriendSummaryResponse response = webClient.get()
                    .uri("/api/friends/summary")
                    .header("X-User-Id", String.valueOf(userId))
                    .header("X-User-Role", role != null ? role : "USER")
                    .retrieve()
                    .bodyToMono(FriendSummaryResponse.class)
                    .block();
            return response != null ? response.incomingPending() : 0;
        } catch (Exception ex) {
            log.warn("Failed to fetch friend summary: {}", ex.getMessage());
            return 0;
        }
    }

    private record FriendSummaryResponse(long friends, long incomingPending, long outgoingPending) {}
}
