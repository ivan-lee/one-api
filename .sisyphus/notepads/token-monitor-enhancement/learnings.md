# Token Monitor Enhancement - Learnings

## Task: Modify GetUserDashboard to accept timestamp params

### Summary
Modified `controller/user.go:GetUserDashboard()` to accept `start_timestamp` and `end_timestamp` query parameters, replacing hardcoded 7-day logic.

### Changes Made
- Added timestamp parsing using `strconv.ParseInt` (same pattern as `parseTimeRange` in token_stats.go)
- Maintained backward compatibility - defaults to 7-day range when no params provided
- Response format unchanged

### Key Patterns Found
1. **parseTimeRange pattern** (`controller/token_stats.go:170-188`):
   - Uses `c.Query("start_timestamp")` and `c.Query("end_timestamp")`
   - Parses with `strconv.ParseInt(str, 10, 64)`
   - Default to 7-day range when both timestamps are 0

2. **SearchLogsByDayAndModel** (`model/log.go:319`):
   - Takes `userId, start, end int` parameters
   - Returns `LogStatistics` slice grouped by day and model

### API Usage
```
GET /api/user/dashboard?start_timestamp=1704067200&end_timestamp=1706659200
```

Without parameters defaults to last 7 days (backward compatible).

### Notes
- strconv was already imported in user.go
- Build passes successfully
- Route already supports query params - no router change needed

---

## Task: Install react-datepicker

### Summary
Installed react-datepicker package in web/default and configured CSS import.

### Changes Made
- Added `react-datepicker: ^9.1.0` to dependencies in package.json
- Added CSS import in `src/index.js`: `import 'react-datepicker/dist/react-datepicker.css';`

### Installation
```bash
cd web/default && npm install react-datepicker
```

### CSS Import Location
Added in `web/default/src/index.js` alongside other third-party CSS imports (react-toastify, semantic-ui).

### Notes
- Package installed successfully (10 packages added)
- Warning about typescript peer dependency is non-blocking (existing issue with react-scripts 5.0.1)
- Ready to use in components with `import DatePicker from 'react-datepicker';`

---

## Task: Create GranularitySelector component

### Summary
Created `GranularitySelector.js` component for hour/day/week/month selection.

### Component Details
- **File**: `web/default/src/components/GranularitySelector.js`
- **Uses**: Semantic UI React `Button.Group`
- **Options**: 小时 (hour), 天 (day), 周 (week), 月 (month)
- **Default**: "day"
- **Props**: `value` (current selection), `onChange` (callback)

### Usage
```jsx
import GranularitySelector from './components/GranularitySelector';

<GranularitySelector 
  value={selectedGranularity} 
  onChange={(val) => setSelectedGranularity(val)} 
/>
```

### Notes
- Follows existing component patterns in the project (e.g., Loading.js)
- Simple Button.Group with active state styling
- onChange callback receives the selected value string

---

## Task: Create ExportButton component

### Summary
Created `ExportButton.js` component for triggering CSV download from `/api/stats/export`.

### Component Details
- **File**: `web/default/src/components/ExportButton.js`
- **Uses**: Semantic UI React `Button`, react-i18next for translations
- **Props**: `filters` (object with startTimestamp, endTimestamp, dimension, channelId, userGroup, channelGroup, model, granularity)

### Implementation Patterns
1. **API call**: Uses raw `fetch` with `response.blob()` to handle CSV binary response
2. **Loading state**: Uses React useState, passes to Button's `loading` and `disabled` props
3. **Error handling**: Uses `showError` from helpers/utils.js (integrates with react-toastify)
4. **Success handling**: Uses `showSuccess` for success toast notification
5. **Filename extraction**: Parses `Content-Disposition` header for filename, defaults to `stats_YYYYMMDD.csv`
6. **Download trigger**: Creates temporary `<a>` element with blob URL, clicks it programmatically

### Usage
```jsx
import ExportButton from './components/ExportButton';

<ExportButton 
  filters={{
    startTimestamp: 1704067200,
    endTimestamp: 1706659200,
    channelId: 1,
    model: 'gpt-4',
    granularity: 'day'
  }} 
/>
```

### API Endpoint Expected
`GET /api/stats/export` with query parameters:
- `start_timestamp`, `end_timestamp`
- `channel_id`, `user_group`, `channel_group`
- `dimension`, `model`, `granularity`

### i18n Keys Expected
- `dashboard.export` - Button text ("导出")
- `dashboard.export_success` - Success message ("导出成功")
- `dashboard.export_failed` - Error message ("导出失败")

### Notes
- Uses `credentials: 'include'` to send cookies for auth
- Uses `API.defaults.baseURL` for consistent API base URL
- Component is Task 11 in the plan, depends on Task 6 (backend export API)

---

## Task: Add i18n translation keys

### Summary
Added new translation keys to zh and en translation files for token monitor enhancement features.

### Keys Added
1. **dashboard.date_picker.presets** - Date range presets
   - `this_month` - 本月 / This Month
   - `last_month` - 上月 / Last Month  
   - `custom` - 自定义 / Custom

2. **dashboard.filters** - Dimension filter labels
   - `all_channels` - 全部渠道 / All Channels
   - `channel` - 渠道 / Channel
   - `user_group` - 用户分组 / User Group
   - `channel_group` - 渠道分组 / Channel Group
   - `model` - 模型 / Model
   - `all` - 全部 / All

3. **dashboard.granularity** - Time granularity labels
   - `hour` - 小时 / Hour
   - `day` - 天 / Day
   - `week` - 周 / Week
   - `month` - 月 / Month

4. **dashboard.export** - Export button labels
   - `button` - 导出 / Export
   - `export_success` - 导出成功 / Export Successful
   - `export_failed` - 导出失败 / Export Failed

5. **dashboard.charts** - New chart titles
   - `grouped_bar.title` - 维度对比分析 / Dimension Comparison
   - `heatmap.title` - 使用时段热力图 / Usage Heatmap
   - `heatmap.hour` - 小时 / Hour
   - `heatmap.weekday` - 星期 / Weekday
   - `radar.title` - 多维度指标对比 / Multi-dimension Comparison
   - `stacked_grouped.title` - 交叉维度分析 / Cross-dimension Analysis

6. **dashboard.charts.weekday** - Weekday labels
   - `mon` through `sun` - Monday through Sunday translations

### Files Modified
- `web/default/src/locales/zh/translation.json`
- `web/default/src/locales/en/translation.json`

### Notes
- Both JSON files validated successfully with node
- Translation structure follows existing project conventions
- All keys nested under `dashboard` section as specified in plan
## Task 12c: RadarChart Component (2026-03-28)

### Design System Patterns Found
- **Chart colors**: Defined in `chartConfig.barColors` array in Dashboard/index.js and COLORS array in TokenStats.js
  - Primary: `#4318FF` (requests), `#00B5D8` (quota), `#6C63FF` (tokens)
  - Palette: 10 colors for series differentiation
- **Tooltip style**: `background: '#fff', border: 'none', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'`
- **Axis text**: `fontSize: 12, fill: '#A3AED0'`
- **Legend wrapper**: `paddingTop: '20px'`
- **Container**: ResponsiveContainer with `width='100%'`

### Component Structure
- Charts directory: `web/default/src/components/charts/` (newly created for this wave)
- Recharts library already installed and used throughout project
- Semantic UI Card wrapper pattern for chart cards

### JSDoc Usage
- Public reusable components need JSDoc for prop interface documentation
- Inline comments should be avoided - use self-explanatory variable names
## GroupedBarChart Component (Task 12a)

### Design System Patterns Found
- **Color palette**: `chartConfig.barColors` array in Dashboard/index.js with 10 colors
- **Typography**: tick fontSize: 12, fill: '#A3AED0'
- **Tooltip style**: white background, 4px radius, shadow
- **Grid style**: strokeDasharray='3 3', stroke='#E9ECEF', opacity: 0.5
- **Bar radius**: [4, 4, 0, 0] for horizontal, [0, 4, 4, 0] for vertical
- **Legend**: iconType='circle', iconSize=10, verticalAlign='top', height=36

### Component Structure
- Charts directory: `web/default/src/components/charts/`
- Recharts components used: BarChart, Bar, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, CartesianGrid
- Responsive: CSS breakpoints at 768px and 480px
- State handling: loading spinner, empty state message

### Key Dependencies
- recharts@2.15.4 (already installed)
- prop-types@15.8.1 (already installed)

### Usage Example
```jsx
import GroupedBarChart, { BAR_COLORS } from '../components/charts/GroupedBarChart';

<GroupedBarChart
  data={[
    { name: 'Channel A', requests: 100, quota: 50 },
    { name: 'Channel B', requests: 80, quota: 40 },
  ]}
  xAxisKey="name"
  dataKeys={['requests', 'quota']}
  height={300}
/>
```

---

## Task 8: DatePickerWithPresets Component (2026-03-28)

### Summary
Created `DatePickerWithPresets.js` and `DatePickerWithPresets.css` - a date picker component with preset time range buttons matching Semantic UI design system.

### Component Details
- **Files**: 
  - `web/default/src/components/DatePickerWithPresets.js` (183 lines)
  - `web/default/src/components/DatePickerWithPresets.css` (215 lines)
- **Uses**: Semantic UI `Button.Group`, `Popup`, react-datepicker with `selectsRange` mode
- **Presets**: 7天, 14天, 30天, 90天, 本月, 上月, 自定义
- **Props**: `onChange(dateRange)`, `defaultPreset`, `presets` (optional override)

### Return Format
```javascript
onChange({ 
  startTimestamp: number,  // Unix seconds, 00:00:00 for start
  endTimestamp: number,    // Unix seconds, 23:59:59 for end
  preset: string           // '7d', '14d', '30d', '90d', 'this_month', 'last_month', 'custom'
})
```

### Design System Patterns Applied
1. **Colors**:
   - Primary active: `#4318FF` (matches chartConfig)
   - Hover: `#f8f9fa` background, `#4318FF` text
   - Text: `#1b2559` (dark), `#A3AED0` (light/secondary)
2. **Typography**: Lato font family (Semantic UI default)
3. **Components**: Button.Group pattern from TokensTable.js
4. **CSS organization**: Section comments matching Stats.css style
5. **Border radius**: 4px for buttons, 8px for cards/popups
6. **Transitions**: 0.2s ease for hover states

### react-datepicker Integration
- Package already installed: `react-datepicker@9.1.0`
- Locales imported: `zh-CN`, `en-US` from date-fns
- DatePicker props: `selectsRange`, `inline`, `maxDate={new Date()}`, month/year dropdowns
- Locale determined by `i18n.language`

### Key Implementation Patterns
1. **Month boundaries**: Use JavaScript Date constructor `new Date(year, month, 0)` to get last day
2. **Day boundaries**: `setHours(0,0,0,0)` for start, `setHours(23,59,59,999)` for end
3. **Popup control**: Semantic UI Popup with `open` state controlled for custom trigger
4. **Responsive**: Button.Group wraps vertically on mobile (<768px)

### i18n Keys Expected
- `dashboard.date_picker.presets.7d` - "7天"
- `dashboard.date_picker.presets.14d` - "14天"
- `dashboard.date_picker.presets.30d` - "30天"
- `dashboard.date_picker.presets.90d` - "90天"
- `dashboard.date_picker.presets.this_month` - "本月"
- `dashboard.date_picker.presets.last_month` - "上月"
- `dashboard.date_picker.presets.custom` - "自定义"

### Notes
- Fallback labels provided if i18n keys missing (e.g., `|| '7天'`)
- eslint-disable for useEffect intentional - only runs on mount
- CSS overrides react-datepicker default styles to match Semantic UI theme
- Component initializes with onChange call for defaultPreset

---

## Task: Create DimensionFilter component (Task 9)

### Summary
Created `DimensionFilter.js` component for multi-dimension filtering (channel, user_group, channel_group, model).

### Component Details
- **File**: `web/default/src/components/DimensionFilter.js`
- **CSS**: `web/default/src/components/DimensionFilter.css`
- **Uses**: Semantic UI React `Dropdown`, `Form`, `Loader`, `Message`
- **Dimensions**: channel, user_group, channel_group, model (configurable via props)

### Props Interface
```typescript
interface DimensionFilterProps {
  dimensions?: string[];       // Array of enabled dimensions (default: all four)
  onChange?: Function;         // Callback: onChange(activeFilters, allFilters)
  value?: Object;              // Current filter values (for controlled mode)
  timeRange?: Object;          // Time range for fetching stats (optional)
}
```

### API Endpoints Used
- `/api/channel/` - Fetch channel list for dropdown options
- `/api/stats/user-groups` - Fetch user group list
- `/api/stats/channel-groups` - Fetch channel group list
- `/api/stats/models` - Fetch model list (top 50)

### Design System Tokens
- **Primary colors**: `#4318FF` (hover/focus), `#00B5D8`
- **Text colors**: `#1b2559` (text), `#A3AED0` (label)
- **Border**: `border-radius: 8px`, `border: 1px solid #E5E5E5`
- **Spacing**: `padding: 15px`, `gap: 15px`
- **Hover state**: `border-color: #4318FF`
- **Active item**: `background-color: #4318FF`, `color: #fff`

### Usage Example
```jsx
import DimensionFilter from './components/DimensionFilter';

<DimensionFilter
  dimensions={['channel', 'model']}
  onChange={(activeFilters, allFilters) => {
    // activeFilters: { channel: '1', model: 'gpt-4' } (non-'all' only)
    // allFilters: { channel: '1', user_group: 'all', ... }
  }}
  timeRange={{ start_timestamp: 1704067200, end_timestamp: 1706659200 }}
/>
```

### Notes
- Lazy loading - only fetches options for enabled dimensions
- Returns two objects from onChange: activeFilters (non-'all' only), allFilters (complete state)
- "All" option prepended to each options array
- Handles deleted channels with fallback text
- CSS responsive with mobile breakpoints at 768px and 480px

---

## Task 12b: HeatmapChart Component (2026-03-28)

### Summary
Created `HeatmapChart.js` and `HeatmapChart.css` - a 7x24 grid heatmap visualization for weekday x hour usage patterns.

### Component Details
- **Files**: 
  - `web/default/src/components/charts/HeatmapChart.js` (173 lines)
  - `web/default/src/components/charts/HeatmapChart.css` (140 lines)
- **Grid**: 7 days (Sunday-Saturday) x 24 hours (0-23) = 168 cells
- **Props**: `data`, `metric`, `height`

### Implementation Approach
- Custom CSS grid rendering (not using Recharts heatmap - limited customization)
- Data structure: `{ 'day-hour': value }` format for efficient lookup
- Color gradient: 8 levels from `#E6F7FF` (light cyan) to `#4318FF` (primary purple)

### Design System Tokens Applied
- **Color gradient**: Following chartConfig.barColors palette
- **Text colors**: `#A3AED0` (axis labels), `#2B3674` (tooltip header)
- **Tooltip**: white background, 8px radius, shadow `0 4px 12px rgba(0,0,0,0.15)`
- **Cell styling**: 3px radius, 2px gap between cells
- **Hover effect**: scale(1.1), opacity 0.85, purple border shadow

### Key Patterns
1. **useMemo for data processing**: Converts API array to grid hash map
2. **useMemo for maxValue**: Efficient color scaling calculation
3. **Tooltip positioning**: Uses getBoundingClientRect relative to container
4. **Responsive**: Shows only every 6th hour label on mobile

### Props Interface
```typescript
interface HeatmapChartProps {
  data: Array<{ weekday: number, hour: number, [metric]: number }>;
  metric?: 'request_count' | 'quota' | 'tokens';  // default: 'request_count'
  height?: number;  // default: 300
}
```

### Usage Example
```jsx
import HeatmapChart from '../components/charts/HeatmapChart';

<HeatmapChart
  data={[
    { weekday: 1, hour: 10, request_count: 150 },
    { weekday: 2, hour: 14, request_count: 200 },
  ]}
  metric="request_count"
  height={300}
/>
```

### i18n Keys Expected
- `dashboard.charts.heatmap.weekday.mon` through `dashboard.charts.heatmap.weekday.sun`
- `dashboard.charts.heatmap.less` - "Less"
- `dashboard.charts.heatmap.more` - "More"
- `dashboard.stats.charts.requests_tooltip`, `quota_tooltip`, `tokens.tooltip`

### Notes
- Avoided inline comments - used self-documenting variable names like `cellWidthPercent`, `colorIndex`
- Grid initialized with zeros for all 168 cells before filling with data
- Bounds checking for day (0-6) and hour (0-23) values
- Default maxValue set to 1 to prevent division by zero

---

## Task 12d: StackedGroupedBarChart Component (2026-03-28)

### Summary
Created `StackedGroupedBarChart.js` and `StackedGroupedBarChart.css` - a stacked bar chart for cross-dimensional analysis (e.g., channel x model).

### Component Details
- **Files**:
  - `web/default/src/components/charts/StackedGroupedBarChart.js` (221 lines)
  - `web/default/src/components/charts/StackedGroupedBarChart.css` (101 lines)
- **Approach**: Uses Recharts BarChart with `stackId='stack'` for stacking
- **Props**: `data`, `groupKey`, `stackKeys`, `colors`, `height`

### Implementation Pattern
- Recharts stacking: All `<Bar>` components share same `stackId` to stack vertically
- Data structure: Each row has groupKey (x-axis) + multiple stackKey columns for stacking
- Example data: `[{ channel: 'Channel A', 'gpt-4': 100, 'gpt-3.5': 50, 'claude': 30 }]`

### Design System Tokens Applied
- **Color palette**: Same `BAR_COLORS` array as GroupedBarChart (10 colors)
- **Tooltip style**: Custom tooltip showing all stack values + total
- **Grid style**: strokeDasharray='3 3', stroke='#E9ECEF', opacity: 0.5
- **Axis text**: fontSize: 12, fill: '#A3AED0'
- **Bar radius**: [4, 4, 0, 0] (top corners rounded)
- **Legend**: iconType='circle', iconSize=10, verticalAlign='top', height=36

### Custom Tooltip Features
- Shows all stack segment values for hovered group
- Displays color indicator + name + value for each segment
- Shows total sum at bottom with primary purple color
- Responsive styling with mobile breakpoints

### Props Interface
```typescript
interface StackedGroupedBarChartProps {
  data: Array<{ [groupKey]: string, [stackKey]: number }>;
  groupKey?: string;  // default: 'name'
  stackKeys: string[];  // e.g., ['gpt-4', 'gpt-3.5', 'claude']
  colors?: Object;  // custom color mapping
  showLegend?: boolean;
  showTooltip?: boolean;
  height?: number;  // default: 300
  margin?: Object;
  valueFormatter?: Function;
  legendFormatter?: Function;
  emptyMessage?: string;
  loading?: boolean;
}
```

### Usage Example
```jsx
import StackedGroupedBarChart, { BAR_COLORS } from '../components/charts/StackedGroupedBarChart';

<StackedGroupedBarChart
  data={[
    { channel: 'Channel A', 'gpt-4': 100, 'gpt-3.5': 50 },
    { channel: 'Channel B', 'gpt-4': 80, 'gpt-3.5': 60 },
  ]}
  groupKey="channel"
  stackKeys={['gpt-4', 'gpt-3.5']}
  height={300}
/>
```

### Notes
- Follows existing component patterns (GroupedBarChart, RadarChart)
- JSDoc block follows established project convention for reusable components
- Build passes successfully with existing warnings (not from new component)
- Export includes `BAR_COLORS` for downstream color customization

---

## Task 16: Channel Permission Filter

### Summary
Added channel permission filter logic to DimensionFilter component:
- Admin users see all channels
- Regular users see only channels they've used

### Files Modified
1. `web/default/src/components/DimensionFilter.js` - Added permission logic
2. `web/default/src/locales/zh/translation.json` - Added zh translations
3. `web/default/src/locales/en/translation.json` - Added en translations

### Implementation Details
- Used `isAdmin()` from `helpers/utils.js` to check user role
- For admin: fetches all channels from `/api/channel/`
- For regular users:
  - Fetches user's logs from `/api/log/self` (limit 1000)
  - Extracts unique channel IDs from logs
  - Filters channel list to only show used channels
  - Shows "No Used Channels" if user has no logs

### Translation Keys Added
- `dashboard.filters.all_used_channels` - "全部已使用渠道" / "All Used Channels"
- `dashboard.filters.no_used_channels` - "暂无已使用渠道" / "No Used Channels"

### Verification
- Frontend build: PASSED

---

## Task 15: TokenStats Page Integration (2026-03-28)

### Summary
Updated `web/default/src/pages/Token/TokenStats.js` to integrate DatePickerWithPresets, GranularitySelector, and ExportButton components.

### Changes Made
1. **Imports**: Added DatePickerWithPresets, GranularitySelector, ExportButton imports; removed Dropdown import
2. **State**: Changed from `dateRange` string to `timeRange` object with `{ startTimestamp, endTimestamp, preset }`; added `granularity` state
3. **API calls**: Updated to use URLSearchParams with `start_timestamp`, `end_timestamp`, `granularity` params
4. **Header section**: Replaced Dropdown with DatePickerWithPresets + GranularitySelector + ExportButton + Refresh button

### Key Patterns
- **useEffect dependency**: Now triggers when `timeRange.startTimestamp > 0` (DatePickerWithPresets initializes with onChange call)
- **URLSearchParams pattern**: Use `params.append('key', value)` and `params.toString()` for clean query string construction
- **ExportButton filters**: Pass `startTimestamp`, `endTimestamp`, `granularity` for single token stats export

### API Endpoints Expected
- `/api/token/${id}/stats?start_timestamp=X&end_timestamp=Y`
- `/api/token/${id}/stats/daily?start_timestamp=X&end_timestamp=Y&granularity=Z`
- `/api/token/${id}/stats/hourly` (unchanged - always last 24 hours)
- `/api/token/${id}/stats/model?start_timestamp=X&end_timestamp=Y`

### Build Verification
- Build passes with warnings only (no errors)
- Frontend bundle size unchanged significantly

### Notes
- Maintained backward compatibility with hourly stats (no time range change)
- Token-specific logic preserved (uses `useParams` for token ID)
- Single token view works with new components

---

## Task: Refactor Stats page with new components

### Summary
Refactored `web/default/src/pages/Dashboard/Stats.js` to integrate DatePickerWithPresets, DimensionFilter, GranularitySelector, and ExportButton components.

### Changes Made
1. **Imports**: Added imports for all 4 new components plus DimensionFilter.css
2. **State Management**:
   - Added `timeRange` state for date range (startTimestamp, endTimestamp, preset)
   - Added `granularity` state (default: 'day')
   - Added `dimensionFilters` state for dimension filtering
   - Changed `isAdminUser` from useState to constant (admin status doesn't change during lifecycle)
3. **Replaced Components**:
   - Removed old Dropdown for preset selection
   - Added DatePickerWithPresets for flexible date range selection
   - Added GranularitySelector for hour/day/week/month granularity
   - Added ExportButton for CSV download functionality
   - Added DimensionFilter with permission-based dimension options
4. **API Updates**:
   - Created `buildApiParams()` helper using useCallback for efficient memoization
   - Added granularity, channel_id, user_group, channel_group, model parameters
   - API calls now pass all filter parameters
5. **Permission Logic**:
   - `getEnabledDimensions()` returns all dimensions for admin users
   - Regular users only get 'model' dimension (channel access restricted)

### Key Patterns Used
1. **useCallback for API params**: Memoizes params based on filter dependencies
2. **useEffect with dependencies**: Triggers fetchAllStats when filters change
3. **Permission-based filtering**: Different dimensions visible based on isAdmin()
4. **ExportButton integration**: Uses getExportFilters() to build export params

### Component Integration
```jsx
<DatePickerWithPresets onChange={handleTimeRangeChange} defaultPreset='7d' />
<GranularitySelector value={granularity} onChange={handleGranularityChange} />
<ExportButton filters={getExportFilters()} />
<DimensionFilter dimensions={getEnabledDimensions()} onChange={handleDimensionFilterChange} timeRange={timeRange} />
```

### CSS Updates
- Added `.stats-filter-card` styles in Stats.css for new filter section

### Build Verification
- Build passes successfully with warnings only
- No ESLint errors (DISABLE_ESLINT_PLUGIN='true' used as project convention)

### Notes
- Removed unnecessary organizational comments (code is self-explanatory)
- Used constant `isAdminUser = isAdmin()` instead of useState (no setter needed)
- Existing chart types preserved (model_usage pie chart, user_ranking/token_ranking bar charts)
- All existing functionality maintained

## Task 13: Dashboard Page Integration - COMPLETED

**Date**: 2026-03-28
**Status**: Already implemented - No changes needed

### Summary
The Dashboard page (`web/default/src/pages/Dashboard/index.js`) was already fully integrated with all new components and charts from Wave 2.

### Integration Details

1. **DatePickerWithPresets** (lines 17, 443-447)
   - Provides time range selection with presets (7d, 14d, 30d, 90d, this_month, last_month, custom)
   - Uses react-datepicker with i18n locale support
   - Returns `{ startTimestamp, endTimestamp, preset }` on change

2. **DimensionFilter** (lines 18, 461-467)
   - Provides channel and model dropdown filters
   - Fetches options from API endpoints
   - Handles permission control (non-admin users see only used channels)

3. **GranularitySelector** (lines 19, 452-455)
   - Simple button group for hour/day/week/month selection
   - Uses Semantic UI Button.Group

4. **New Chart Components** (lines 677-752 in 2x2 grid):
   - **GroupedBarChart**: Channel comparison with requests/quota/tokens bars
   - **HeatmapChart**: Weekday x hour usage pattern (168 cells)
   - **RadarChart**: Multi-metric comparison across top 5 models
   - **StackedGroupedBarChart**: Channel x Model cross-dimensional analysis

### State Management
- `timeRange`: `{ startTimestamp, endTimestamp, preset }`
- `filters`: `{ channel, model }`
- `granularity`: 'hour' | 'day' | 'week' | 'month'

### API Calls
- `/api/user/dashboard`: Main dashboard data with time range and filters
- `/api/stats/heatmap`: Heatmap data for weekly usage patterns
- `/api/stats/channels`: Channel statistics for grouped bar chart

### Preserved Existing Features
- 3 Line charts for requests/quota/tokens trends (lines 473-625)
- Stacked bar chart for model distribution (lines 628-676)
- All existing functionality maintained

### CSS Styling
All chart components have dedicated CSS files:
- `Dashboard.css`: Main container and control styles
- `DatePickerWithPresets.css`: Date picker and preset buttons
- `DimensionFilter.css`: Dropdown filter styles
- `GroupedBarChart.css`, `HeatmapChart.css`, `StackedGroupedBarChart.css`: Chart-specific styles

### Translations
Both `zh/translation.json` and `en/translation.json` have complete translations for:
- `dashboard.date_picker.presets.*`
- `dashboard.filters.*`
- `dashboard.granularity.*`
- `dashboard.charts.*` (including new chart titles and weekday labels)

### Build Verification
- Frontend builds successfully with only ESLint warnings (no errors)
- No TypeScript/compilation issues

---

## 2026-03-29: Dashboard Granularity Fix

### Problem
When user selects granularity (hour/day/week/month), charts displayed incorrect X-axis labels because:
1. Backend ignored `granularity` parameter - always returned daily data
2. Frontend used hardcoded `Day` field and `formatDate()` formatter

### Solution

#### Backend Changes
1. **New struct**: `LogStatisticByGranularity` with `time_slot` field (consistent across all granularities)
2. **New function**: `SearchLogsByGranularityAndModel(userId, start, end, granularity)` using `GetDateGroupByColumn()` helper
3. **Controller**: `GetUserDashboard` now accepts `granularity` query param, defaults to "day"

#### Frontend Changes
1. **Data transformation**: `buildTimeSeriesData()` and `buildModelStackedData()` now use `time_slot` field
2. **Formatter**: Created `formatTimeByGranularity(timeSlot)` that switches on granularity state:
   - hour: `toLocaleTimeString()` with hour/minute
   - day: `toLocaleDateString()` with month/day
   - week/month: Return raw string (already formatted like "2026-W01" or "2026-01")
3. **xAxisConfig**: Changed `dataKey` from `'date'` to `'time_slot'`
4. **Tooltips**: All `labelFormatter` calls updated to use new formatter

### Pattern: Time Granularity in Backend
- Use `GetDateGroupByColumn(granularity)` from `model/log.go` to get proper SQL date truncation
- Returns `(groupSelect string, groupAlias string)` where `groupAlias` is always `"time_slot"`
- Supports MySQL, PostgreSQL, and SQLite with different date functions

### Pattern: Consistent Field Naming
- Backend returns `time_slot` for ALL granularities (not `day`, `hour`, `week`, `month` separately)
- Frontend uses consistent `time_slot` key, only formatter changes based on granularity
- This simplifies chart configuration - one dataKey, dynamic formatter

### Files Modified
- `model/log.go`: Added `LogStatisticByGranularity` struct and `SearchLogsByGranularityAndModel` function
- `controller/user.go`: Modified `GetUserDashboard` to accept granularity param
- `web/default/src/pages/Dashboard/index.js`: Updated data transformation, formatter, and chart config

### Build Verification
- Backend: `go build` passes
- Frontend: `npm run build` passes with warnings only


## Dashboard Controls Layout Fix (2026-03-29)

### Issue
Dashboard page controls (DatePicker, GranularitySelector, DimensionFilter) were misaligned in a Grid.Row with uneven column widths (6, 5, 5). DimensionFilter component's internal padding disrupted alignment.

### Solution
1. Replaced Grid layout with flexbox `controls-row` for better horizontal alignment
2. Added section-specific CSS classes:
   - `date-picker-section`: flex 1 1 280px, max-width 340px
   - `granularity-section`: flex 0 0 auto, min-width 140px (compact)
   - `filter-section`: flex 1 1 300px, max-width 500px
3. Override DimensionFilter padding in Dashboard context: `.dashboard-controls .dimension-filter-container { padding: 0; }`
4. Added responsive breakpoints for mobile stacking

### Design System Patterns
- Semantic UI Grid: 16-column system, `stackable` for responsive
- Flexbox: preferred for control bar layouts over Grid
- Colors: Primary #4318FF, Text #2B3674, Labels use 0.85rem/600 weight
- Spacing: 8px base, gap 12-24px for flex containers
- Card radius: 12px (controls), 16px (charts)

### Files Changed
- `web/default/src/pages/Dashboard/index.js`: controls layout JSX
- `web/default/src/pages/Dashboard/Dashboard.css`: flex-based layout + responsive
- `web/default/src/locales/zh/translation.json`: added title keys
- `web/default/src/locales/en/translation.json`: added title keys
