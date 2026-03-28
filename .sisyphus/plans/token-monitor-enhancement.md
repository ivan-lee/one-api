# Token消耗监控增强方案

## TL;DR

> **Quick Summary**: 增强one-api的token消耗监控模块，从固定7天扩展为支持任意时间范围、多维度筛选、多时间粒度、数据导出的企业级监控系统。
> 
> **Deliverables**:
> - 自定义日期范围选择器（react-datepicker，预设+自定义）
> - 多维度筛选（渠道/用户分组/渠道分组/模型）
> - 时间粒度切换（小时/天/周/月）
> - CSV数据导出功能
> - 后端API增强支持新参数
> - 前端Dashboard/Stats页面重构
> - **新增图表**：分组对比柱状图、热力图、雷达图、堆叠分组柱状图
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Backend API → Frontend Components → Integration → QA

---

## Context

### Original Request
用户需要对企业级token消耗监控功能进行增强，当前只能查看最近7天数据，功能不足。需要支持任意时间、时间段、多维度的查询token消耗情况。

### Interview Summary
**Key Discussions**:
- 时间范围选择: 预设(7d/14d/30d/90d/本月/上月) + 自定义日期选择器(react-datepicker)
- 多维度筛选: 渠道维度(新增)、用户分组维度(新增)、渠道分组维度(新增)、模型维度(增强)
- 时间粒度: 小时/天/周/月可切换，不限制查询范围
- 数据导出: CSV格式
- 主题范围: 仅default主题
- 测试策略: 无自动化测试，Agent QA验证

**Research Findings**:
- 后端`GetUserDashboard()`硬编码7天，需修改支持时间参数
- `/api/stats/*`接口已支持`start_timestamp/end_timestamp`参数
- Log表有`ChannelId`字段(已有索引)但未在前端展示
- 前端使用Recharts图表库，可扩展
- 用户表和渠道表都有`Group`字段，需分别支持

### Metis Review
**Identified Gaps** (addressed):
- User Group vs Channel Group: 两者都实现
- 渠道权限控制: 普通用户仅看自己使用的渠道
- 时间粒度限制: 不强制限制，用户自行决定
- 时区处理：直接使用本地时间存储，不考虑全球化（用户确认）
- 删除实体处理: 显示"已删除渠道#ID"

---

## Work Objectives

### Core Objective
将one-api的token消耗监控从简单的7天固定视图，升级为企业级多维度分析系统，支持灵活的时间范围选择、细粒度维度筛选、多种时间粒度聚合和数据导出。

### Concrete Deliverables
- 后端新增/修改6个API接口
- 前端2个页面重构(Dashboard/Stats)
- 1个新的日期选择器组件
- 4个维度筛选器组件
- 1个时间粒度选择器组件
- 1个CSV导出功能
- 中英文国际化文案

### Definition of Done
- [ ] Dashboard页面支持自定义时间范围和维度筛选
- [ ] Stats页面支持渠道/用户分组/渠道分组维度
- [ ] 时间粒度切换功能正常工作
- [ ] CSV导出功能可正常下载
- [ ] 普通用户只能看到自己使用过的渠道统计
- [ ] 所有新文案有中英文翻译

### Must Have
- 自定义日期范围选择（预设+DatePicker）
- 渠道维度统计（权限控制）
- 用户分组维度统计
- 渠道分组维度统计
- 时间粒度切换
- CSV导出
- **分组对比柱状图**（渠道/用户组/渠道组对比）
- **热力图**（星期×小时使用高峰）
- **雷达图**（多维度多指标对比）
- **堆叠分组柱状图**（交叉维度分析）

### Must NOT Have (Guardrails)
- 不实现实时WebSocket推送
- 不实现告警系统
- 不实现时间段对比功能
- 不实现数据预测/趋势分析
- 不同步berry/air主题
- 不添加自动化测试

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
- **Library/Module**: Use Bash (go test if applicable) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — Backend API Foundation):
├── Task 1: Add time range support to GetUserDashboard API [quick]
├── Task 2: Add channel stats API endpoint [quick]
├── Task 3: Add user group stats API endpoint [quick]
├── Task 4: Add channel group stats API endpoint [quick]
├── Task 5: Add granularity parameter to aggregation queries [quick]
├── Task 6: Add CSV export API endpoint [quick]
└── Task 6b: Add heatmap data API endpoint (weekday x hour) [quick]

Wave 2 (After Wave 1 — Frontend Components):
├── Task 7: Install and configure react-datepicker [quick]
├── Task 8: Create DatePickerWithPresets component [visual-engineering]
├── Task 9: Create DimensionFilter component [visual-engineering]
├── Task 10: Create GranularitySelector component [quick]
├── Task 11: Create ExportButton component [quick]
├── Task 12: Update i18n translations (zh/en) [quick]
├── Task 12a: Create GroupedBarChart component [visual-engineering]
├── Task 12b: Create HeatmapChart component (weekday x hour) [visual-engineering]
├── Task 12c: Create RadarChart component [visual-engineering]
└── Task 12d: Create StackedGroupedBarChart component [visual-engineering]

Wave 3 (After Wave 2 — Page Integration):
├── Task 13: Refactor Dashboard page with new components and charts [deep]
├── Task 14: Refactor Stats page with new components [deep]
├── Task 15: Update TokenStats page with new components [deep]
└── Task 16: Add channel permission filter logic [quick]

Wave FINAL (After ALL tasks — Verification):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1-6b → Task 7-12d → Task 13-16 → F1-F4 → user okay
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 7 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1-6 | - | 7-16 |
| 6b | - | 12b |
| 7 | - | 8, 13-15 |
| 8 | 7 | 13-15 |
| 9 | - | 13-15 |
| 10 | - | 13-15 |
| 11 | 6 | 13-15 |
| 12 | - | 13-15 |
| 12a-12d | 2-5 | 13 |
| 13 | 1, 8-12d | F1-F4 |
| 14 | 2-5, 8-12 | F1-F4 |
| 15 | 8-12 | F1-F4 |
| 16 | 2, 14 | F1-F4 |
| F1-F4 | 13-16 | user okay |

### Agent Dispatch Summary

- **Wave 1**: **7** — All `quick` (backend API changes)
- **Wave 2**: **10** — T7-quick, T8-visual-engineering, T9-visual-engineering, T10-quick, T11-quick, T12-quick, T12a-visual-engineering, T12b-visual-engineering, T12c-visual-engineering, T12d-visual-engineering
- **Wave 3**: **4** — T13-deep, T14-deep, T15-deep, T16-quick
- **FINAL**: **4** — F1-oracle, F2-unspecified-high, F3-unspecified-high, F4-deep

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

- [ ] 1. **Backend: Add time range support to GetUserDashboard API**

  **What to do**:
  - Modify `controller/user.go:GetUserDashboard()` to accept `start_timestamp` and `end_timestamp` query parameters
  - Remove hardcoded 7-day logic (line 265-266)
  - Use `parseTimeRange()` pattern from `controller/token_stats.go:170-188`
  - Pass time range to `model.SearchLogsByDayAndModel()`
  - Return error if time range exceeds reasonable limits (optional: log warning for >365 days)

  **Must NOT do**:
  - Do NOT change the response format
  - Do NOT add new fields without backward compatibility
  - Do NOT modify the model layer query logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple parameter addition, following existing pattern
  - **Skills**: []
    - No special skills needed for Go parameter handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: Tasks 13 (Dashboard integration)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `controller/user.go:262-284` - Current GetUserDashboard implementation to modify
  - `controller/token_stats.go:170-188` - parseTimeRange pattern to follow
  - `model/log.go:319-345` - SearchLogsByDayAndModel function signature
  - `router/api.go:43` - Route definition for /api/user/dashboard

  **Acceptance Criteria**:
  - [ ] API accepts `start_timestamp` and `end_timestamp` parameters
  - [ ] Returns data for specified time range when parameters provided
  - [ ] Falls back to 7-day default when no parameters (backward compatible)
  - [ ] Response format unchanged

  **QA Scenarios**:
  ```
  Scenario: Custom time range query works
    Tool: Bash (curl)
    Steps:
      1. Calculate timestamps for last 30 days
      2. curl "http://localhost:3000/api/user/dashboard?start_timestamp=X&end_timestamp=Y" with auth
      3. Assert response contains data spanning 30 days
    Expected Result: Returns 30 days of data
    Evidence: .sisyphus/evidence/task-01-custom-range.txt

  Scenario: Default behavior unchanged
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:3000/api/user/dashboard" with auth (no time params)
      2. Assert response contains ~7 days of data
    Expected Result: Returns 7 days of data (backward compatible)
    Evidence: .sisyphus/evidence/task-01-default-range.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add time range parameters to user dashboard endpoint`
  - Files: `controller/user.go`

- [ ] 2. **Backend: Add channel stats API endpoint**

  **What to do**:
  - Create new function `GetChannelStats()` in `controller/statistics.go`
  - Query logs grouped by `channel_id` with aggregations (request_count, quota, tokens)
  - Support `start_timestamp`, `end_timestamp`, `granularity` parameters
  - Join with channels table to get channel names
  - Handle deleted channels (show "Deleted Channel #ID")
  - Add route in `router/api.go` under `/api/stats/channels`
  - Apply `AdminAuth()` middleware

  **Must NOT do**:
  - Do NOT expose channel keys or sensitive config
  - Do NOT return stats for channels user shouldn't see (admin only for now)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Follow existing stats API pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
  - **Blocks**: Task 14 (Stats page), Task 16 (permission filter)
  - **Blocked By**: None

  **References**:
  - `controller/statistics.go:99-142` - GetTokenStats pattern to follow
  - `model/log.go:27` - ChannelId field with index
  - `model/channel.go` - Channel model for name lookup
  - `router/api.go:129` - Where to add new route

  **Acceptance Criteria**:
  - [ ] GET /api/stats/channels returns channel aggregation
  - [ ] Supports time range parameters
  - [ ] Returns channel names or "Deleted Channel #ID"
  - [ ] Admin auth required

  **QA Scenarios**:
  ```
  Scenario: Channel stats API returns data
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:3000/api/stats/channels" with admin auth
      2. Assert response contains channel_name, request_count, quota, tokens
    Expected Result: Returns channel statistics array
    Evidence: .sisyphus/evidence/task-02-channel-stats.txt

  Scenario: Deleted channel handled
    Tool: Bash (curl)
    Steps:
      1. Create a channel, make some requests, delete the channel
      2. Query channel stats
      3. Assert deleted channel shows as "Deleted Channel #ID"
    Expected Result: Deleted channels still appear with ID
    Evidence: .sisyphus/evidence/task-02-deleted-channel.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add channel statistics endpoint`
  - Files: `controller/statistics.go`, `router/api.go`

- [ ] 3. **Backend: Add user group stats API endpoint**

  **What to do**:
  - Create `GetUserGroupStats()` in `controller/statistics.go`
  - Query logs grouped by user's group (join logs with users table on user_id)
  - Aggregate by `user.Group` field
  - Support time range parameters
  - Add route `/api/stats/user-groups` with `AdminAuth()`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `model/user.go:51` - User.Group field
  - `controller/statistics.go:189-233` - GetUserStats pattern

  **Acceptance Criteria**:
  - [ ] GET /api/stats/user-groups returns group aggregations
  - [ ] Supports time range parameters

  **QA Scenarios**:
  ```
  Scenario: User group stats API works
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:3000/api/stats/user-groups" with admin auth
      2. Assert response contains group_name, request_count, quota
    Expected Result: Returns user group statistics
    Evidence: .sisyphus/evidence/task-03-user-group-stats.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add user group statistics endpoint`

- [ ] 4. **Backend: Add channel group stats API endpoint**

  **What to do**:
  - Create `GetChannelGroupStats()` in `controller/statistics.go`
  - Query logs grouped by channel's group (join logs with channels table on channel_id)
  - Aggregate by `channel.Group` field
  - Support time range parameters
  - Add route `/api/stats/channel-groups` with `AdminAuth()`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `model/channel.go:35` - Channel.Group field
  - `controller/statistics.go` - Pattern to follow

  **Acceptance Criteria**:
  - [ ] GET /api/stats/channel-groups returns channel group aggregations

  **QA Scenarios**:
  ```
  Scenario: Channel group stats API works
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:3000/api/stats/channel-groups" with admin auth
      2. Assert response contains group_name, request_count, quota
    Expected Result: Returns channel group statistics
    Evidence: .sisyphus/evidence/task-04-channel-group-stats.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add channel group statistics endpoint`

- [ ] 5. **Backend: Add granularity parameter to aggregation queries**

  **What to do**:
  - Add `granularity` query parameter to stats endpoints
  - Support values: `hour`, `day`, `week`, `month`
  - Modify `GetTokenDailyStats()` to accept granularity parameter
  - Create new query functions for hourly/weekly/monthly aggregation
  - Use SQL date truncation functions (different for MySQL/PostgreSQL/SQLite)
  - Default to `day` if not specified

  **Must NOT do**:
  - Do NOT change existing API behavior when granularity not specified
  - Do NOT add complex pre-aggregation tables

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Add parameter handling and SQL date functions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1

  **References**:
  - `model/log.go:319-345` - SearchLogsByDayAndModel (day granularity)
  - `model/log.go:449-487` - GetTokenHourlyStats (hour granularity)
  - `controller/token_stats.go` - Where to add granularity param

  **Acceptance Criteria**:
  - [ ] Stats endpoints accept `granularity` parameter
  - [ ] Returns hourly data when granularity=hour
  - [ ] Returns daily data when granularity=day (default)
  - [ ] Returns weekly/monthly data correctly

  **QA Scenarios**:
  ```
  Scenario: Hourly granularity works
    Tool: Bash (curl)
    Steps:
      1. curl "/api/stats/overview?granularity=hour&start_timestamp=X"
      2. Assert response data points are hourly
    Expected Result: Returns hourly aggregated data
    Evidence: .sisyphus/evidence/task-05-hourly-granularity.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add granularity parameter to statistics endpoints`
  - Files: `controller/statistics.go`, `model/log.go`

- [ ] 6. **Backend: Add CSV export API endpoint**

  **What to do**:
  - Create `ExportStatsCSV()` in `controller/statistics.go`
  - Accept same parameters as stats endpoints (time range, dimensions, granularity)
  - Generate CSV with headers: date, dimension, request_count, quota, prompt_tokens, completion_tokens
  - Use `c.Writer` for streaming response
  - Set proper headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename=stats_YYYYMMDD.csv`
  - Add route `/api/stats/export` with `AdminAuth()`
  - Limit export to reasonable max rows (optional: 10000)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 11 (ExportButton component)

  **References**:
  - `controller/statistics.go` - Query patterns to reuse
  - Gin framework CSV streaming: `c.Data()` or `c.Writer.Write()`

  **Acceptance Criteria**:
  - [ ] GET /api/stats/export returns CSV file
  - [ ] CSV has correct headers and data
  - [ ] Filename includes timestamp
  - [ ] Works with time range and dimension filters

  **QA Scenarios**:
  ```
  Scenario: CSV export works
    Tool: Bash (curl)
    Steps:
      1. curl "/api/stats/export?start_timestamp=X&end_timestamp=Y" -o test.csv
      2. Verify CSV file exists and has correct format
    Expected Result: Valid CSV file downloaded
    Evidence: .sisyphus/evidence/task-06-csv-export.csv
  ```

  **Commit**: YES
  - Message: `feat(api): add CSV export endpoint for statistics`

- [ ] 6b. **Backend: Add heatmap data API endpoint**

  **What to do**:
  - Create `GetHeatmapData()` in `controller/statistics.go`
  - Query logs aggregated by hour of day (0-23) and day of week (1-7)
  - Use SQL: `HOUR(FROM_UNIXTIME(created_at))` for hour, `DAYOFWEEK()` for weekday
  - Support time range parameters
  - Return array of {hour, weekday, request_count, quota, tokens}
  - Add route `/api/stats/heatmap` with `UserAuth()` (all users can see their heatmap)
  - Handle MySQL/PostgreSQL/SQLite date function differences

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 12b (HeatmapChart component)

  **References**:
  - `controller/statistics.go` - Query patterns
  - `model/log.go:319-345` - Date aggregation examples
  - MySQL: `HOUR()`, `DAYOFWEEK()`
  - PostgreSQL: `EXTRACT(HOUR FROM)`, `EXTRACT(DOW FROM)`
  - SQLite: `strftime('%H', ...)`, `strftime('%w', ...)`

  **Acceptance Criteria**:
  - [ ] GET /api/stats/heatmap returns 168 data points (7x24)
  - [ ] Supports time range parameters
  - [ ] Returns correct hour (0-23) and weekday (1-7)

  **QA Scenarios**:
  ```
  Scenario: Heatmap API returns correct structure
    Tool: Bash (curl)
    Steps:
      1. curl "/api/stats/heatmap?start_timestamp=X&end_timestamp=Y" with auth
      2. Assert response contains array with hour, weekday, request_count
      3. Verify all 168 possible combinations covered (or sparse data handled)
    Expected Result: Returns heatmap data structure
    Evidence: .sisyphus/evidence/task-06b-heatmap-api.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add heatmap data endpoint for weekly usage pattern`

- [ ] 7. **Frontend: Install and configure react-datepicker**

  **What to do**:
  - Add `react-datepicker` to dependencies in `web/default/package.json`
  - Import CSS in component or main entry
  - Configure date-fns or dayjs as date utility (react-datepicker peer dependency)
  - Verify component renders correctly

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple package installation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8 (DatePicker component)

  **References**:
  - `web/default/package.json` - Where to add dependency
  - `web/default/src/index.js` or `App.js` - Where to import CSS

  **Acceptance Criteria**:
  - [ ] react-datepicker installed
  - [ ] CSS imported
  - [ ] No console errors when using component

  **QA Scenarios**:
  ```
  Scenario: Package installation verified
    Tool: Bash
    Steps:
      1. cd web/default && npm list react-datepicker
      2. Assert package is installed
    Expected Result: Package found in npm list
    Evidence: .sisyphus/evidence/task-07-install.txt
  ```

  **Commit**: YES
  - Message: `chore(web): add react-datepicker dependency`
  - Files: `web/default/package.json`

- [ ] 8. **Frontend: Create DatePickerWithPresets component**

  **What to do**:
  - Create `web/default/src/components/DatePickerWithPresets.js`
  - Props: `onChange(dateRange)`, `presets` (optional), `defaultPreset` (optional)
  - Include preset buttons: 7天, 14天, 30天, 90天, 本月, 上月, 自定义
  - When "自定义" clicked, show react-datepicker in range mode
  - Return `{ startTimestamp, endTimestamp, preset }` on change
  - Style to match existing Semantic UI components
  - Handle timezone: convert local dates to UTC timestamps

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: New UI component requiring styling and UX
  - **Skills**: [`frontend-ui-ux`]
    - For creating polished, styled component

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13-15 (page integration)

  **References**:
  - `web/default/src/pages/Dashboard/Stats.js:73-107` - Current preset pattern
  - `web/default/src/components/` - Existing component patterns
  - Recharts styling for chart colors

  **Acceptance Criteria**:
  - [ ] Component renders preset buttons
  - [ ] DatePicker shows on "自定义" click
  - [ ] Returns correct timestamps
  - [ ] Styles match Semantic UI

  **QA Scenarios**:
  ```
  Scenario: Preset selection works
    Tool: Playwright
    Steps:
      1. Render component in test page
      2. Click "最近30天" preset
      3. Assert onChange called with correct timestamps
    Expected Result: Correct 30-day range returned
    Evidence: .sisyphus/evidence/task-08-preset.png

  Scenario: Custom date range works
    Tool: Playwright
    Steps:
      1. Click "自定义" button
      2. Select start and end dates in DatePicker
      3. Assert correct range returned
    Expected Result: Custom range returned
    Evidence: .sisyphus/evidence/task-08-custom.png
  ```

  **Commit**: YES
  - Message: `feat(web): add DatePickerWithPresets component`
  - Files: `web/default/src/components/DatePickerWithPresets.js`, `web/default/src/components/DatePickerWithPresets.css`

- [ ] 9. **Frontend: Create DimensionFilter component**

  **What to do**:
  - Create `web/default/src/components/DimensionFilter.js`
  - Support multiple dimension selectors:
    - Channel: Dropdown with search, "全部渠道" option
    - User Group: Dropdown from `/api/stats/user-groups`
    - Channel Group: Dropdown from `/api/stats/channel-groups`
    - Model: Dropdown with common models
  - Props: `dimensions` (array of enabled dimensions), `onChange(filters)`
  - Fetch dimension options from API on mount
  - Handle loading and error states

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Multi-dropdown UI component
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13-15

  **References**:
  - `web/default/src/components/` - Existing dropdown patterns
  - Semantic UI Dropdown component

  **Acceptance Criteria**:
  - [ ] Renders dimension dropdowns
  - [ ] Fetches options from API
  - [ ] Returns selected filters on change

  **QA Scenarios**:
  ```
  Scenario: Dimension filter works
    Tool: Playwright
    Steps:
      1. Render component
      2. Select a channel from dropdown
      3. Assert onChange called with channel filter
    Expected Result: Filter returned correctly
    Evidence: .sisyphus/evidence/task-09-filter.png
  ```

  **Commit**: YES
  - Message: `feat(web): add DimensionFilter component`

- [ ] 10. **Frontend: Create GranularitySelector component**

  **What to do**:
  - Create `web/default/src/components/GranularitySelector.js`
  - Simple radio button or dropdown for: 小时, 天, 周, 月
  - Props: `value`, `onChange(granularity)`
  - Default value: "day"
  - Use Semantic UI Button.Group or Radio

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple selector component
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2

  **References**:
  - Semantic UI Button.Group for toggle

  **Acceptance Criteria**:
  - [ ] Renders granularity options
  - [ ] Calls onChange on selection

  **Commit**: YES
  - Message: `feat(web): add GranularitySelector component`

- [ ] 11. **Frontend: Create ExportButton component**

  **What to do**:
  - Create `web/default/src/components/ExportButton.js`
  - Props: `filters` (current filter state)
  - On click: call `/api/stats/export` with filter params
  - Trigger browser download of CSV file
  - Show loading state during download
  - Handle errors with toast notification

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 6)
  - **Parallel Group**: Wave 2

  **References**:
  - `web/default/src/helpers/` - API helper patterns
  - File download with `window.open` or `fetch + blob`

  **Acceptance Criteria**:
  - [ ] Button triggers CSV download
  - [ ] Downloads with current filter state
  - [ ] Shows loading state

  **Commit**: YES
  - Message: `feat(web): add ExportButton component`

- [ ] 12. **Frontend: Update i18n translations**

  **What to do**:
  - Add new translation keys to `web/default/src/locales/zh/translation.json`
  - Add same keys to `web/default/src/locales/en/translation.json`
  - Keys needed:
    - `dashboard.date_picker.presets.custom`, `this_month`, `last_month`
    - `dashboard.filters.channel`, `user_group`, `channel_group`, `model`
    - `dashboard.granularity.hour`, `day`, `week`, `month`
    - `dashboard.export`, `export_success`, `export_failed`
    - **New chart titles**:
      - `dashboard.charts.grouped_bar.title`: "维度对比分析"
      - `dashboard.charts.heatmap.title`: "使用时段热力图"
      - `dashboard.charts.radar.title`: "多维度指标对比"
      - `dashboard.charts.stacked_grouped.title`: "交叉维度分析"
    - **Chart labels**:
      - `dashboard.charts.heatmap.hour`: "小时"
      - `dashboard.charts.heatmap.weekday`: "星期"
      - `dashboard.charts.weekday.mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2

  **References**:
  - `web/default/src/locales/zh/translation.json` - Existing translation structure

  **Acceptance Criteria**:
  - [ ] All new keys have zh and en translations
  - [ ] No missing translation warnings

  **Commit**: YES
  - Message: `feat(i18n): add translations for monitoring enhancement`

- [ ] 12a. **Frontend: Create GroupedBarChart component**

  **What to do**:
  - Create `web/default/src/components/charts/GroupedBarChart.js`
  - Use Recharts BarChart with multiple Bar components for grouped display
  - Props: `data`, `categories` (array of group names), `dataKeys` (metrics to show), `xAxisKey`
  - Support dimensions: channel comparison, user group comparison, channel group comparison
  - Include legend and tooltip
  - Colors: use existing chartConfig.barColors
  - Responsive layout

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex chart component requiring data visualization expertise
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13

  **References**:
  - `web/default/src/pages/Dashboard/Stats.js` - Existing chart patterns
  - Recharts BarChart documentation

  **Acceptance Criteria**:
  - [ ] Component renders grouped bars correctly
  - [ ] Legend shows all categories
  - [ ] Tooltip displays values on hover
  - [ ] Responsive on different screen sizes

  **QA Scenarios**:
  ```
  Scenario: Grouped bar chart renders correctly
    Tool: Playwright
    Steps:
      1. Render component with sample data (3 channels, 4 metrics)
      2. Assert 3 groups of bars appear
      3. Assert legend shows all channel names
    Expected Result: Chart renders with grouped bars
    Evidence: .sisyphus/evidence/task-12a-grouped-bar.png
  ```

  **Commit**: YES
  - Message: `feat(web): add GroupedBarChart component for dimension comparison`

- [ ] 12b. **Frontend: Create HeatmapChart component (weekday x hour)**

  **What to do**:
  - Create `web/default/src/components/charts/HeatmapChart.js`
  - Use custom SVG rendering or Treemap for heatmap
  - X-axis: Hours (0-23), Y-axis: Days of week (Mon-Sun)
  - Props: `data` (array of {hour, weekday, value}), `colorScale` (optional)
  - Color gradient: light blue to dark blue based on intensity
  - Show value in tooltip on hover
  - Include color legend

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Specialized visualization requiring custom implementation
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 6b (heatmap API)

  **References**:
  - Recharts Treemap or custom SVG
  - Similar to GitHub contribution heatmap

  **Acceptance Criteria**:
  - [ ] Component renders 7x24 grid
  - [ ] Cells colored by intensity
  - [ ] Tooltip shows hour, day, and value
  - [ ] Color legend visible

  **QA Scenarios**:
  ```
  Scenario: Heatmap renders weekly pattern
    Tool: Playwright
    Steps:
      1. Render component with hourly data for a week
      2. Assert 168 cells (7 days x 24 hours) visible
      3. Hover over a cell and verify tooltip
    Expected Result: Heatmap shows usage pattern
    Evidence: .sisyphus/evidence/task-12b-heatmap.png
  ```

  **Commit**: YES
  - Message: `feat(web): add HeatmapChart for weekday x hour analysis`

- [ ] 12c. **Frontend: Create RadarChart component**

  **What to do**:
  - Create `web/default/src/components/charts/RadarChart.js`
  - Use Recharts RadarChart with PolarGrid, PolarAngleAxis, PolarRadiusAxis
  - Support multiple data series for comparison
  - Props: `data`, `dimensions` (array of axis names), `metrics` (array of series)
  - Allow comparing multiple entities (e.g., 3 channels on 5 metrics)
  - Include legend for multiple series

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13

  **References**:
  - Recharts RadarChart documentation
  - `web/default/src/pages/Token/TokenStats.js` - Existing PieChart pattern

  **Acceptance Criteria**:
  - [ ] Component renders radar with multiple axes
  - [ ] Multiple series supported with different colors
  - [ ] Legend visible for series identification
  - [ ] Tooltip on hover

  **QA Scenarios**:
  ```
  Scenario: Radar chart shows multi-metric comparison
    Tool: Playwright
    Steps:
      1. Render with 2 channels, 5 metrics
      2. Assert radar shape shows both series
      3. Verify legend shows both channel names
    Expected Result: Radar displays multi-dimensional comparison
    Evidence: .sisyphus/evidence/task-12c-radar.png
  ```

  **Commit**: YES
  - Message: `feat(web): add RadarChart for multi-dimensional comparison`

- [ ] 12d. **Frontend: Create StackedGroupedBarChart component**

  **What to do**:
  - Create `web/default/src/components/charts/StackedGroupedBarChart.js`
  - Use Recharts BarChart with stackId for stacking and multiple Bar groups
  - Support: Group by one dimension (e.g., channel), stack by another (e.g., model)
  - Props: `data`, `groupKey` (e.g., channel), `stackKey` (e.g., model), `metric` (e.g., tokens)
  - Include legend showing stack categories
  - Custom tooltip showing all stack values

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13

  **References**:
  - `web/default/src/pages/Dashboard/index.js:406-455` - Existing stacked bar pattern
  - Recharts BarChart with stackId

  **Acceptance Criteria**:
  - [ ] Component renders grouped and stacked bars
  - [ ] Legend shows stack categories
  - [ ] Tooltip shows all values in group
  - [ ] Colors differentiate stacks

  **QA Scenarios**:
  ```
  Scenario: Stacked grouped chart shows cross-dimension analysis
    Tool: Playwright
    Steps:
      1. Render with 3 channels, each with 4 models stacked
      2. Assert bars are grouped by channel
      3. Assert each bar has stacked segments for models
    Expected Result: Chart shows cross-dimensional data
    Evidence: .sisyphus/evidence/task-12d-stacked-grouped.png
  ```

  **Commit**: YES
  - Message: `feat(web): add StackedGroupedBarChart for cross-dimension analysis`

- [ ] 13. **Frontend: Refactor Dashboard page with new components and charts**

  **What to do**:
  - Update `web/default/src/pages/Dashboard/index.js`
  - Replace hardcoded 7-day logic with DatePickerWithPresets component
  - Add DimensionFilter component (channel, model for regular users)
  - Add GranularitySelector component
  - Update fetchDashboardData() to pass time range and filters to API
  - **Integrate new chart components**:
    - Add GroupedBarChart for channel/model comparison
    - Add HeatmapChart (weekday x hour) for usage pattern analysis
    - Add RadarChart for multi-metric comparison across dimensions
    - Add StackedGroupedBarChart for cross-dimensional analysis
  - Create new chart grid layout (2x2 for new charts below existing charts)
  - Handle loading states for all charts
  - Ensure backward compatibility with existing chart rendering

  **Must NOT do**:
  - Do NOT remove existing line charts and bar charts
  - Do NOT break existing functionality

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex page refactoring with multiple new integrations and 4 new chart types
  - **Skills**: [`frontend-ui-ux`]
    - For proper component integration and layout design

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Wave 2)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 1, 8-12, 12a-12d

  **References**:
  - `web/default/src/pages/Dashboard/index.js` - Current implementation
  - `web/default/src/pages/Dashboard/Stats.js` - Reference for filter patterns
  - New chart components: GroupedBarChart, HeatmapChart, RadarChart, StackedGroupedBarChart

  **Acceptance Criteria**:
  - [ ] DatePickerWithPresets shows and works
  - [ ] DimensionFilter allows channel/model selection
  - [ ] GranularitySelector changes data granularity
  - [ ] Existing charts update with new data
  - [ ] GroupedBarChart shows dimension comparison
  - [ ] HeatmapChart shows weekly usage pattern
  - [ ] RadarChart shows multi-metric comparison
  - [ ] StackedGroupedBarChart shows cross-dimension analysis
  - [ ] All charts are responsive

  **QA Scenarios**:
  ```
  Scenario: Dashboard with custom date range
    Tool: Playwright
    Steps:
      1. Navigate to Dashboard page
      2. Click "自定义" and select a date range
      3. Assert all charts update with data for selected range
    Expected Result: All charts show correct data
    Evidence: .sisyphus/evidence/task-13-dashboard-custom.png

  Scenario: Dashboard filters work
    Tool: Playwright
    Steps:
      1. Select a channel from dimension filter
      2. Assert all charts show only that channel's data
    Expected Result: Filtered data shown in all charts
    Evidence: .sisyphus/evidence/task-13-dashboard-filter.png

  Scenario: New charts render correctly
    Tool: Playwright
    Steps:
      1. Navigate to Dashboard page
      2. Scroll to see all 4 new charts
      3. Verify GroupedBarChart, HeatmapChart, RadarChart, StackedGroupedBarChart render
      4. Hover over each chart and verify tooltips
    Expected Result: All 4 new charts visible and interactive
    Evidence: .sisyphus/evidence/task-13-new-charts.png
  ```

  **Commit**: YES
  - Message: `feat(web): integrate new components and charts into Dashboard page`
  - Files: `web/default/src/pages/Dashboard/index.js`, `Dashboard.css`

- [ ] 14. **Frontend: Refactor Stats page with new components**

  **What to do**:
  - Update `web/default/src/pages/Dashboard/Stats.js`
  - Replace existing preset dropdown with DatePickerWithPresets
  - Add DimensionFilter for channel, user_group, channel_group
  - Add GranularitySelector
  - Add ExportButton
  - Update API calls to pass new parameters
  - Handle channel permission (show only used channels for non-admin)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex page refactoring
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13, 15)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2-5, 8-12

  **References**:
  - `web/default/src/pages/Dashboard/Stats.js` - Current implementation

  **Acceptance Criteria**:
  - [ ] All new components integrated
  - [ ] Charts show correct data for selected filters
  - [ ] Export button downloads CSV

  **QA Scenarios**:
  ```
  Scenario: Stats page full functionality
    Tool: Playwright
    Steps:
      1. Navigate to Stats page
      2. Select "本月" preset
      3. Select a user group filter
      4. Select "周" granularity
      5. Assert charts show weekly data for selected group
      6. Click export button
      7. Assert CSV downloaded
    Expected Result: All features work together
    Evidence: .sisyphus/evidence/task-14-stats-full.png
  ```

  **Commit**: YES
  - Message: `feat(web): integrate new components into Stats page`

- [ ] 15. **Frontend: Update TokenStats page with new components**

  **What to do**:
  - Update `web/default/src/pages/Token/TokenStats.js`
  - Replace preset dropdown with DatePickerWithPresets
  - Add GranularitySelector
  - Add ExportButton for single token stats
  - Update API calls for granularity parameter

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13, 14)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Tasks 8-12

  **References**:
  - `web/default/src/pages/Token/TokenStats.js` - Current implementation

  **Acceptance Criteria**:
  - [ ] DatePickerWithPresets works
  - [ ] Granularity selector changes hourly/daily data
  - [ ] Export works for single token

  **Commit**: YES
  - Message: `feat(web): integrate new components into TokenStats page`

- [ ] 16. **Frontend: Add channel permission filter logic**

  **What to do**:
  - In Stats page, when user is not admin:
    - Fetch user's accessible channels (from their logs)
    - Filter channel dropdown to only show those channels
  - Admin users see all channels
  - Check user role from context/session

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13-15)
  - **Parallel Group**: Wave 3
  - **Blocked By**: Task 2, Task 14

  **References**:
  - `web/default/src/helpers/` - Auth context helpers
  - `web/default/src/pages/Dashboard/Stats.js` - Where to add logic

  **Acceptance Criteria**:
  - [ ] Regular users see only channels they've used
  - [ ] Admin users see all channels

  **QA Scenarios**:
  ```
  Scenario: Regular user channel filter
    Tool: Playwright
    Steps:
      1. Login as regular user
      2. Navigate to Stats page
      3. Open channel dropdown
      4. Assert only used channels are listed
    Expected Result: Limited channel list
    Evidence: .sisyphus/evidence/task-16-user-channels.png

  Scenario: Admin channel access
    Tool: Playwright
    Steps:
      1. Login as admin
      2. Navigate to Stats page
      3. Open channel dropdown
      4. Assert all channels are listed
    Expected Result: Full channel list
    Evidence: .sisyphus/evidence/task-16-admin-channels.png
  ```

  **Commit**: YES
  - Message: `feat(web): add channel permission filtering for non-admin users`

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `go build` + `cd web/default && npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
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
# Backend build
go build -o one-api

# Frontend build
cd web/default && npm run build

# API test
curl "http://localhost:3000/api/stats/channels" -H "Authorization: Bearer $TOKEN"
curl "http://localhost:3000/api/user/dashboard?start_timestamp=1700000000&end_timestamp=1702000000"
curl "http://localhost:3000/api/stats/heatmap?start_timestamp=1700000000&end_timestamp=1702000000" -H "Authorization: Bearer $TOKEN"
```

### Final Checklist
- [ ] All "Must Have" features present
- [ ] All "Must NOT Have" absent
- [ ] Dashboard supports custom time range
- [ ] Stats page shows channel/user-group/channel-group dimensions
- [ ] Granularity switcher works
- [ ] CSV export downloads correctly
- [ ] Regular users see only their used channels
- [ ] All i18n translations complete
- [ ] **GroupedBarChart renders on Dashboard**
- [ ] **HeatmapChart shows weekly usage pattern**
- [ ] **RadarChart shows multi-metric comparison**
- [ ] **StackedGroupedBarChart shows cross-dimension analysis**