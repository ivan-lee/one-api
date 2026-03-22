# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-22
**Commit:** See `git rev-parse HEAD`
**Branch:** See `git branch`

## OVERVIEW
AI API Gateway providing OpenAI-compatible interface for 40+ LLM providers (OpenAI, Anthropic, Gemini, etc.). Features quota management, load balancing, billing, and multi-theme web UI.

## STRUCTURE
```
one-api/
├── main.go                 # Single entry point, no cmd/ directory
├── controller/             # HTTP request handlers (API, relay, web)
├── model/                  # GORM models + DB operations
├── router/                 # Gin route definitions
├── middleware/             # Auth, rate-limit, CORS, logging
├── relay/                  # Core gateway logic + 42 provider adaptors
├── common/                 # Shared utilities (config, logger, cache)
├── monitor/                # Channel health monitoring
├── web/                    # React frontend (3 themes: default, berry, air)
├── bin/                    # DB migration scripts
└── docs/                   # API documentation
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new LLM provider | `relay/adaptor/{provider}/` | Follow adaptor pattern |
| Add API endpoint | `controller/` + `router/` | Match existing handler style |
| Change DB schema | `model/` | Auto-migration on startup |
| Modify auth logic | `middleware/auth.go` | JWT + session-based |
| Update frontend | `web/{theme}/src/` | Rebuild with `web/build.sh` |
| Config options | `common/config/` + env vars | See `.env.example` |
| Billing logic | `relay/billing/` | Token counting + ratio calculation |
| Channel testing | `controller/channel-test.go` | Automated health checks |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `main()` | Entry | `main.go` | Bootstrap: DB, Redis, i18n, routes |
| `GetAdaptor()` | Factory | `relay/adaptor.go` | Returns provider adaptor by type |
| `Init()` | Config | `common/init.go` | Load env vars, constants |
| `InitDB()` | DB | `model/main.go` | GORM setup, auto-migration |
| `SetRouter()` | Routes | `router/main.go` | Mount all route groups |
| `Distribute()` | Middleware | `middleware/distributor.go` | Load balance across channels |

## CONVENTIONS
- **Go version**: 1.20+, single module (no `cmd/`, `internal/`)
- **Web framework**: Gin with middleware chain
- **ORM**: GORM with auto-migration
- **Test style**: Dual - testify (assert) + goconvey (BDD)
- **Error handling**: `logger.FatalLog()` for startup, return errors in handlers
- **Config**: Env vars via `.env` file (godotenv autoload)
- **Frontend build**: Embedded via `//go:embed web/build/*`

## ANTI-PATTERNS (THIS PROJECT)
- **DO NOT** use `Other` field in Channel model - DEPRECATED, use `Config` instead
- **DO NOT** manually modify DB schema - use GORM migration or `bin/` scripts
- **DO NOT** add new adaptors without implementing full interface (see `openai/` as reference)
- **AVOID** Azure OpenAI in billing code - marked as TODO in `channel-billing.go`
- **NEVER** suppress token encoder errors - critical for billing accuracy
- **DO NOT** commit `.env` file - use `.env.example` as template
- **AVOID** direct DB calls in controllers - use `model/` layer

## UNIQUE STYLES
1. **Adaptor Pattern**: Each LLM provider has dedicated adaptor translating to OpenAI format
2. **Multi-Theme Frontend**: Build all 3 themes, switch via `THEME` env var
3. **Master/Slave Mode**: `NODE_TYPE=slave` for horizontal scaling with shared DB
4. **Embedded Assets**: Frontend build embedded into single binary
5. **Channel Cache**: Optional Redis + memory cache with `SYNC_FREQUENCY` refresh
6. **Quota System**: Token-based billing with group-specific ratios

## COMMANDS
```bash
# Build backend
go mod download
go build -ldflags "-s -w -X 'github.com/songquanpeng/one-api/common.Version=$(git describe --tags)'" -o one-api

# Build frontend (all themes)
cd web && ./build.sh

# Run tests
go test -cover -coverprofile=coverage.txt ./...

# Docker build
docker build -t one-api .

# Development run
PORT=3000 SQL_DSN="root:pass@tcp(localhost:3306)/oneapi" ./one-api --log-dir ./logs

# Multi-theme dev
cd web/default && npm run dev  # Proxies to localhost:3000
```

## NOTES
- **Default credentials**: `root` / `123456` - MUST change after first login
- **DSN formats**:
  - MySQL: `user:pass@tcp(host:port)/dbname`
  - PostgreSQL: `postgres://user:pass@host:port/dbname`
  - SQLite: `oneapi.db` (default, not recommended for production)
- **Critical env vars**: `SQL_DSN` (production), `SESSION_SECRET`, `REDIS_CONN_STRING`
- **Token encoding**: Uses tiktoken-go, caches in `TIKTOKEN_CACHE_DIR`
- **Channel testing**: Automated via `CHANNEL_TEST_FREQUENCY` (minutes)
- **Known debt**: 5 TODOs in codebase (Azure support, index cleanup, config optimization)
