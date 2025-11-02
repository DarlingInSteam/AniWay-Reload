package shadowshift.studio.mangaservice.service.external;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import shadowshift.studio.mangaservice.dto.CharacterImageUploadResult;

import java.util.Objects;

@Service
public class CharacterImageStorageClient {

    private static final Logger log = LoggerFactory.getLogger(CharacterImageStorageClient.class);

    private final WebClient webClient;
    private final String imageStorageServiceUrl;

    public CharacterImageStorageClient(WebClient.Builder webClientBuilder,
                                       @Value("${image.storage.service.url}") String imageStorageServiceUrl) {
        this.webClient = webClientBuilder.build();
        this.imageStorageServiceUrl = imageStorageServiceUrl;
    }

    public CharacterImageUploadResult uploadCharacterImage(MultipartFile file,
                                                            Long mangaId,
                                                            Long characterId,
                                                            Long userId) {
        Objects.requireNonNull(file, "file must not be null");
        Objects.requireNonNull(mangaId, "mangaId must not be null");

    MultipartBodyBuilder builder = new MultipartBodyBuilder();
    builder.part("file", file.getResource())
        .filename(file.getOriginalFilename() != null ? file.getOriginalFilename() : "character-image")
        .contentType(file.getContentType() != null ? MediaType.parseMediaType(file.getContentType()) : MediaType.APPLICATION_OCTET_STREAM);
    builder.part("mangaId", mangaId.toString());
    if (characterId != null) {
        builder.part("characterId", characterId.toString());
    }

    WebClient.RequestHeadersSpec<?> requestSpec = webClient.post()
        .uri(imageStorageServiceUrl + "/api/images/characters")
        .contentType(MediaType.MULTIPART_FORM_DATA)
        .body(BodyInserters.fromMultipartData(builder.build()));

    if (userId != null) {
        requestSpec = requestSpec.header("X-User-Id", userId.toString());
    }

        log.debug("Uploading character image to ImageStorageService (mangaId={}, characterId={}, userId={})",
                mangaId, characterId, userId);

    return requestSpec.retrieve()
                .bodyToMono(CharacterImageUploadResult.class)
                .onErrorResume(throwable -> {
                    log.error("Failed to upload character image: {}", throwable.getMessage());
                    return Mono.error(new IllegalStateException("Не удалось загрузить изображение персонажа", throwable));
                })
                .block();
    }

    public void deleteCharacterImage(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }

        log.debug("Requesting deletion of character image with key {}", objectKey);

        webClient.delete()
                .uri(uriBuilder -> uriBuilder
                        .path(imageStorageServiceUrl + "/api/images/characters")
                        .queryParam("key", objectKey)
                        .build())
                .retrieve()
                .toBodilessEntity()
                .onErrorResume(throwable -> {
                    log.warn("Failed to delete character image {}: {}", objectKey, throwable.getMessage());
                    return Mono.empty();
                })
                .block();
    }
}
