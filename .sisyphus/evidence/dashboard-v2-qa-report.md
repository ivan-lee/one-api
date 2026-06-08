# DashboardV2 Manual QA Verification Report

**Date**: 2026-04-05
**QA Agent**: Sisyphus-Junior
**Task**: Manual verification of DashboardV2 using Playwright browser automation

---

## Executive Summary

**CRITICAL BUG FOUND**: DashboardV2 page shows "页面不存在" (Page does not exist) despite source files being present. The root cause is that the Go backend server is serving an **embedded frontend build** that does NOT include the DashboardV2 component, even though all source files exist in `web/default/src/pages/DashboardV2/`.

---

## Verification Steps Completed

### 1. ✅ Route Accessibility Test
- **Action**: Navigate to `http://localhost:3000/dashboard-v2`
- **Result**: Page shows NotFound component ("页面不存在")
- **Status**: FAIL

### 2. ✅ Authentication Test
- **Action**: Login with credentials (root/123456)
- **Result**: Successful login, user stored in localStorage
- **Evidence**: `localStorage.getItem('user')` returns valid user object
- **Status**: PASS

### 3. ✅ Component Existence Check
- **Files Found**:
  - `web/default/src/pages/DashboardV2/index.js` (exists, 120 lines)
  - `web/default/src/pages/DashboardV2/context/DashboardContext.js` (exists)
  - `web/default/src/pages/DashboardV2/tabs/Overview.js` (exists, 13920 bytes)
  - `web/default/src/pages/DashboardV2/tabs/TimeAnalysis.js` (exists, 17993 bytes)
  - `web/default/src/pages/DashboardV2/tabs/DimensionComparison.js` (exists, 10781 bytes)
  - `web/default/src/pages/DashboardV2/tabs/ModelInsight.js` (exists, 9115 bytes)
  - `web/default/src/pages/DashboardV2/components/GlobalFilters.js` (exists)
- **Status**: PASS (all source files present)

### 4. ✅ Route Definition Check
- **File**: `web/default/src/App.js`
- **Location**: Lines 320-329
- **Route**: `/dashboard-v2` with `DashboardV2` lazy-loaded component
- **Status**: PASS (route correctly defined)

### 5. ✅ PrivateRoute Check
- **File**: `web/default/src/components/PrivateRoute.js`
- **Logic**: Checks `localStorage.getItem('user')` for authentication
- **Status**: PASS (authentication logic correct)

### 6. ❌ Hash Routing Test
- **Action**: Set `window.location.hash = 'overview'`
- **Result**: Still shows NotFound component
- **Status**: FAIL (component not loading at all)

### 7. ✅ Console Errors Check
- **Action**: Check browser console for errors/warnings
- **Result**: 0 errors, 0 warnings
- **Status**: PASS (no JavaScript errors)

### 8. ✅ Network Requests Check
- **Requests**: Only `/api/status` (200 OK)
- **Status**: PASS (backend accessible)

---

## Root Cause Analysis

### Primary Issue: Embedded Frontend Outdated

**Discovery Process**:
1. Checked port 3000 process: Found **Go backend server** (not React dev server)
   ```
   PID 1706: ___go_build_github_com_songquanpeng_one_api
   ```

2. Backend serves embedded frontend via `//go:embed web/build/*`

3. No build directory found at `web/default/build/`

4. Backend serves cached static JS: `/static/js/main.3710429e.js`

**Conclusion**: The Go backend binary was compiled with an **old frontend build** that predates DashboardV2 implementation. The source files exist, but they have NOT been built and embedded into the backend.

---

## Secondary Issue: Missing Import in DashboardV2/index.js

While examining `web/default/src/pages/DashboardV2/index.js`:

- **Line 5**: Imports `Overview`
- **Line 6**: Imports `TimeAnalysis`
- **Line 7**: Imports `ModelInsight`
- **Line 8**: Imports `GlobalFilters`
- **Line 79**: Uses **placeholder** for DimensionComparison instead of importing component

**Missing Import**:
```javascript
// Line 7 should have:
import DimensionComparison from './tabs/DimensionComparison';
```

**Impact**: If frontend were rebuilt, DimensionComparison tab would show placeholder text instead of actual component.

---

## Evidence Files

1. **Screenshot**: `dashboard-v2-page-not-found.png`
   - Shows NotFound component ("页面不存在")
   - URL: `http://localhost:3000/dashboard-v2`

2. **Console Logs**: No errors/warnings recorded

3. **Network Requests**: Only `/api/status` request successful

---

## Test Scenarios Status

| Scenario | Expected | Actual | Status |
|----------|----------|--------|--------|
| Route `/dashboard-v2` loads | DashboardV2 page | NotFound page | ❌ FAIL |
| Hash routing works | URL hash changes | Hash set, page unchanged | ❌ FAIL |
| Browser back/forward | Tab changes | Cannot test | ⏸️ BLOCKED |
| All 4 tabs render | 4 tabs visible | Cannot test | ⏸️ BLOCKED |
| Global filters visible | Filters present | Cannot test | ⏸️ BLOCKED |
| Console errors | 0 errors | 0 errors | ✅ PASS |

---

## Recommendations

### Immediate Fix Required

1. **Build frontend**:
   ```bash
   cd web/default && npm run build
   ```

2. **Rebuild Go backend** to embed new frontend:
   ```bash
   go build -ldflags "-s -w" -o one-api
   ```

3. **Restart backend** with new binary

4. **Add missing import** in `web/default/src/pages/DashboardV2/index.js`:
   ```javascript
   import DimensionComparison from './tabs/DimensionComparison';
   ```

5. **Replace placeholder** (line 79-82) with actual component:
   ```javascript
   render: () => (
     <Tab.Pane attached={false}>
       <DimensionComparison />
     </Tab.Pane>
   ),
   ```

### QA Verification Blocked

- Hash routing tests: **BLOCKED** (requires frontend rebuild)
- Tab switching tests: **BLOCKED** (requires frontend rebuild)
- Browser navigation tests: **BLOCKED** (requires frontend rebuild)
- Component rendering tests: **BLOCKED** (requires frontend rebuild)

---

## Plan Status Analysis

From `.sisyphus/plans/overview-refactor.md`:
- Tasks 1-11 marked as completed `[x]`
- **Reality**: Source files created, but **frontend NOT rebuilt**
- **Discrepancy**: Plan shows tasks complete, but deployment incomplete

---

## Conclusion

DashboardV2 implementation is **incomplete** due to frontend build not being performed. All source files exist, route is defined, but the deployed backend binary contains outdated frontend. This is a deployment/build issue, not a code issue.

**Next Steps**: Frontend rebuild + backend recompile required before QA can continue.