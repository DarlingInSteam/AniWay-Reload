package shadowshift.studio.commentservice.enums;

/**
 * Типы реакций на комментарии
 */
public enum ReactionType {
    /**
     * Лайк
     */
    LIKE("Лайк"),
    
    /**
     * Дизлайк
     */
    DISLIKE("Дизлайк");
    
    private final String description;
    
    ReactionType(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}
