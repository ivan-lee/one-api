# Middleware Module

## OVERVIEW
Gin middleware chain for authentication, rate limiting, CORS, logging, and request handling.

## STRUCTURE
```
middleware/
├── auth.go               # Token + session authentication
├── cache.go              # Response caching
├── cors.go               # CORS headers
├── distributor.go        # Load balancing across channels
├── gzip.go               # Gzip compression
├── language.go           # Language detection (i18n)
├── logger.go             # Request logging
├── rate-limit.go         # Rate limiting (per-IP)
├── recover.go            # Panic recovery
├── request-id.go         # Request ID generation
├── turnstile-check.go    # Cloudflare Turnstile verification
├── utils.go              # Middleware utilities
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add auth middleware | `auth.go` | Token validation logic |
| Modify rate limits | `rate-limit.go` | Per-IP rate limiting |
| Load balancing | `distributor.go` | Channel selection algorithm |
| Request logging | `logger.go` | Access log format |

## CONVENTIONS
- **Middleware signature**: `func Middleware() gin.HandlerFunc`
- **Chain order**: Recovery → RequestID → Logger → CORS → Auth → RateLimit
- **Error handling**: Call `c.AbortWithStatusJSON()` on auth failure
- **Context values**: Use typed keys from `common/ctxkey/`

## ANTI-PATTERNS (THIS MODULE)
- **DO NOT** skip auth middleware on admin routes - security critical
- **AVOID** complex logic in middleware - keep it focused and fast
- **DO NOT** suppress panics without logging - use `recover.go` pattern
- **AVOID** blocking operations in middleware - will slow all requests
- **DO NOT** forget to call `c.Next()` in middleware (unless aborting)

## UNIQUE STYLES
1. **Distributor Middleware**: Load balances across channels before reaching controller
2. **Dual Auth**: Supports both token-based and session-based authentication
3. **Language Detection**: Auto-detects user language for i18n
4. **Turnstile Integration**: Cloudflare Turnstile bot protection

## CRITICAL WARNINGS
- `auth.go`: User ID must come from `session.Get("id")`, NEVER `c.GetInt("id")` (critical bug)
- `rate-limit.go`: Rate limits apply per-IP, configure via env vars
- `distributor.go`: Called before controller - channel selection happens here

## MIDDLEWARE CHAIN
```
Request → Recovery → RequestID → Logger → CORS → Language
       → TokenAuth/SessionAuth → Distributor → RateLimit → Controller
```

## TESTING
- No dedicated middleware tests currently
- Integration tests cover auth and rate limiting
- Add tests when modifying critical middleware (auth, rate-limit)
