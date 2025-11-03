package shadowshift.studio.mangaservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.mangaservice.dto.CharacterImageUploadResult;
import shadowshift.studio.mangaservice.dto.MangaCharacterDTO;
import shadowshift.studio.mangaservice.dto.MangaCharacterModerationDTO;
import shadowshift.studio.mangaservice.dto.MangaCharacterRequestDTO;
import shadowshift.studio.mangaservice.entity.Manga;
import shadowshift.studio.mangaservice.entity.MangaCharacter;
import shadowshift.studio.mangaservice.mapper.MangaCharacterMapper;
import shadowshift.studio.mangaservice.repository.MangaCharacterRepository;
import shadowshift.studio.mangaservice.repository.MangaRepository;
import shadowshift.studio.mangaservice.service.external.CharacterImageStorageClient;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
public class MangaCharacterService {

    private static final Logger log = LoggerFactory.getLogger(MangaCharacterService.class);

    private final MangaRepository mangaRepository;
    private final MangaCharacterRepository mangaCharacterRepository;
    private final MangaCharacterMapper mangaCharacterMapper;
    private final CharacterImageStorageClient characterImageStorageClient;

    public MangaCharacterService(MangaRepository mangaRepository,
                                 MangaCharacterRepository mangaCharacterRepository,
                                 MangaCharacterMapper mangaCharacterMapper,
                                 CharacterImageStorageClient characterImageStorageClient) {
        this.mangaRepository = mangaRepository;
        this.mangaCharacterRepository = mangaCharacterRepository;
        this.mangaCharacterMapper = mangaCharacterMapper;
        this.characterImageStorageClient = characterImageStorageClient;
    }

    @Transactional(readOnly = true)
    public List<MangaCharacterDTO> getCharacters(Long mangaId, Long requesterId, boolean includeAll) {
        ensureMangaExists(mangaId);
        List<MangaCharacter> characters = mangaCharacterRepository.findByMangaId(mangaId);
        Comparator<MangaCharacter> comparator = Comparator.comparing(
                MangaCharacter::getNamePrimary,
                Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)
        );

        return characters.stream()
                .filter(character -> includeAll
                        || character.getStatus() == MangaCharacter.Status.APPROVED
                        || (requesterId != null && Objects.equals(character.getCreatedBy(), requesterId)))
                .sorted(comparator)
                .map(mangaCharacterMapper::toDto)
                .collect(Collectors.toList());
    }

    public MangaCharacterDTO createCharacter(Long mangaId,
                                             MangaCharacterRequestDTO request,
                                             Long creatorId,
                                             String roleHeader,
                                             MultipartFile imageFile) {
        if (creatorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Требуется авторизация");
        }

        Manga manga = mangaRepository.findById(mangaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Тайтл не найден"));

        MangaCharacter character = new MangaCharacter();
        character.setManga(manga);
        applyRequest(character, request);

        if (imageFile != null && !imageFile.isEmpty()) {
            CharacterImageUploadResult uploadedImage = uploadCharacterImage(imageFile, mangaId, null, creatorId);
            applyUploadedImage(character, uploadedImage);
        } else {
            applyExternalImageIfProvided(character, request);
        }
        character.setCreatedBy(creatorId);

        boolean privileged = hasModerationRights(roleHeader);
        LocalDateTime now = LocalDateTime.now();

        if (privileged) {
            character.setStatus(MangaCharacter.Status.APPROVED);
            character.setApprovedBy(creatorId);
            character.setStatusUpdatedAt(now);
        } else {
            character.setStatus(MangaCharacter.Status.PENDING);
            character.setStatusUpdatedAt(now);
        }

        MangaCharacter saved = mangaCharacterRepository.save(character);
        log.info("Character '{}' created for manga {} by user {} with status {}", saved.getNamePrimary(), mangaId, creatorId, saved.getStatus());
        return mangaCharacterMapper.toDto(saved);
    }

    public MangaCharacterDTO updateCharacter(Long characterId,
                                             MangaCharacterRequestDTO request,
                                             Long requesterId,
                                             String roleHeader,
                                             MultipartFile imageFile) {
        MangaCharacter character = mangaCharacterRepository.findById(characterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Персонаж не найден"));

        boolean privileged = hasModerationRights(roleHeader);
        boolean isCreator = requesterId != null && Objects.equals(character.getCreatedBy(), requesterId);

        if (!privileged && !isCreator) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Недостаточно прав для редактирования персонажа");
        }

        if (!privileged && character.getStatus() != MangaCharacter.Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Редактировать можно только ожидающие одобрения персонажи");
        }

        applyRequest(character, request);

        boolean removeRequested = Boolean.TRUE.equals(request.getRemoveImage());
        if (imageFile != null && !imageFile.isEmpty()) {
            Long mangaId = character.getManga() != null ? character.getManga().getId() : null;
            CharacterImageUploadResult uploadedImage = uploadCharacterImage(imageFile, mangaId, character.getId(), requesterId);
            deleteStoredImageIfPresent(character);
            applyUploadedImage(character, uploadedImage);
        } else if (removeRequested) {
            deleteStoredImageIfPresent(character);
            clearImageMetadata(character);
        } else {
            applyExternalImageIfProvided(character, request);
        }

        if (!privileged) {
            character.setStatus(MangaCharacter.Status.PENDING);
            character.setRejectedBy(null);
            character.setRejectionReason(null);
            character.setStatusUpdatedAt(LocalDateTime.now());
        }

        MangaCharacter saved = mangaCharacterRepository.save(character);
        return mangaCharacterMapper.toDto(saved);
    }

    public MangaCharacterDTO moderateCharacter(Long characterId,
                                               MangaCharacterModerationDTO request,
                                               Long moderatorId,
                                               String roleHeader) {
        if (!hasModerationRights(roleHeader)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Недостаточно прав для модерации");
        }
        if (moderatorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Требуется авторизация");
        }

        MangaCharacter character = mangaCharacterRepository.findById(characterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Персонаж не найден"));

        MangaCharacter.Status targetStatus = parseStatus(request.getStatus());
        LocalDateTime now = LocalDateTime.now();

        switch (targetStatus) {
            case APPROVED -> {
                character.setStatus(MangaCharacter.Status.APPROVED);
                character.setApprovedBy(moderatorId);
                character.setRejectedBy(null);
                character.setRejectionReason(null);
                character.setStatusUpdatedAt(now);
            }
            case REJECTED -> {
                character.setStatus(MangaCharacter.Status.REJECTED);
                character.setRejectedBy(moderatorId);
                character.setRejectionReason(StringUtils.hasText(request.getReason()) ? request.getReason().trim() : null);
                character.setApprovedBy(null);
                character.setStatusUpdatedAt(now);
            }
            case PENDING -> {
                character.setStatus(MangaCharacter.Status.PENDING);
                character.setApprovedBy(null);
                character.setRejectedBy(null);
                character.setRejectionReason(null);
                character.setStatusUpdatedAt(now);
            }
        }

        MangaCharacter saved = mangaCharacterRepository.save(character);
        log.info("Character {} moderated by {} to status {}", characterId, moderatorId, saved.getStatus());
        return mangaCharacterMapper.toDto(saved);
    }

    public void deleteCharacter(Long characterId, Long requesterId, String roleHeader) {
        MangaCharacter character = mangaCharacterRepository.findById(characterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Персонаж не найден"));

        boolean privileged = hasModerationRights(roleHeader);
        boolean isCreator = requesterId != null && Objects.equals(character.getCreatedBy(), requesterId);

        if (!privileged) {
            if (!isCreator) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Недостаточно прав для удаления персонажа");
            }
            if (character.getStatus() != MangaCharacter.Status.PENDING) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Удалить можно только ожидающие одобрения персонажи");
            }
        }

        deleteStoredImageIfPresent(character);
        mangaCharacterRepository.delete(character);
        log.info("Character {} removed by user {}", characterId, requesterId);
    }

    private void ensureMangaExists(Long mangaId) {
        if (!mangaRepository.existsById(mangaId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Тайтл не найден");
        }
    }

    private CharacterImageUploadResult uploadCharacterImage(MultipartFile file,
                                                            Long mangaId,
                                                            Long characterId,
                                                            Long userId) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (mangaId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Не удалось определить мангу для загрузки изображения");
        }
        try {
            return characterImageStorageClient.uploadCharacterImage(file, mangaId, characterId, userId);
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, ex.getMessage(), ex);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Не удалось загрузить изображение персонажа", ex);
        }
    }

    private void applyUploadedImage(MangaCharacter character, CharacterImageUploadResult uploadedImage) {
        if (uploadedImage == null) {
            return;
        }
        character.setImageUrl(normalize(uploadedImage.getUrl()));
        character.setImageObjectKey(normalize(uploadedImage.getKey()));
        character.setImageWidth(uploadedImage.getWidth());
        character.setImageHeight(uploadedImage.getHeight());
        character.setImageSizeBytes(uploadedImage.getSizeBytes());
    }

    private void applyExternalImageIfProvided(MangaCharacter character, MangaCharacterRequestDTO request) {
        String manualUrl = normalize(request.getImageUrl());
        if (StringUtils.hasText(manualUrl)) {
            deleteStoredImageIfPresent(character);
            character.setImageUrl(manualUrl);
            character.setImageObjectKey(null);
            character.setImageWidth(null);
            character.setImageHeight(null);
            character.setImageSizeBytes(null);
        }
    }

    private void deleteStoredImageIfPresent(MangaCharacter character) {
        String key = character.getImageObjectKey();
        if (StringUtils.hasText(key)) {
            characterImageStorageClient.deleteCharacterImage(key);
        }
    }

    private void clearImageMetadata(MangaCharacter character) {
        character.setImageUrl(null);
        character.setImageObjectKey(null);
        character.setImageWidth(null);
        character.setImageHeight(null);
        character.setImageSizeBytes(null);
    }

    private void applyRequest(MangaCharacter character, MangaCharacterRequestDTO request) {
        character.setNamePrimary(normalize(request.getNamePrimary()));
        character.setNameSecondary(normalize(request.getNameSecondary()));
        character.setDescription(normalizeMultiline(request.getDescription()));
        character.setStrength(normalize(request.getStrength()));
        character.setAffiliation(normalize(request.getAffiliation()));
        character.setGender(normalize(request.getGender()));
        character.setAge(normalize(request.getAge()));
        character.setClassification(normalize(request.getClassification()));
        character.setSkills(normalizeMultiline(request.getSkills()));
    }

    private boolean hasModerationRights(String roleHeader) {
        if (!StringUtils.hasText(roleHeader)) {
            return false;
        }
        String normalized = roleHeader.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }
        return "ADMIN".equals(normalized) || "MODERATOR".equals(normalized);
    }

    private MangaCharacter.Status parseStatus(String status) {
        if (!StringUtils.hasText(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Некорректный статус");
        }
        try {
            return MangaCharacter.Status.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Неизвестный статус: " + status);
        }
    }

    private String normalize(String value) {
        return value != null ? value.trim() : null;
    }

    private String normalizeMultiline(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
