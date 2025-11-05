package shadowshift.studio.mangaservice.service.external;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import shadowshift.studio.mangaservice.config.ServiceUrlProperties;
import shadowshift.studio.mangaservice.dto.external.CommentAggregateResponse;
import shadowshift.studio.mangaservice.dto.external.MangaLikesAggregateResponse;
import shadowshift.studio.mangaservice.dto.external.MangaReviewAggregateResponse;

/**
 * Lightweight client that collects engagement metrics (likes, comments, reviews)
 * from neighbouring microservices so the catalog can expose consistent counters
 * and sorting logic.
 */
@Service
public class ExternalMetricsClient {

    private static final Logger logger = LoggerFactory.getLogger(ExternalMetricsClient.class);

    private final RestTemplate restTemplate;
    private final ServiceUrlProperties serviceUrlProperties;

    public ExternalMetricsClient(RestTemplate restTemplate, ServiceUrlProperties serviceUrlProperties) {
        this.restTemplate = restTemplate;
        this.serviceUrlProperties = serviceUrlProperties;
    }

    public Map<Long, Long> fetchMangaLikes(Collection<Long> mangaIds) {
        List<Long> payload = prepareIds(mangaIds);
        if (payload.isEmpty()) {
            return Collections.emptyMap();
        }

        String url = serviceUrlProperties.getChapterServiceUrl().replaceAll("/+$", "") + "/internal/manga/likes/aggregate";
        try {
            ResponseEntity<MangaLikesAggregateResponse[]> response = restTemplate.postForEntity(
                    url,
                    Map.of("mangaIds", payload),
                    MangaLikesAggregateResponse[].class
            );
            MangaLikesAggregateResponse[] body = response.getBody();
            if (body == null || body.length == 0) {
                return Collections.emptyMap();
            }

            Map<Long, Long> result = new HashMap<>();
            for (MangaLikesAggregateResponse aggregate : body) {
                if (aggregate != null && aggregate.mangaId() != null) {
                    result.put(aggregate.mangaId(), defaultZero(aggregate.totalLikes()));
                }
            }
            return result;
        } catch (Exception ex) {
            logger.warn("Failed to fetch like aggregates from ChapterService: {}", ex.getMessage());
            return Collections.emptyMap();
        }
    }

    public Map<Long, Long> fetchMangaComments(Collection<Long> mangaIds) {
        List<Long> payload = prepareIds(mangaIds);
        if (payload.isEmpty()) {
            return Collections.emptyMap();
        }

        String url = serviceUrlProperties.getCommentServiceUrl().replaceAll("/+$", "") + "/internal/comments/aggregate";
        try {
            ResponseEntity<CommentAggregateResponse[]> response = restTemplate.postForEntity(
                    url,
                    Map.of(
                        "commentType", "MANGA",
                        "targetIds", payload
                    ),
                    CommentAggregateResponse[].class
            );
            CommentAggregateResponse[] body = response.getBody();
            if (body == null || body.length == 0) {
                return Collections.emptyMap();
            }
            Map<Long, Long> result = new HashMap<>();
            for (CommentAggregateResponse aggregate : body) {
                if (aggregate != null && aggregate.targetId() != null) {
                    result.put(aggregate.targetId(), defaultZero(aggregate.totalComments()));
                }
            }
            return result;
        } catch (Exception ex) {
            logger.warn("Failed to fetch comment aggregates from CommentService: {}", ex.getMessage());
            return Collections.emptyMap();
        }
    }

    public Map<Long, MangaReviewAggregateResponse> fetchMangaReviews(Collection<Long> mangaIds) {
        List<Long> payload = prepareIds(mangaIds);
        if (payload.isEmpty()) {
            return Collections.emptyMap();
        }

        String url = serviceUrlProperties.getAuthServiceUrl().replaceAll("/+$", "") + "/internal/reviews/manga/aggregate";
        try {
            ResponseEntity<MangaReviewAggregateResponse[]> response = restTemplate.postForEntity(
                    url,
                    Map.of("mangaIds", payload),
                    MangaReviewAggregateResponse[].class
            );
            MangaReviewAggregateResponse[] body = response.getBody();
            if (body == null || body.length == 0) {
                return Collections.emptyMap();
            }

            Map<Long, MangaReviewAggregateResponse> result = new HashMap<>();
            for (MangaReviewAggregateResponse aggregate : body) {
                if (aggregate != null && aggregate.mangaId() != null) {
                    result.put(aggregate.mangaId(), aggregate);
                }
            }
            return result;
        } catch (Exception ex) {
            logger.warn("Failed to fetch review aggregates from AuthService: {}", ex.getMessage());
            return Collections.emptyMap();
        }
    }

    private static List<Long> prepareIds(Collection<Long> ids) {
        if (ids == null) {
            return Collections.emptyList();
        }
        return ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    private static long defaultZero(Long value) {
        return value != null ? value : 0L;
    }
}
