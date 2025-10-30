package shadowshift.studio.commentservice.enums;

/**
 * Типы комментариев в системе.
 * Легко расширяемый enum для добавления новых типов комментариев.
 */
public enum CommentType {
    /**
     * Комментарий к манге
     */
    MANGA("Комментарий к манге"),
    
    /**
     * Комментарий к главе
     */
    CHAPTER("Комментарий к главе"),
    
    /**
     * Комментарий в профиле пользователя
     */
    PROFILE("Комментарий в профиле"),
    
    /**
     * Комментарий к отзыву
     */
    REVIEW("Комментарий к отзыву"),

    /**
     * Комментарий к пользовательскому посту
     */
    POST("Комментарий к посту"),

    /**
     * Комментарий к моменту
     */
    MOMENT("Комментарий к моменту");
    
    private final String description;
    
    CommentType(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}
