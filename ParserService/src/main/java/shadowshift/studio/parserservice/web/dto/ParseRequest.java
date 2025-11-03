package shadowshift.studio.parserservice.web.dto;

import jakarta.validation.constraints.NotBlank;

public class ParseRequest {

    @NotBlank
    private String slug;

    private String parser = "mangalib";

    private Boolean force;

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getParser() {
        return parser;
    }

    public void setParser(String parser) {
        this.parser = parser;
    }

    public Boolean getForce() {
        return force;
    }

    public void setForce(Boolean force) {
        this.force = force;
    }
}
