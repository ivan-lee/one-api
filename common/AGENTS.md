# Common Module

## OVERVIEW
Shared utilities used across the entire application. Configuration, logging, caching, and helper functions.

## STRUCTURE
```
common/
├── config/                 # Configuration management
├── logger/                 # Logging utilities
├── client/                 # HTTP client initialization
├── i18n/                   # Internationalization
├── helper/                 # Helper utilities
├── image/                  # Image processing utilities
├── message/                # Message push utilities
├── network/                # Network utilities
├── utils/                  # General utilities
├── blacklist/              # IP blacklist
├── env/                    # Environment variable parsing
├── render/                 # Response rendering
├── constants.go            # Global constants
├── crypto.go               # Cryptography utilities
├── custom-event.go         # Custom event definitions
├── database.go             # Database utilities
├── embed-file-system.go    # Embedded filesystem
├── gin.go                  # Gin utilities
├── init.go                 # Initialization logic
├── rate-limit.go           # Rate limiting utilities
├── redis.go                # Redis client
├── verification.go         # Verification code utilities
└── ...
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add config option | `config/` + env var parsing | Update `.env.example` |
| Logging | `logger/` | Use `logger.SysLog()` or `logger.FatalLog()` |
| Redis operations | `redis.go` | Check `common.RedisEnabled` first |
| HTTP client | `client/` | Use shared client with proxy support |
| i18n | `i18n/` | Internationalization support |

## CONVENTIONS
- **Config access**: Use `config.VariableName` after `common.Init()`
- **Logging**: `logger.SysLog()` for info, `logger.FatalLog()` for critical errors
- **Redis**: Always check `common.RedisEnabled` before Redis operations
- **Env vars**: Parse in `init.go` with godotenv autoload
- **Error handling**: Use `logger.FatalLog()` for startup errors

## ANTI-PATTERNS (THIS MODULE)
- **DO NOT** use `c.GetInt("id")` for user ID - use `session.Get("id")` (critical bug in auth handlers)
- **DO NOT** call verification functions without holding `verificationMutex` (no internal locking)
- **AVOID** direct Redis calls - use common wrapper functions
- **DO NOT** suppress embed filesystem errors - will panic
- **AVOID** using `context.TODO()` or `context.Background()` - propagate context properly

## UNIQUE STYLES
1. **Embedded Frontend**: `//go:embed web/build/*` - compiled into binary
2. **Multi-theme Support**: Theme switching via `THEME` env var
3. **Optional Redis**: Graceful degradation if Redis not configured
4. **i18n Support**: Multi-language UI via `i18n/` package

## CRITICAL WARNINGS
- `verification.go:63`: Internal functions have NO locking - caller MUST hold `verificationMutex`
- `embed-file-system.go:24`: PANIC on embed filesystem errors
- `redis.go`: Multiple uses of `context.TODO()` - should propagate context
- Auth handlers: NEVER use `c.GetInt("id")` - critical bug, use `session.Get("id")`

## TESTING
- Some unit tests in `image/` and `network/` subdirectories
- Test frameworks: testify + goconvey
- Integration tests use real external services (Wikimedia for image tests)

## KEY UTILITIES
- `common.Init()`: Initialize all common components
- `common.InitRedisClient()`: Setup Redis connection
- `logger.SetupLogger()`: Configure logging
- `client.Init()`: Initialize shared HTTP client
