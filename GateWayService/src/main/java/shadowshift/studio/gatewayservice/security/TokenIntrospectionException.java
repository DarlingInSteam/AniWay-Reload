package shadowshift.studio.gatewayservice.security;

/**
 * Dedicated exception thrown when the AuthService introspection endpoint is unreachable
 * or returns an unexpected failure. Downstream filters can translate it into a
 * 503/temporary error without conflating it with authentication failures.
 */
public class TokenIntrospectionException extends RuntimeException {

    public TokenIntrospectionException(String message, Throwable cause) {
        super(message, cause);
    }

    public TokenIntrospectionException(String message) {
        super(message);
    }
}
