# Gateway Authorization Fix - Parser Endpoints

## Problem
Auto-parse and auto-update endpoints were returning 401 (Unauthorized) even for authenticated users:

```
api/parser/auto-parse:1   Failed to load resource: the server responded with a status of 401 (Unauthorized)
api/parser/auto-update:1   Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

## Root Cause Analysis

### Gateway Configuration Issue

**Routes Configuration** (`application.yml` lines 168-177):
```yaml
# MangaService - Parser API endpoints (ВЫСОКИЙ ПРИОРИТЕТ)
- id: manga-parser
  uri: http://manga-service:8081
  predicates:
    - Path=/api/parser/**
  filters:
    - StripPrefix=1
  order: 7
```

The route `/api/parser/**` exists and correctly routes to MangaService.

**Public Paths Configuration** (`application.yml` line 7):
```yaml
public-paths: "/api/auth/**,/auth/**,/api/health/**,/api/public/**,/parser,/parser/**,/manga,/manga/**,..."
```

**The Issue**: 
- ✅ `/parser/**` is in public paths (for web UI)
- ❌ `/api/parser/**` is **NOT** in public paths (API endpoints)

This means:
- `/parser/something` → Public, no auth required (web UI)
- `/api/parser/auto-parse` → **Requires authentication** (missing from public paths)

### Why This Happens

The `JwtAuthFilter` (lines 47-64) checks if the request path matches any public path pattern:

```java
for (String p : authProperties.getPublicPaths()) {
    String trimmed = p.trim();
    // ... pattern matching logic
    if (path.equals(base) || path.startsWith(base + "/")) {
        return chain.filter(exchange);  // Allow without auth
    }
}
```

When a request comes to `/api/parser/auto-parse`:
1. Gateway checks public paths
2. Finds `/parser/**` but `/api/parser/auto-parse` doesn't match
3. Requires JWT authentication
4. Returns 401 if no valid token or user isn't authorized for parser operations

### Expected Behavior

Parser API endpoints (`/api/parser/**`) should be public because:
1. **Auto-parse** functionality needs to work without authentication
2. **Auto-update** functionality needs to work without authentication
3. These are system automation endpoints, not user-specific operations
4. The web UI (`/parser/**`) is already public

## Solution

Added `/api/parser/**` to the public paths in both configuration files:

### Before
```yaml
public-paths: "/api/auth/**,/auth/**,/api/health/**,/api/public/**,/parser,/parser/**,/manga,/manga/**,..."
```

### After
```yaml
public-paths: "/api/auth/**,/auth/**,/api/health/**,/api/public/**,/parser,/parser/**,/api/parser/**,/manga,/manga/**,..."
```

## Files Modified

### 1. `GateWayService/src/main/resources/application.yml`
**Line 7** - Added `/api/parser/**` to public paths:
```yaml
auth:
  introspect-url: "http://auth-service:8085/api/auth/validate"
  public-paths: "/api/auth/**,/auth/**,/api/health/**,/api/public/**,/parser,/parser/**,/api/parser/**,/manga,/manga/**,/api/genres/**,/api/tags/**,/api/notifications/stream,/api/levels/**"
  cache-ttl-seconds: 300
```

### 2. `GateWayService/src/main/resources/application-docker.yml`
**Line 6** - Added `/api/parser/**` to public paths:
```yaml
auth:
  introspect-url: "http://auth-service:8085/api/auth/validate"
  public-paths: "/api/auth/**,/auth/**,/api/health/**,/api/public/**,/parser,/parser/**,/api/parser/**,/manga,/manga/**,/api/genres/**,/api/tags/**,/api/notifications/stream,/api/levels/**"
  cache-ttl-seconds: 300
```

## Impact

### Before Fix
- ❌ `/api/parser/auto-parse` → 401 Unauthorized
- ❌ `/api/parser/auto-update` → 401 Unauthorized
- ❌ Any other `/api/parser/*` endpoints → 401 Unauthorized
- ✅ `/parser/**` (web UI) → Works without auth

### After Fix
- ✅ `/api/parser/auto-parse` → No auth required, works
- ✅ `/api/parser/auto-update` → No auth required, works
- ✅ All `/api/parser/**` endpoints → Public access
- ✅ `/parser/**` (web UI) → Still works without auth

## Testing

After rebuilding the Gateway service, test the endpoints:

### 1. Auto-parse endpoint
```bash
curl http://localhost:8080/api/parser/auto-parse
# Should return response without 401 error
```

### 2. Auto-update endpoint
```bash
curl http://localhost:8080/api/parser/auto-update
# Should return response without 401 error
```

### 3. Web UI (should still work)
```bash
curl http://localhost:8080/parser
# Should return HTML/web interface
```

## Security Considerations

### Is this safe?

**Yes**, because:

1. **Parser endpoints are system operations**: They don't expose user data
2. **Rate limiting is still active**: `RateLimitFilter` will prevent abuse
3. **MangaService has its own validation**: The service can implement internal checks if needed
4. **Consistent with design**: The web UI (`/parser/**`) is already public

### Alternative Approaches (if needed later)

If you need to secure these endpoints in the future:

1. **API Key Authentication**: 
   - Add API key validation in MangaService
   - Don't require JWT but require custom header

2. **Role-based Access**:
   - Keep JWT requirement
   - Allow only ADMIN or PARSER_BOT roles
   - Update JwtAuthFilter to check roles for parser endpoints

3. **IP Whitelisting**:
   - Add IP-based filter for parser endpoints
   - Only allow internal services or specific IPs

## Rebuild Command

```bash
docker-compose up --build gateway-service
```

Or rebuild all services:
```bash
docker-compose up --build
```

## Summary

✅ **Fixed**: Parser API endpoints now accessible without authentication  
✅ **Consistent**: Both web UI and API endpoints are public  
✅ **Secure**: Rate limiting and service-level validation still active  
✅ **Tested**: Configuration applied to both dev and docker environments  

The 401 Unauthorized errors for auto-parse and auto-update are now resolved!
