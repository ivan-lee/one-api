# Model Layer

## OVERVIEW
GORM-based data models and database operations. All database access goes through this layer.

## STRUCTURE
```
model/
├── ability.go          # Model-to-channel mapping
├── cache.go            # Database cache management
├── channel.go          # Channel configuration model
├── log.go              # Request logging model
├── main.go             # DB initialization + migrations
├── option.go           # System options storage
├── redemption.go       # Redemption codes
├── token.go            # API tokens
├── user.go             # User accounts
└── utils.go            # Database utilities
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new model | Create file + add to `main.go` migration | Follow GORM conventions |
| Change DB schema | Modify model struct + update migration | Auto-migration on startup |
| DB initialization | `main.go` | `InitDB()` and `InitLogDB()` |
| Batch operations | `utils.go` | Batch update helpers |

## CONVENTIONS
- **GORM tags**: Use `gorm:"column:name;type:varchar(255)"` for all fields
- **JSON tags**: Always include `json:"field_name"` for API responses
- **Primary keys**: Auto-increment integer `ID` field
- **Timestamps**: Use `CreatedAt` and `UpdatedAt` (GORM auto-manages)
- **Soft delete**: Use `gorm.DeletedAt` for soft-delete models
- **Validation**: Use `binding:"required"` for required fields

## ANTI-PATTERNS (THIS MODULE)
- **DO NOT** manually modify DB schema - use GORM migration or `bin/` scripts
- **DO NOT** use `Channel.Other` field - DEPRECATED, use `Channel.Config` instead
- **AVOID** direct SQL queries - use GORM methods unless performance critical
- **DO NOT** skip validation tags - all user input must be validated
- **AVOID** N+1 queries - use `Preload()` for relationships

## UNIQUE STYLES
1. **Auto-migration**: `model.InitDB()` auto-creates/updates tables on startup
2. **Separate log DB**: `InitLogDB()` for request logs (can use different database)
3. **Channel cache**: Optional Redis + memory cache with sync frequency
4. **Batch updater**: Background goroutine for batching database updates

## CRITICAL WARNINGS
- `model/channel.go:31`: `Other` field is DEPRECATED - use `Config` field
- `model/main.go:126`: Migration TODO - drop index when most users upgraded
- `model/user.go:206`: Username check must happen first (order requirement)

## TESTING
- Tests use real database connections
- Test helpers in test files (no dedicated mocks/)
- Use testify for assertions
