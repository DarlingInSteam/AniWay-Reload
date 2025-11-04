package shadowshift.studio.chapterservice.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.chapterservice.dto.MangaLikesAggregateDTO;
import shadowshift.studio.chapterservice.service.ChapterService;

@RestController
@RequestMapping("/internal/manga")
public class InternalChapterMetricsController {

    @Autowired
    private ChapterService chapterService;

    @PostMapping("/likes/aggregate")
    public ResponseEntity<List<MangaLikesAggregateDTO>> aggregateMangaLikes(@RequestBody Map<String, List<Long>> request) {
        List<Long> mangaIds = request.getOrDefault("mangaIds", List.of());
        List<MangaLikesAggregateDTO> aggregates = chapterService.getMangaLikeAggregates(mangaIds);
        return ResponseEntity.ok(aggregates);
    }
}
