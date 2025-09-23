package shadowshift.studio.authservice.repository;

import shadowshift.studio.authservice.entity.Bookmark;
import shadowshift.studio.authservice.entity.BookmarkStatus;

import java.util.List;

public interface BookmarkRepositoryCustom {
    List<Bookmark> searchBookmarks(Long userId,
                                    String query,
                                    BookmarkStatus status,
                                    Boolean favorite,
                                    String sortBy,
                                    String sortOrder);
}
