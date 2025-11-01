package shadowshift.studio.parserservice.web.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public class BuildRequest {

    @NotBlank
    private String slug;

    private String parser = "mangalib";

    @NotBlank
    private String type;

    private String branchId;
    
    private boolean autoImport = false;

    private List<String> chapterIds;

    private List<ChapterNumberRequest> chapterNumbers;

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

    public List<String> getChapterIds() {
        return chapterIds;
    }

    public void setChapterIds(List<String> chapterIds) {
        this.chapterIds = chapterIds;
    }

    public List<ChapterNumberRequest> getChapterNumbers() {
        return chapterNumbers;
    }

    public void setChapterNumbers(List<ChapterNumberRequest> chapterNumbers) {
        this.chapterNumbers = chapterNumbers;
    }
}
