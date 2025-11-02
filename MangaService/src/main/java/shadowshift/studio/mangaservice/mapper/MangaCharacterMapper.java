package shadowshift.studio.mangaservice.mapper;

import org.springframework.stereotype.Component;
import shadowshift.studio.mangaservice.dto.MangaCharacterDTO;
import shadowshift.studio.mangaservice.entity.MangaCharacter;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Mapper for converting manga character entities to DTOs.
 */
@Component
public class MangaCharacterMapper {

    public MangaCharacterDTO toDto(MangaCharacter character) {
        MangaCharacterDTO dto = new MangaCharacterDTO();
        dto.setId(character.getId());
        dto.setMangaId(character.getManga() != null ? character.getManga().getId() : null);
        dto.setNamePrimary(character.getNamePrimary());
        dto.setNameSecondary(character.getNameSecondary());
        dto.setDescription(character.getDescription());
        dto.setImageUrl(character.getImageUrl());
        dto.setStrength(character.getStrength());
        dto.setAffiliation(character.getAffiliation());
        dto.setGender(character.getGender());
        dto.setAge(character.getAge());
        dto.setClassification(character.getClassification());
        dto.setSkills(character.getSkills());
        dto.setStatus(character.getStatus());
        dto.setCreatedBy(character.getCreatedBy());
        dto.setApprovedBy(character.getApprovedBy());
        dto.setRejectedBy(character.getRejectedBy());
        dto.setRejectionReason(character.getRejectionReason());
        dto.setCreatedAt(character.getCreatedAt());
        dto.setUpdatedAt(character.getUpdatedAt());
        dto.setStatusUpdatedAt(character.getStatusUpdatedAt());
        return dto;
    }

    public List<MangaCharacterDTO> toDto(List<MangaCharacter> characters) {
        return characters.stream().map(this::toDto).collect(Collectors.toList());
    }
}
