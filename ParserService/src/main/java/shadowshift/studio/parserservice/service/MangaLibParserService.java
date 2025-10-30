package shadowshift.studio.parserservice.service;

import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.dto.CatalogResult;
import shadowshift.studio.parserservice.dto.ParseResult;
import shadowshift.studio.parserservice.dto.SlideInfo;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Thin wrapper around {@link MangaBuffParserService} to keep existing wiring untouched.
 */
@Service
public class MangaLibParserService {

    private final MangaBuffParserService delegate;

    public MangaLibParserService(MangaBuffParserService delegate) {
        this.delegate = delegate;
    }

    public CompletableFuture<CatalogResult> fetchCatalog(int page, Integer minChapters, Integer maxChapters) {
        return delegate.fetchCatalog(page, minChapters, maxChapters);
    }

    public CompletableFuture<ParseResult> parseManga(String slug, String parser) {
        return delegate.parseManga(slug, parser);
    }

    public String normalizeSlug(String slug) {
        return delegate.normalizeSlug(slug);
    }

    public List<SlideInfo> fetchChapterSlides(String slug, String volume, String chapter) throws IOException {
        return delegate.fetchChapterSlides(slug, volume, chapter);
    }

    public void registerAdultSlug(String slug) {
        delegate.registerAdultSlug(slug);
    }
}
