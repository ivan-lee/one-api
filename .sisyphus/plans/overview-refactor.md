# 总览页面拆分重构计划

## TL;DR

> **Quick Summary**: 将总览页面拆分为4个子Tab（概览/时段分析/维度对比/模型洞察），采用Berry hash路由模式，降低单页面复杂度，职责单一化，提高开发和运维效率。
> 
> **Deliverables**:
> - Heatmap API后端实现（GetHeatmapData + /api/stats/heatmap路由）
> - DashboardV2页面框架（hash路由切换）
> - 4个独立Tab页面（概览/时段分析/维度对比/模型洞察）
> - DashboardContext全局状态管理
> - 导航入口 + i18n翻译 + Playwright测试
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Backend API → Frontend Shell → Tab Implementation → QA

---

## Context

### Original Request
用户希望将总览菜单拆分为多个子tab页面，类似系统设置的组织方式，避免在一个页面展示过多信息显得杂乱，职责不够单一，开发和运维成本也更高。参考系统设置页面的实现风格和方式对总览页面进行拆分，前期先新增一个大类，等模块开发测试完毕后再移除旧的总览模块。

### Interview Summary
**Key Discussions**:
- 拆分方案: 方案A - 按分析维度拆分（概览/时段分析/维度对比/模型洞察）
- 实现方式: Berry主题hash路由模式（支持前进后退，URL记忆）
- 状态同步: 混合方案（时间+粒度全局共享，维度筛选按Tab定制）
- 主题范围: 仅default主题
- 测试策略: Agent QA验证（无自动化测试）
- 迁移策略: 前期保留旧总览，测试后移除

**Research Findings**:
- 当前总览页面（Dashboard/index.js）894行，包含7个图表模块，过于庞大
- Berry主题系统设置使用hash路由切换（`web/berry/src/views/Setting/index.js:34-60`）
- Heatmap API未实现，需要先完成Task 6b才能使用热力图
- 三线形图共享数据源和转换逻辑，应保持在同一Tab避免性能问题

### Metis Review
**Identified Gaps** (addressed):
- Heatmap API缺失: 选择方案A - 先实现后端
- 概览Tab内容未定义: 确认包含核心指标卡片 + 三线形图 + 7天摘要 + 筛选器
- 筛选器矩阵未定义: 确认混合方案（全局时间+粒度，Tab定制维度筛选）

---

## Work Objectives

### Core Objective
将总览页面从单页面894行重构为职责单一的4个Tab页面，采用hash路由切换，降低开发复杂度，提高用户体验和运维效率。

### Concrete Deliverables
- 后端Heatmap API（1个endpoint + 1个handler）
- DashboardV2主页面（hash路由框架 + 4个Tab容器）
- 4个Tab页面组件（概览/时段分析/维度对比/模型洞察）
- DashboardContext（全局状态管理）
- Header导航入口（过渡期）
- i18n翻译（中英文）
- Playwright QA测试（6个关键场景）

### Definition of Done
- [ ] Heatmap API可正常返回168个数据点（7天×24小时）
- [ ] DashboardV2支持hash路由切换（URL同步，前进后退）
- [ ] 概览Tab显示核心指标卡片 + 三线形图 + 7天摘要
- [ ] 时段分析Tab显示热力图 + 趋势图
- [ ] 维度对比Tab显示GroupedBarChart + RadarChart
- [ ] 模型洞察Tab显示模型堆叠图 + RadarChart
- [ ] 全局筛选器（时间+粒度）跨Tab共享
- [ ] 每个Tab有独立的维度筛选器
- [ ] 所有Tab切换无卡顿，数据正确显示
- [ ] i18n翻译完整（中英文）

### Must Have
- Heatmap API后端实现（GetHeatmapData + route）
- Berry hash路由模式（URL hash + hashchange监听）
- 概览Tab包含核心指标卡片 + 三线形图 + 7天摘要 + 筛选器
- 混合状态管理（全局时间+粒度，Tab定制维度筛选）
- 旧总览页面保留（过渡期，路由 /dashboard）
- 新总览页面独立（路由 /dashboard-v2）
- Agent QA验证（Playwright测试）

### Must NOT Have (Guardrails)
- 不删除旧Dashboard页面（过渡期必须保留）
- 不修改现有Dashboard的任何逻辑（避免影响现有用户）
- 不实现berry/air主题（仅default主题）
- 不添加自动化测试（仅Agent QA）
- 不拆分三线形图到不同Tab（共享数据转换，避免性能问题）
- 不添加新的图表类型（仅重组现有图表）
- 不修改后端除Heatmap外的任何API

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: N/A
- **Agent-Executed QA**: Mandatory for all tasks

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (go build) — Build, run, verify endpoint

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — Backend API):
├── Task 1: Implement Heatmap API backend [quick]
└── Task 1 complete → Unblocks Tasks 3, 4

Wave 2 (After Wave 1 — Frontend Foundation):
├── Task 2: Register DashboardV2 route in App.js [quick]
├── Task 3: Create DashboardV2 main component with hash routing [visual-engineering]
├── Task 4: Create DashboardContext for global state [quick]
└── Task 5: Create global filter components (TimeRange + Granularity) [quick]

Wave 3 (After Wave 2 — Tab Implementation):
├── Task 6: Implement Overview Tab [visual-engineering]
├── Task 7: Implement TimeAnalysis Tab [visual-engineering]
├── Task 8: Implement DimensionComparison Tab [visual-engineering]
└── Task 9: Implement ModelInsight Tab [visual-engineering]

Wave 4 (After Wave 3 — Integration + QA):
├── Task 10: Add navigation entry in Header [quick]
├── Task 11: Add i18n translations [quick]
└── Task 12: Playwright QA testing [unspecified-high]

Wave FINAL (After ALL tasks — Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 3 → Task 6-9 → Task 12 → F1-F4 → user okay
Parallel Speedup: ~40% faster than sequential
Max Concurrent: 4 (Waves 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 3, 7, 9 |
| 2 | - | 3-9, 10 |
| 3 | 1, 2, 4 | 6-9 |
| 4 | - | 3, 6-9 |
| 5 | - | 6-9 |
| 6-9 | 1, 3-5 | F1-F4 |
| 10 | 2 | F1-F4 |
| 11 | - | F1-F4 |
| 12 | 1-11 | F1-F4 |
| F1-F4 | 1-12 | user okay |

### Agent Dispatch Summary

- **Wave 1**: **1** — T1-quick (backend API)
- **Wave 2**: **4** — T2-quick, T3-visual-engineering, T4-quick, T5-quick
- **Wave 3**: **4** — T6-visual-engineering, T7-visual-engineering, T8-visual-engineering, T9-visual-engineering
- **Wave 4**: **3** — T10-quick, T11-quick, T12-unspecified-high
- **FINAL**: **4** — F1-oracle, F2-unspecified-high, F3-unspecified-high, F4-deep

---

## TODOs

> Implementation + QA = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [x] 1. **Backend: Implement Heatmap API endpoint**

  **What to do**:
  - Create `GetHeatmapData()` in `controller/statistics.go`
  - Query logs aggregated by hour (0-23) × weekday (1-7) = 168 data points
  - Use SQL date functions (MySQL: HOUR(), DAYOFWEEK(); PostgreSQL: EXTRACT; SQLite: strftime)
  - Return array: `{hour, weekday, request_count, quota, tokens}`
  - Add route `GET /api/stats/heatmap` with `UserAuth()` middleware
  - Support time range parameters (`start_timestamp`, `end_timestamp`)
  - Handle deleted channels: show "Deleted Channel #ID"

  **Must NOT do**:
  - Do NOT modify other existing APIs
  - Do NOT add authentication changes beyond UserAuth()
  - Do NOT implement granularity parameter (heatmap uses fixed hour/weekday grid)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple API endpoint following existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (standalone)
  - **Blocks**: Task 7 (TimeAnalysis Tab), Task 9 (ModelInsight Tab)
  - **Blocked By**: None

  **References**:
  - `controller/statistics.go:99-142` - GetTokenStats pattern to follow
  - `model/log.go:27` - ChannelId field
  - `router/api.go` - Where to add new route
  - `controller/user.go:GetUserDashboard()` - Time range parameter handling
  - SQL date functions: MySQL HOUR(), DAYOFWEEK()

  **Acceptance Criteria**:
  - [ ] GET /api/stats/heatmap returns array with hour (0-23), weekday (1-7)
  - [ ] Returns request_count, quota, tokens per hour×weekday combination
  - [ ] Supports start_timestamp, end_timestamp parameters
  - [ ] UserAuth middleware applied
  - [ ] Handles deleted channels with "Deleted Channel #ID"

  **QA Scenarios**:
  ```
  Scenario: Heatmap API returns correct structure
    Tool: Bash (curl)
    Steps:
      1. Calculate timestamps for last 7 days
      2. curl "http://localhost:3000/api/stats/heatmap?start_timestamp=X&end_timestamp=Y" -H "Authorization: Bearer $TOKEN"
      3. Assert response contains array with {hour, weekday, request_count, quota, tokens}
      4. Verify hour range is 0-23, weekday range is 1-7
    Expected Result: Returns 168 data points (7 days × 24 hours)
    Evidence: .sisyphus/evidence/task-01-heatmap-api.txt

  Scenario: Heatmap handles deleted channels
    Tool: Bash (curl)
    Steps:
      1. Create a channel, make requests, delete the channel
      2. Query heatmap API
      3. Assert deleted channel logs still appear with "Deleted Channel #ID"
    Expected Result: Deleted channels handled gracefully
    Evidence: .sisyphus/evidence/task-01-deleted-channel.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add heatmap data endpoint for weekly usage pattern`
  - Files: `controller/statistics.go`, `router/api.go`

- [x] 2. **Frontend: Register DashboardV2 route in App.js**

  **What to do**:
  - Add route `/dashboard-v2` in `web/default/src/App.js`
  - Use PrivateRoute wrapper (same as existing Dashboard)
  - Add Suspense with Loading component
  - Import DashboardV2 component (lazy import)

  **Must NOT do**:
  - Do NOT modify existing `/dashboard` route
  - Do NOT add redirect logic (transition period keeps both separate)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple route registration following existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 3-10
  - **Blocked By**: None

  **References**:
  - `web/default/src/App.js:311-318` - Existing Dashboard route pattern
  - `web/default/src/App.js:1-20` - Route structure and PrivateRoute usage

  **Acceptance Criteria**:
  - [ ] Route `/dashboard-v2` registered in App.js
  - [ ] PrivateRoute wrapper applied
  - [ ] Lazy import with Suspense

  **QA Scenarios**:
  ```
  Scenario: Route registration verified
    Tool: Bash
    Steps:
      1. grep "dashboard-v2" web/default/src/App.js
      2. Assert route definition exists with PrivateRoute
    Expected Result: Route found in App.js
    Evidence: .sisyphus/evidence/task-02-route.txt
  ```

  **Commit**: YES
  - Message: `feat(web): register DashboardV2 route`
  - Files: `web/default/src/App.js`

- [x] 3. **Frontend: Create DashboardV2 main component with hash routing**

  **What to do**:
  - Create `web/default/src/pages/DashboardV2/index.js`
  - Implement Berry-style hash routing pattern:
    - Use `useLocation` and `useNavigate` from react-router
    - Define tabMap: `{overview: 0, time-analysis: 1, dimension-comparison: 2, model-insight: 3}`
    - Handle `hashchange` event listener
    - Update hash on tab change: `navigate('#time-analysis')`
  - Use Semantic UI Tab component (adapted for hash routing)
  - Define 4 tab panes with placeholders for Task 6-9
  - Handle invalid hash → redirect to `#overview`
  - Support deep linking: direct navigation to `/dashboard-v2#model-insight`

  **Must NOT do**:
  - Do NOT use MUI components (stick to Semantic UI for default theme)
  - Do NOT implement tab content (only shell, content in Tasks 6-9)
  - Do NOT modify existing Dashboard component

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI component with hash routing pattern
  - **Skills**: [`frontend-ui-ux`]
    - For proper hash routing adaptation and UI consistency

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1, 2, 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6-9
  - **Blocked By**: Task 1 (Heatmap API), Task 2 (route), Task 4 (context)

  **References**:
  - `web/berry/src/views/Setting/index.js:34-60` - Berry hash routing pattern to follow
  - `web/default/src/pages/Setting/index.js` - Semantic UI Tab component usage
  - `web/default/src/pages/Dashboard/index.js` - Existing Dashboard structure to reference
  - React Router docs: useLocation, useNavigate, hashchange

  **Acceptance Criteria**:
  - [ ] Component renders with 4 tabs
  - [ ] Hash routing works: URL updates on tab change
  - [ ] Browser back/forward navigates tabs correctly
  - [ ] Invalid hash redirects to `#overview`
  - [ ] Deep linking works: `/dashboard-v2#model-insight` shows correct tab

  **QA Scenarios**:
  ```
  Scenario: Hash routing updates URL
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2"
      2. Click tab "时段分析"
      3. Assert URL hash equals "#time-analysis"
      4. Assert tab panel visible
    Expected Result: URL and UI synchronized
    Evidence: .sisyphus/evidence/task-03-hash-routing.png

  Scenario: Browser back/forward navigation
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#overview"
      2. Click "#time-analysis" tab
      3. Click "#model-insight" tab
      4. Press browser.back() → URL → #time-analysis
      5. Assert correct tab visible
      6. Press browser.back() → URL → #overview
      7. Assert overview tab visible
    Expected Result: Browser history navigates tabs correctly
    Evidence: .sisyphus/evidence/task-03-back-forward.png

  Scenario: Invalid hash redirects to default
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#invalid-tab"
      2. Assert URL redirected to "#overview"
      3. Assert overview tab visible
    Expected Result: Invalid hashes handled gracefully
    Evidence: .sisyphus/evidence/task-03-invalid-hash.png
  ```

  **Commit**: YES
  - Message: `feat(web): add DashboardV2 main component with hash routing`
  - Files: `web/default/src/pages/DashboardV2/index.js`

- [x] 4. **Frontend: Create DashboardContext for global state**

  **What to do**:
  - Create `web/default/src/pages/DashboardV2/context/DashboardContext.js`
  - Define global state:
    - `timeRange` - {startTimestamp, endTimestamp, preset}
    - `granularity` - 'hour' | 'day' | 'week' | 'month'
    - `dashboardData` - primary dataset from /api/user/dashboard
    - `heatmapData` - data from /api/stats/heatmap
    - `channelData` - data from /api/stats/channels
  - Provide actions:
    - `setTimeRange(range)` - update time range and refetch all data
    - `setGranularity(gran)` - update granularity and refetch primary data
    - `fetchDashboardData()` - fetch /api/user/dashboard
    - `fetchHeatmapData()` - fetch /api/stats/heatmap
    - `fetchChannelData()` - fetch /api/stats/channels
  - Use React Context API (createContext + useContext)
  - Handle loading and error states

  **Must NOT do**:
  - Do NOT add tab-specific state (only global shared state)
  - Do NOT implement dimension filters (handled per-tab in Tasks 6-9)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple state management pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 3, Task 6-9
  - **Blocked By**: None

  **References**:
  - React Context API docs
  - `web/default/src/pages/Dashboard/index.js` - Current state management pattern
  - `web/default/src/helpers/` - API helper patterns

  **Acceptance Criteria**:
  - [ ] DashboardContext created with global state
  - [ ] setTimeRange updates state and triggers refetch
  - [ ] setGranularity updates state and triggers refetch
  - [ ] fetchDashboardData returns data from /api/user/dashboard
  - [ ] fetchHeatmapData returns data from /api/stats/heatmap
  - [ ] fetchChannelData returns data from /api/stats/channels
  - [ ] Loading and error states handled

  **QA Scenarios**:
  ```
  Scenario: Context provides global state
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#overview"
      2. Set timeRange to "2024-01-01 to 2024-01-07"
      3. Assert context state updated
      4. Switch to "#time-analysis" tab
      5. Assert timeRange still shows "2024-01-01 to 2024-01-07"
    Expected Result: Global state shared across tabs
    Evidence: .sisyphus/evidence/task-04-context-state.png
  ```

  **Commit**: YES
  - Message: `feat(web): add DashboardContext for global state management`
  - Files: `web/default/src/pages/DashboardV2/context/DashboardContext.js`

- [x] 5. **Frontend: Create global filter components (TimeRange + Granularity)**

  **What to do**:
  - Create `web/default/src/pages/DashboardV2/components/GlobalFilters.js`
  - Include DatePickerWithPresets component (reuse from token-monitor-enhancement)
  - Include GranularitySelector component (reuse from token-monitor-enhancement)
  - Place filters at top of DashboardV2 (sticky position, always visible)
  - Connect to DashboardContext: call setTimeRange, setGranularity on change
  - Use Semantic UI styling to match existing components

  **Must NOT do**:
  - Do NOT include dimension filters (handled per-tab)
  - Do NOT modify existing DatePickerWithPresets or GranularitySelector components

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple component composition using existing filters
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6-9
  - **Blocked By**: Task 4 (DashboardContext)

  **References**:
  - `web/default/src/components/DatePickerWithPresets.js` - Existing component
  - `web/default/src/components/GranularitySelector.js` - Existing component
  - `web/default/src/pages/Dashboard/index.js:582-608` - Filter placement pattern

  **Acceptance Criteria**:
  - [ ] GlobalFilters component created
  - [ ] DatePickerWithPresets integrated
  - [ ] GranularitySelector integrated
  - [ ] Connected to DashboardContext
  - [ ] Sticky positioning applied

  **QA Scenarios**:
  ```
  Scenario: Global filters affect all tabs
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#overview"
      2. Set timeRange to "2024-01-01 to 2024-01-07"
      3. Set granularity to "day"
      4. Click "#time-analysis" tab
      5. Assert timeRange still shows "2024-01-01 to 2024-01-07"
      6. Assert granularity still shows "day"
    Expected Result: Filters persist across tabs
    Evidence: .sisyphus/evidence/task-05-filter-persistence.png
  ```

  **Commit**: YES
  - Message: `feat(web): add global filter components for DashboardV2`
  - Files: `web/default/src/pages/DashboardV2/components/GlobalFilters.js`

- [x] 6. **Frontend: Implement Overview Tab**

  **What to do**:
  - Create `web/default/src/pages/DashboardV2/tabs/Overview.js`
  - Include 4 sections:
    1. **核心指标卡片** - 3 large number cards: 今日消费, 今日请求量, 今日Tokens (从dashboardData提取)
    2. **趋势线形图** - Reuse 3 LineCharts from Dashboard/index.js (请求量, 消费, Tokens)
    3. **7天统计摘要** - Summary card showing: 总请求, 总消费, Top3渠道, Top3模型 (计算自dashboardData)
    4. **筛选器控制面板** - Already in GlobalFilters (Task 5), no additional filters needed
  - Connect to DashboardContext for data and global filters
  - Use Semantic UI Grid layout (2 columns: cards left, charts right)
  - Handle loading state: show Loading component while data fetches
  - Handle error state: show error message if data fetch fails

  **Must NOT do**:
  - Do NOT add additional filters (only global time+granularity)
  - Do NOT modify existing LineChart components
  - Do NOT create new chart types (reuse existing)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex tab layout with multiple data visualizations
  - **Skills**: [`frontend-ui-ux`]
    - For proper layout design and data card styling

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 7-9)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 3 (shell), Task 4 (context), Task 5 (filters)

  **References**:
  - `web/default/src/pages/Dashboard/index.js:611-763` - LineCharts to reuse
  - `web/default/src/pages/Dashboard/index.js:179-215` - Data transformation patterns
  - Semantic UI Card component docs
  - `web/default/src/pages/DashboardV2/context/DashboardContext.js` - Context usage

  **Acceptance Criteria**:
  - [ ] 3 metric cards display: 今日消费, 今日请求量, 今日Tokens
  - [ ] 3 LineCharts render with correct data
  - [ ] 7天摘要 shows: 总请求, 总消费, Top3渠道, Top3模型
  - [ ] Loading state shows when data fetches
  - [ ] Error state shows if fetch fails

  **QA Scenarios**:
  ```
  Scenario: Overview tab displays all components
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#overview"
      2. Assert 3 metric cards visible
      3. Assert 3 LineCharts visible
      4. Assert 7天摘要 visible
      5. Hover over LineChart and verify tooltip
    Expected Result: All sections render correctly
    Evidence: .sisyphus/evidence/task-06-overview-full.png

  Scenario: Overview responds to global filters
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#overview"
      2. Change timeRange to "2024-01-01 to 2024-01-07"
      3. Assert LineCharts update with new data
      4. Assert metric cards update with new values
    Expected Result: Filters affect overview content
    Evidence: .sisyphus/evidence/task-06-overview-filter.png
  ```

  **Commit**: YES
  - Message: `feat(web): implement Overview Tab with metrics and charts`
  - Files: `web/default/src/pages/DashboardV2/tabs/Overview.js`

- [x] 7. **Frontend: Implement TimeAnalysis Tab**

  **What to do**:
  - Create `web/default/src/pages/DashboardV2/tabs/TimeAnalysis.js`
  - Include 2 sections:
    1. **热力图** - HeatmapChart showing weekday × hour usage pattern (from heatmapData)
    2. **趋势线形图** - Same 3 LineCharts as Overview (请求量, 消费, Tokens)
  - Add tab-specific filters:
    - **渠道筛选** - Dropdown selecting channel (from DimensionFilter component)
    - **模型筛选** - Dropdown selecting model (from DimensionFilter component)
  - Connect to DashboardContext for global state + heatmapData
  - Use Semantic UI Grid layout (2 rows: heatmap top, charts bottom)
  - Handle heatmap API failure: show "API未可用" message if heatmapData is null
  - Apply filters: channel, model to heatmap and charts

  **Must NOT do**:
  - Do NOT implement granularity filter for heatmap (heatmap uses fixed hour/weekday grid)
  - Do NOT create HeatmapChart component (use existing from token-monitor-enhancement)
  - Do NOT modify HeatmapChart component

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex tab with heatmap and filters
  - **Skills**: [`frontend-ui-ux`]
    - For heatmap integration and filter UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 8, 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1 (Heatmap API), Task 3 (shell), Task 4 (context), Task 5 (filters)

  **References**:
  - `web/default/src/components/charts/HeatmapChart.js` - Existing component
  - `web/default/src/components/DimensionFilter.js` - Existing component
  - `web/default/src/pages/Dashboard/index.js:847-866` - Heatmap integration pattern
  - `web/default/src/pages/DashboardV2/context/DashboardContext.js` - Context usage

  **Acceptance Criteria**:
  - [ ] HeatmapChart renders with 168 data points
  - [ ] 3 LineCharts render correctly
  - [ ] Channel filter dropdown works
  - [ ] Model filter dropdown works
  - [ ] Filters affect heatmap and charts
  - [ ] API failure shows "API未可用" message

  **QA Scenarios**:
  ```
  Scenario: TimeAnalysis tab with heatmap
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#time-analysis"
      2. Assert HeatmapChart visible with 7x24 grid
      3. Assert 3 LineCharts visible
      4. Hover over heatmap cell and verify tooltip
    Expected Result: Heatmap and charts render correctly
    Evidence: .sisyphus/evidence/task-07-time-analysis.png

  Scenario: TimeAnalysis filters work
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#time-analysis"
      2. Select a channel from dropdown
      3. Assert heatmap shows only that channel's data
      4. Assert LineCharts filtered by channel
    Expected Result: Filters affect time analysis
    Evidence: .sisyphus/evidence/task-07-filter.png

  Scenario: Heatmap API failure handling
    Tool: Playwright
    Steps:
      1. Mock heatmap API failure (return null)
      2. Navigate to "/dashboard-v2#time-analysis"
      3. Assert "API未可用" message shown
      4. Assert LineCharts still render correctly
    Expected Result: Graceful failure handling
    Evidence: .sisyphus/evidence/task-07-api-failure.png
  ```

  **Commit**: YES
  - Message: `feat(web): implement TimeAnalysis Tab with heatmap and filters`
  - Files: `web/default/src/pages/DashboardV2/tabs/TimeAnalysis.js`

- [x] 8. **Frontend: Implement DimensionComparison Tab**

  **What to do**:
  - Create `web/default/src/pages/DashboardV2/tabs/DimensionComparison.js`
  - Include 2 sections:
    1. **GroupedBarChart** - Multi-dimensional comparison (channel, user-group, channel-group)
    2. **RadarChart** - Multi-metric comparison across dimensions
  - Add tab-specific filters:
    - **维度选择器** - Radio buttons: 渠道, 用户组, 渠道组
    - Update chart data based on selected dimension
  - Connect to DashboardContext for global state + channelData
  - Use Semantic UI Grid layout (2 columns: GroupedBarChart left, RadarChart right)
  - Fetch additional data if needed for user-group/channel-group (from /api/stats/user-groups, /api/stats/channel-groups)
  - Handle loading state

  **Must NOT do**:
  - Do NOT implement granularity filter (charts don't use granularity)
  - Do NOT create GroupedBarChart or RadarChart (use existing from token-monitor-enhancement)
  - Do NOT modify existing chart components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex tab with multiple charts and dimension selection
  - **Skills**: [`frontend-ui-ux`]
    - For chart integration and dimension selector UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7, 9)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 3 (shell), Task 4 (context), Task 5 (filters)

  **References**:
  - `web/default/src/components/charts/GroupedBarChart.js` - Existing component
  - `web/default/src/components/charts/RadarChart.js` - Existing component
  - `web/default/src/pages/Dashboard/index.js:824-845` - GroupedBarChart integration
  - `web/default/src/pages/Dashboard/index.js:868-887` - RadarChart integration
  - `/api/stats/user-groups`, `/api/stats/channel-groups` - APIs for additional data

  **Acceptance Criteria**:
  - [ ] GroupedBarChart renders with dimension data
  - [ ] RadarChart renders with multi-metric comparison
  - [ ] Dimension selector (渠道/用户组/渠道组) works
  - [ ] Charts update on dimension change
  - [ ] Loading state handled

  **QA Scenarios**:
  ```
  Scenario: DimensionComparison tab displays charts
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#dimension-comparison"
      2. Assert GroupedBarChart visible
      3. Assert RadarChart visible
      4. Assert dimension selector visible
      5. Hover over charts and verify tooltips
    Expected Result: All charts render correctly
    Evidence: .sisyphus/evidence/task-08-dimension-comparison.png

  Scenario: Dimension selector changes charts
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#dimension-comparison"
      2. Select "用户组" dimension
      3. Assert GroupedBarChart shows user group data
      4. Assert RadarChart shows user group comparison
    Expected Result: Dimension selection affects charts
    Evidence: .sisyphus/evidence/task-08-dimension-change.png
  ```

  **Commit**: YES
  - Message: `feat(web): implement DimensionComparison Tab with dimension selector`
  - Files: `web/default/src/pages/DashboardV2/tabs/DimensionComparison.js`

- [x] 9. **Frontend: Implement ModelInsight Tab**

  **What to do**:
  - Create `web/default/src/pages/DashboardV2/tabs/ModelInsight.js`
  - Include 2 sections:
    1. **模型堆叠图** - Stacked BarChart showing model token distribution over time (from dashboardData)
    2. **雷达图** - RadarChart showing multi-metric comparison across top models (from dashboardData)
  - Add tab-specific filters:
    - **模型筛选** - Dropdown selecting model (from DimensionFilter component)
  - Connect to DashboardContext for global state + dashboardData
  - Use Semantic UI Grid layout (2 rows: StackedBarChart top, RadarChart bottom)
  - Filter radar chart by selected model (or show top 5 if none selected)
  - Handle loading state

  **Must NOT do**:
  - Do NOT implement granularity filter for radar (radar uses aggregated metrics)
  - Do NOT create StackedBarChart or RadarChart (use existing from token-monitor-enhancement)
  - Do NOT modify existing chart components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex tab with stacked charts and model filtering
  - **Skills**: [`frontend-ui-ux`]
    - For chart integration and model filter UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6-8)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Task 1 (Heatmap API), Task 3 (shell), Task 4 (context), Task 5 (filters)

  **References**:
  - `web/default/src/components/charts/StackedBarChart.js` - Existing component
  - `web/default/src/components/charts/RadarChart.js` - Existing component
  - `web/default/src/pages/Dashboard/index.js:765-813` - StackedBarChart integration
  - `web/default/src/pages/Dashboard/index.js:868-887` - RadarChart integration
  - `web/default/src/components/DimensionFilter.js` - Model filter
  - `web/default/src/pages/DashboardV2/context/DashboardContext.js` - Context usage

  **Acceptance Criteria**:
  - [ ] StackedBarChart renders with model distribution over time
  - [ ] RadarChart renders with top 5 models multi-metric comparison
  - [ ] Model filter dropdown works
  - [ ] Filter affects radar chart (show selected model or top 5)
  - [ ] Loading state handled

  **QA Scenarios**:
  ```
  Scenario: ModelInsight tab displays charts
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#model-insight"
      2. Assert StackedBarChart visible
      3. Assert RadarChart visible
      4. Assert model filter dropdown visible
      5. Hover over charts and verify tooltips
    Expected Result: All charts render correctly
    Evidence: .sisyphus/evidence/task-09-model-insight.png

  Scenario: Model filter affects radar chart
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#model-insight"
      2. Select a model from dropdown
      3. Assert RadarChart shows selected model's metrics
      4. Assert StackedBarChart highlights selected model
    Expected Result: Model filter affects charts
    Evidence: .sisyphus/evidence/task-09-model-filter.png
  ```

  **Commit**: YES
  - Message: `feat(web): implement ModelInsight Tab with model analysis charts`
  - Files: `web/default/src/pages/DashboardV2/tabs/ModelInsight.js`

- [x] 10. **Frontend: Add navigation entry in Header**

  **What to do**:
  - Add "总览V2" navigation item in `web/default/src/components/Header.js`
  - Place alongside existing "总览" item (transition period)
  - Link to `/dashboard-v2` route
  - Use existing nav item styling
  - Add i18n key: `navigation.dashboardV2`

  **Must NOT do**:
  - Do NOT remove existing "总览" navigation item (transition period)
  - Do NOT add redirect from /dashboard to /dashboard-v2
  - Do NOT modify other navigation items

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple navigation item addition
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 11)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Task 2 (route)

  **References**:
  - `web/default/src/components/Header.js` - Existing nav structure
  - `web/default/src/locales/zh/translation.json` - i18n structure

  **Acceptance Criteria**:
  - [ ] "总览V2" nav item added in Header
  - [ ] Links to `/dashboard-v2`
  - [ ] i18n key added for zh and en

  **QA Scenarios**:
  ```
  Scenario: Navigation item works
    Tool: Playwright
    Steps:
      1. Navigate to "/"
      2. Click "总览V2" nav item
      3. Assert URL is "/dashboard-v2#overview"
      4. Assert DashboardV2 renders
    Expected Result: Navigation works correctly
    Evidence: .sisyphus/evidence/task-10-nav.png
  ```

  **Commit**: YES
  - Message: `feat(web): add DashboardV2 navigation entry in Header`
  - Files: `web/default/src/components/Header.js`

- [x] 11. **Frontend: Add i18n translations**

  **What to do**:
  - Add new translation keys to `web/default/src/locales/zh/translation.json`
  - Add same keys to `web/default/src/locales/en/translation.json`
  - Keys needed:
    - `navigation.dashboardV2`: "总览V2" / "Dashboard V2"
    - `dashboardV2.tabs.overview`: "概览" / "Overview"
    - `dashboardV2.tabs.timeAnalysis`: "时段分析" / "Time Analysis"
    - `dashboardV2.tabs.dimensionComparison`: "维度对比" / "Dimension Comparison"
    - `dashboardV2.tabs.modelInsight`: "模型洞察" / "Model Insight"
    - `dashboardV2.metrics.todayRequests`: "今日请求量" / "Today Requests"
    - `dashboardV2.metrics.todayQuota`: "今日消费" / "Today Quota"
    - `dashboardV2.metrics.todayTokens`: "今日Tokens" / "Today Tokens"
    - `dashboardV2.summary.totalRequests`: "总请求" / "Total Requests"
    - `dashboardV2.summary.totalQuota`: "总消费" / "Total Quota"
    - `dashboardV2.summary.topChannels`: "Top3渠道" / "Top3 Channels"
    - `dashboardV2.summary.topModels`: "Top3模型" / "Top3 Models"
    - `dashboardV2.filters.dimension`: "维度选择" / "Dimension"
    - `dashboardV2.filters.channel`: "渠道" / "Channel"
    - `dashboardV2.filters.userGroup`: "用户组" / "User Group"
    - `dashboardV2.filters.channelGroup`: "渠道组" / "Channel Group"
    - `dashboardV2.filters.model`: "模型" / "Model"
    - `dashboardV2.errors.apiUnavailable`: "API未可用" / "API Unavailable"
    - `dashboardV2.loading`: "加载中..." / "Loading..."

  **Must NOT do**:
  - Do NOT modify existing translation keys
  - Do NOT add keys for other languages (only zh and en)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple translation key additions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 10)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: None

  **References**:
  - `web/default/src/locales/zh/translation.json` - Existing zh translations
  - `web/default/src/locales/en/translation.json` - Existing en translations

  **Acceptance Criteria**:
  - [ ] All new keys added to zh translation
  - [ ] All new keys added to en translation
  - [ ] No missing translation warnings

  **QA Scenarios**:
  ```
  Scenario: Translations render correctly
    Tool: Playwright
    Steps:
      1. Navigate to "/dashboard-v2#overview" (zh locale)
      2. Assert tab labels show: "概览", "时段分析", "维度对比", "模型洞察"
      3. Assert metric cards show: "今日请求量", "今日消费", "今日Tokens"
      4. Switch to en locale
      5. Assert tab labels show: "Overview", "Time Analysis", "Dimension Comparison", "Model Insight"
    Expected Result: All translations render correctly
    Evidence: .sisyphus/evidence/task-11-i18n.png
  ```

  **Commit**: YES
  - Message: `feat(i18n): add DashboardV2 translations (zh/en)`
  - Files: `web/default/src/locales/zh/translation.json`, `web/default/src/locales/en/translation.json`

- [x] 12. **QA: Playwright comprehensive testing**

  **What to do**:
  - Create `tests/dashboard-v2.spec.js` (Playwright test file)
  - Implement comprehensive test scenarios covering all critical user flows:
    - Scenario 1: Hash routing updates URL
    - Scenario 2: Browser back/forward navigation
    - Scenario 3: Deep linking restores tab state
    - Scenario 4: Invalid hash redirects to default
    - Scenario 5: Global filter persists across tabs
    - Scenario 6: Tab-specific filters work independently
    - Scenario 7: Heatmap graceful failure (if API missing)
    - Scenario 8: All charts render correctly in each tab
    - Scenario 9: Loading and error states
    - Scenario 10: i18n switching works
  - Run all tests and capture screenshots as evidence
  - Generate test report with pass/fail status

  **Must NOT do**:
  - Do NOT skip any scenario from the list above
  - Do NOT modify test configuration (use existing Playwright setup)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Comprehensive QA testing requiring thorough scenario coverage
  - **Skills**: [`playwright`]
    - For browser automation and screenshot capture

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential after all implementation)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 1-11

  **References**:
  - Playwright documentation: https://playwright.dev/
  - `tests/` - Existing test patterns (if any)
  - All QA scenarios from Tasks 1-11

  **Acceptance Criteria**:
  - [ ] All 10 scenarios tested
  - [ ] Screenshots captured for each scenario
  - [ ] Test report generated with pass/fail status
  - [ ] Evidence files saved to `.sisyphus/evidence/`

  **QA Scenarios**:
  ```
  Scenario: Comprehensive QA suite execution
    Tool: Playwright
    Steps:
      1. Run playwright test tests/dashboard-v2.spec.js
      2. Capture screenshots for each scenario
      3. Generate test report
      4. Verify all 10 scenarios pass
    Expected Result: All scenarios pass with evidence captured
    Evidence: .sisyphus/evidence/task-12-qa-report.txt
  ```

  **Commit**: YES
  - Message: `test(web): add comprehensive Playwright tests for DashboardV2`
  - Files: `tests/dashboard-v2.spec.js`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `go build` + `cd web/default && npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration. Test edge cases: empty state, invalid input. Save evidence.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Scope Creep [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Individual commits per task** with semantic commit messages
- Final verification commits only after F1-F4 approval

---

## Success Criteria

### Verification Commands
```bash
# Backend API test
curl "http://localhost:3000/api/stats/heatmap?start_timestamp=X&end_timestamp=Y" -H "Authorization: Bearer $TOKEN"

# Frontend build
cd web/default && npm run build

# Route verification
curl "http://localhost:3000/dashboard-v2" -I
```

### Final Checklist
- [ ] Heatmap API返回168个数据点
- [ ] DashboardV2路由可访问
- [ ] Hash路由切换正常（URL同步）
- [ ] 概览Tab显示完整内容
- [ ] 时段分析Tab热力图显示
- [ ] 维度对比Tab图表正常
- [ ] 模型洞察Tab图表正常
- [ ] 全局筛选器跨Tab共享
- [ ] i18n翻译完整
- [ ] Playwright测试全部通过
- [ ] 旧Dashboard未受影响