package shadowshift.studio.parserservice.web.dto;

import jakarta.validation.constraints.NotBlank;

public class BuildRequest {

    @NotBlank
    private String slug;

    private String parser = "mangalib";

    @NotBlank
    private String type;

    private String branchId;
    
    private boolean autoImport = false;

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getBranchId() {
        return branchId;
    }

    public void setBranchId(String branchId) {
        this.branchId = branchId;
    }
    
    public boolean isAutoImport() {
        return autoImport;
    }
    
    public void setAutoImport(boolean autoImport) {
        this.autoImport = autoImport;
    }
}
