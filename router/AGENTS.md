# Router Module

## OVERVIEW
Gin route definitions organizing all HTTP endpoints into logical groups.

## STRUCTURE
```
router/
├── main.go               # Main router setup
├── api.go                # Admin API routes (/api/*)
├── relay.go              # OpenAI-compatible relay routes (/v1/*)
├── dashboard.go          # Dashboard data routes (/dashboard/*)
└── web.go                # Static frontend serving (/*)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new API route | `api.go` | Admin/management endpoints |
| Add relay endpoint | `relay.go` | OpenAI-compatible endpoints |
| Modify route groups | `main.go` | Router group setup |
| Static file serving | `web.go` | Frontend asset serving |

## CONVENTIONS
- **Route groups**: Use `router.Group("/prefix")` for logical grouping
- **Middleware per group**: Apply middleware at group level, not individual routes
- **Handler naming**: Match function name to route purpose (e.g., `GetChannels`)
- **Method + Path**: Comment format `// @Summary` for API docs

## ANTI-PATTERNS (THIS MODULE)
- **DO NOT** add business logic in router file - delegate to controller
- **AVOID** complex middleware chains on individual routes - use group-level
- **DO NOT** forget to register new route groups in `main.go`
- **AVOID** hardcoded paths - use constants or config values

## ROUTE GROUPS
| Group | Prefix | Purpose | Middleware |
|-------|--------|---------|------------|
| API Router | `/api/*` | Admin API | TokenAuth, CORS |
| Relay Router | `/v1/*` | OpenAI-compatible API | TokenAuth, Distributor |
| Dashboard Router | `/dashboard/*` | Web dashboard data | SessionAuth |
| Web Router | `/*` | Static frontend | None |

## RELAY ENDPOINTS
- `POST /v1/chat/completions` - Chat completion (primary)
- `POST /v1/completions` - Legacy completion
- `POST /v1/embeddings` - Text embeddings
- `POST /v1/images/generations` - Image generation
- `POST /v1/audio/*` - Audio transcription/synthesis
- `GET /v1/models` - Model listing

## KEY FILES
- `main.go`: `SetRouter()` mounts all route groups
- `api.go`: User, channel, token, redemption management
- `relay.go`: OpenAI-compatible API endpoints

## TESTING
- No dedicated router tests
- Integration tests cover API endpoints
- Use `gin.CreateTestContext()` for router unit tests
