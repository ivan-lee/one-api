# Controller Module

## OVERVIEW
HTTP request handlers for API endpoints, web UI, and relay logic. All business logic flows through controllers.

## STRUCTURE
```
controller/
├── billing.go          # User billing queries
├── channel-billing.go  # Channel balance updates
├── channel-test.go     # Automated channel health checks
├── channel.go          # Channel CRUD operations
├── group.go            # User/channel group management
├── log.go              # Request logging
├── misc.go             # Miscellaneous utilities
├── model.go            # Model listing operations
├── option.go           # System options management
├── redemption.go       # Coupon/redemption code handling
├── relay.go            # Request relay to upstream providers
├── token.go            # API token management
└── user.go             # User account management
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new API endpoint | Add handler in controller + route in router/ | Follow existing handler pattern |
| Modify relay logic | `relay.go` | Handles OpenAI-compatible relay |
| Channel billing | `channel-billing.go` | **TODO: Azure not supported** |
| Channel testing | `channel-test.go` | Automated health check logic |

## CONVENTIONS
- **Handler signature**: `func Handler(c *gin.Context)` - all handlers take gin.Context
- **Error responses**: Return JSON with `{success: false, message: "error"}`
- **Success responses**: Return JSON with `{success: true, data: ...}`
- **Pagination**: Use `page` and `pageSize` query params, return `total` count
- **Auth**: Most handlers require `TokenAuth()` middleware

## ANTI-PATTERNS (THIS MODULE)
- **DO NOT** call model layer directly for complex queries - use model package functions
- **AVOID** direct DB calls in controllers - always use `model/` layer
- **DO NOT** suppress errors from relay operations - critical for billing accuracy
- **AVOID** modifying `bizErr` pointer in relay handlers - known race condition at line 97
- **DO NOT** use `c.GetInt("id")` for user ID - use `session.Get("id")` (critical bug)

## KNOWN ISSUES
- `relay.go:97`: Race condition with `bizErr` pointer - concurrent access in goroutine
- `channel-billing.go:418`: TODO - Azure OpenAI billing not supported

## TESTING
- Tests alongside source: `*_test.go` files in same directory
- Test frameworks: testify + goconvey (BDD)
- Run: `go test -cover -coverprofile=coverage.txt ./...`
