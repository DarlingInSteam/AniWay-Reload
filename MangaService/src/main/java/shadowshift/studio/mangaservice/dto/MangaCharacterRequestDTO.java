package shadowshift.studio.mangaservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating or updating manga characters.
 */
public class MangaCharacterRequestDTO {

    @NotBlank(message = "Имя персонажа обязательно")
    @Size(max = 255, message = "Имя персонажа не должно превышать 255 символов")
    private String namePrimary;

    @Size(max = 255, message = "Альтернативное имя не должно превышать 255 символов")
    private String nameSecondary;

    @NotBlank(message = "Описание персонажа обязательно")
    private String description;

    @Size(max = 512, message = "URL изображения не должен превышать 512 символов")
    private String imageUrl;

    private Boolean removeImage;

    @Size(max = 255)
    private String strength;

    @Size(max = 255)
    private String affiliation;

    @Size(max = 64)
    private String gender;

    @Size(max = 64)
    private String age;

    @Size(max = 255)
    private String classification;

    private String skills;

    public String getNamePrimary() {
        return namePrimary;
    }

    public void setNamePrimary(String namePrimary) {
        this.namePrimary = namePrimary;
    }

    public String getNameSecondary() {
        return nameSecondary;
    }

    public void setNameSecondary(String nameSecondary) {
        this.nameSecondary = nameSecondary;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Boolean getRemoveImage() {
        return removeImage;
    }

    public void setRemoveImage(Boolean removeImage) {
        this.removeImage = removeImage;
    }

    public String getStrength() {
        return strength;
    }

    public void setStrength(String strength) {
        this.strength = strength;
    }

    public String getAffiliation() {
        return affiliation;
    }

    public void setAffiliation(String affiliation) {
        this.affiliation = affiliation;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getAge() {
        return age;
    }

    public void setAge(String age) {
        this.age = age;
    }

    public String getClassification() {
        return classification;
    }

    public void setClassification(String classification) {
        this.classification = classification;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }
}
