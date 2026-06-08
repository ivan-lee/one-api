
## Learnings: DashboardV2 QA Verification

**Date**: 2026-04-05
**Context**: Manual Playwright QA verification of DashboardV2

### Key Discovery: Embedded Frontend Architecture

**Learning**: One-API uses embedded frontend architecture where:
- Frontend React app is built into static files
- Static files embedded in Go binary via `//go:embed web/build/*`
- Backend serves frontend from embedded files, NOT from filesystem
- Frontend rebuild + backend recompile required for ANY UI changes

**Implications**:
1. Dev server (npm run dev) NOT used in production
2. Source file changes don't reflect until rebuild/recompile
3. QA verification must check if build/embedding happened
4. Hot-loading not possible with embedded frontend

### Pattern: Deployment Verification Before QA

**Pattern**: For embedded frontend projects, QA verification should:
1. Check if backend is serving embedded frontend (not dev server)
2. Verify build directory exists and is current
3. Check backend process type (Go binary vs dev server)
4. Confirm frontend rebuild timestamp vs source modification timestamp
5. Test route accessibility BEFORE detailed functional tests

**Avoids**: Wasted QA effort testing non-deployed features

### Pattern: Plan vs Deployment Discrepancy

**Pattern**: Plan checkboxes can show "completed" when:
- Source files created (implementation done)
- But deployment steps skipped (rebuild/recompile)
- Resulting in inaccessible features

**Recommendation**: Plans should have separate sections:
- Implementation tasks (source creation)
- Deployment tasks (build/recompile/restart)
- QA tasks (verification after deployment)

### Tool: Process Identification Critical

**Tool**: `lsof -ti:PORT` + `ps -p PID` essential for:
- Identifying backend type (Go binary vs dev server)
- Understanding deployment architecture
- Debugging route not found issues

**Used**: Identified Go backend serving embedded frontend, not dev server

### Pattern: Missing Imports in Multi-Tab Layouts

**Pattern**: When implementing multi-tab layouts:
- Easy to miss import for one tab
- Placeholder text used during development
- Must verify all tabs import actual components
- Should have checklist: "Import all tab components"

**Found**: DimensionComparison import missing in DashboardV2/index.js

### Console Errors Can Be Silent

**Finding**: No JavaScript console errors/warnings despite component not loading
- Lazy-loaded component failure doesn't always log error
- Network requests show only `/api/status`
- Component might fail to import without console error

**Lesson**: Absence of console errors doesn't prove component loaded

### Hash Routing Test Pattern

**Pattern**: For hash routing verification:
1. Set hash programmatically: `window.location.hash = 'value'`
2. Check URL changes: `window.location.href`
3. Take snapshot to verify page content
4. Check if component responds to hash change

**Result**: Hash set successfully, but component not present, so no response

