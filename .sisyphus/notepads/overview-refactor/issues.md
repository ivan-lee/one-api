
## Issue: DashboardV2 Source Files Exist But Not Embedded in Backend Build

**Date**: 2026-04-05
**Severity**: CRITICAL
**Category**: Deployment/Build

### Description

During QA verification, discovered that DashboardV2 source files exist in `web/default/src/pages/DashboardV2/`, but the Go backend binary is serving an outdated embedded frontend that does NOT include DashboardV2. The page shows NotFound component instead of DashboardV2.

### Root Cause

1. Go backend on port 3000 (`___go_build_github_com_songquanpeng_one_api`) serves embedded frontend via `//go:embed web/build/*`
2. Backend binary was compiled with old frontend build (pre-DashboardV2)
3. No frontend rebuild performed after DashboardV2 implementation
4. Backend not recompiled to embed new frontend

### Impact

- Route `/dashboard-v2` shows NotFound ("页面不存在")
- Hash routing tests blocked
- Tab switching tests blocked
- All DashboardV2 features inaccessible to users

### Evidence

- Process on port 3000: Go backend (PID 1706), NOT React dev server
- No build directory at `web/default/build/`
- Backend serves cached JS: `/static/js/main.3710429e.js`
- Screenshot: `.sisyphus/evidence/dashboard-v2-page-not-found.png`

### Required Fix

```bash
# Build frontend
cd web/default && npm run build

# Rebuild backend
go build -ldflags "-s -w" -o one-api

# Restart server
./one-api --port 3000
```

### Secondary Issue: Missing Import

`web/default/src/pages/DashboardV2/index.js` missing import:
- Line 7 should import `DimensionComparison`
- Line 79 uses placeholder instead of component

### QA Report

Full details: `.sisyphus/evidence/dashboard-v2-qa-report.md`
