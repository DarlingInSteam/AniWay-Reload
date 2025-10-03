package shadowshift.studio.messageservice.dto;

public record CategoryView(
        Long id,
        String slug,
        String title,
        String description,
        boolean isDefault,
        boolean isArchived,
        long unreadCount
) {
}
