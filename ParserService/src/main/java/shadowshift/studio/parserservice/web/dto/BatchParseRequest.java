package shadowshift.studio.parserservice.web.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class BatchParseRequest {

    @NotEmpty
    private List<String> slugs;

    private String parser = "mangalib";

    private boolean autoImport;

    public List<String> getSlugs() {
        return slugs;
    }

    public void setSlugs(List<String> slugs) {
        this.slugs = slugs;
    }

    public String getParser() {
        return parser;
    }

    public void setParser(String parser) {
        this.parser = parser;
    }

    public boolean isAutoImport() {
        return autoImport;
    }

    public void setAutoImport(boolean autoImport) {
        this.autoImport = autoImport;
    }
}
