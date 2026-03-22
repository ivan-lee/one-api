# Web Frontend

## OVERVIEW
Multi-theme React frontend with 3 themes (default, berry, air). Built and embedded into Go binary.

## STRUCTURE
```
web/
├── build.sh                # Multi-theme build script
├── THEMES                  # Registered theme list
├── default/                # Default theme (reference)
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── helpers/        # Utility functions
│   │   ├── constants/      # Constants
│   │   └── App.js
│   └── build/              # Build output (embedded)
├── berry/                  # Berry theme (MUI-based)
└── air/                    # Air theme (minimal)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new theme | Create `web/{theme}/` | Follow existing theme structure |
| Modify UI components | `web/{theme}/src/components/` | React components |
| Build all themes | `web/build.sh` | Parallel build script |
| Theme registration | `THEMES` + `common/config/config.go` | Register new theme |

## CONVENTIONS
- **Build command**: `DISABLE_ESLINT_PLUGIN='true' npm run build`
- **Output**: `mv -f build ../build/{theme_name}`
- **Version injection**: `REACT_APP_VERSION=$(git describe --tags)`
- **Dev proxy**: All themes proxy to `http://localhost:3000`
- **Code style**: `singleQuote: true`, `jsxSingleQuote: true` (Prettier)

## ANTI-PATTERNS (THIS MODULE)
- **DO NOT** commit `node_modules/` or `build/` directories
- **DO NOT** skip theme registration in `THEMES` and `common/config/config.go`
- **AVOID** hardcoding API endpoints - use environment-based config
- **DO NOT** forget to update all 3 themes when adding features (or document as default-only)
- **AVOID** ESLint during build - causes failures (`DISABLE_ESLINT_PLUGIN='true'`)

## UNIQUE STYLES
1. **Multi-Theme Architecture**: Each theme is independent React app
2. **Embedded Build**: Frontend compiled into Go binary via `//go:embed`
3. **Theme Switching**: Runtime theme selection via `THEME` env var
4. **Parallel Build**: `build.sh` builds all themes concurrently

## CRITICAL WARNINGS
- Not all themes are kept in sync - default theme updated first
- Berry theme uses MUI (Material-UI), default uses Ant Design
- Air theme is minimal - may lack latest features
- Always test theme switching after frontend changes

## BUILD PROCESS
```bash
cd web && ./build.sh
# Builds: default, berry, air in parallel
# Output: web/build/{theme}/
# Embedded: //go:embed web/build/*
```

## DEVELOPMENT
```bash
cd web/default && npm run dev  # Proxies to localhost:3000
```

## TESTING
- No automated frontend tests
- Manual testing required for all 3 themes
- Use browser DevTools to verify theme switching
