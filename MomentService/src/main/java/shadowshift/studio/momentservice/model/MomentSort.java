package shadowshift.studio.momentservice.model;

import org.springframework.data.domain.Sort;
import org.springframework.util.StringUtils;

public enum MomentSort {
    NEW("new"),
    POPULAR("popular"),
    ACTIVE("active");

    private final String param;

    MomentSort(String param) {
        this.param = param;
    }

    public Sort toSort() {
        return switch (this) {
            case NEW -> Sort.by(Sort.Order.desc("createdAt"));
            case POPULAR -> Sort.by(Sort.Order.desc("likesCount7d"), Sort.Order.desc("likesCount"), Sort.Order.desc("createdAt"));
            case ACTIVE -> Sort.by(Sort.Order.desc("commentsCount7d"), Sort.Order.desc("lastActivityAt"), Sort.Order.desc("createdAt"));
        };
    }

    public static MomentSort fromParam(String value) {
        if (!StringUtils.hasText(value)) {
            return NEW;
        }
        String normalized = value.trim().toLowerCase();
        for (MomentSort sort : values()) {
            if (sort.param.equals(normalized)) {
                return sort;
            }
        }
        throw new IllegalArgumentException("Unsupported sort='" + value + "'. Allowed values: new, popular, active");
    }

    public String getParam() {
        return param;
    }
}
