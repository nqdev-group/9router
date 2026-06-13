# Kế hoạch: Trang Report Token Saver (RTK + Caveman)

## Tổng quan

Trang report thống kê token saving từ 2 engine:
- **RTK Engine**: Nén `tool_result` content trước khi gửi lên LLM, track được `bytesBefore`, `bytesAfter`, `hits[]` mỗi filter
- **Caveman Engine**: Inject prompt rút gọn output, KHÔNG track metric cụ thể (chỉ estimation dựa trên level)

**Hiện trạng**: RTK stats chỉ log console qua `formatRtkLog()`, không persist. Caveman không track gì. Cần xây data collection layer trước, sau đó mới làm UI report.

---

## Phase 1: Data Collection Layer

### Vấn đề

`saveUsageStats()` trong `open-sse/handlers/chatCore/requestDetail.js` không nhận `rtkStats` param dù `nonStreamingHandler.js` đã pass nó. Streaming handler (`streamingHandler.js`) cũng không pass `rtkStats`.

### Cần sửa

1. **`open-sse/handlers/chatCore/requestDetail.js`** — `saveUsageStats()` thêm param `rtkStats`:
   - Nếu có, lưu vào `saveRequestUsage()` với field mới

2. **`src/lib/db/repos/usageRepo.js`** — `saveRequestUsage()`:
   - Thêm column `rtkSaved` (INTEGER) trong `usageHistory` table
   - Thêm column `rtkMeta` (TEXT — JSON) lưu chi tiết per-filter

3. **`open-sse/handlers/chatCore/streamingHandler.js`** — pass `rtkStats` tới `saveUsageStats()` (giống `nonStreamingHandler.js`)

### RTK metrics cần persist

Column `rtkMeta` — JSON structure:

```json
{
  "bytesBefore": 100000,
  "bytesAfter": 60000,
  "saved": 40000,
  "hits": [
    { "filter": "git-diff", "saved": 30000, "shape": "claude-string" },
    { "filter": "grep", "saved": 10000, "shape": "openai-tool" }
  ],
  "filtersUsed": ["git-diff", "grep"]
}
```

### Caveman estimation

Vì Caveman là prompt injection, không thể biết output chính xác nếu không có nó. Dùng estimation factor:

| Level | Estimated Saving |
|-------|-----------------|
| lite | ~20% output tokens |
| full | ~40% output tokens |
| ultra | ~60% output tokens |
| wenyan-lite | ~30% output tokens |
| wenyan | ~50% output tokens |
| wenyan-ultra | ~70% output tokens |

Lưu `cavemanLevel` + `estimatedSavingPercent` vào `settings` — không cần per-request tracking.

---

## Phase 2: API Endpoints

### 1. `/api/settings/token-saver/stats?period=today|24h|7d|30d|60d` — GET

Aggregated stats cho cả 2 engine.

**Response shape:**

```json
{
  "period": "7d",
  "totalRequests": 1500,
  "rtk": {
    "enabled": true,
    "totalBytesBefore": 150000000,
    "totalBytesAfter": 90000000,
    "totalSaved": 60000000,
    "savingsPercent": 40.0,
    "totalHits": 2500,
    "topFilters": [
      { "filter": "git-diff", "saved": 30000000, "hits": 800 },
      { "filter": "grep", "saved": 15000000, "hits": 400 },
      { "filter": "ls", "saved": 5000000, "hits": 200 }
    ]
  },
  "caveman": {
    "enabled": true,
    "level": "full",
    "estimatedSavingPercent": 40,
    "totalOutputTokens": 5000000,
    "estimatedSavedTokens": 2000000,
    "estimatedOutputWithoutCaveman": 7000000
  },
  "combined": {
    "totalInputSavedBytes": 60000000,
    "totalOutputEstimatedSavedTokens": 2000000,
    "totalEstimatedSavingsPercent": 42.3
  }
}
```

**Implementation**: Query `usageHistory` table, aggregate `rtkSaved` + `rtkMeta` columns. Với caveman, lấy từ settings.

### 2. `/api/settings/token-saver/chart?period=7d` — GET

Time-series data cho charts. Mỗi bucket chứa: label, totalTokens, rtkSaved, cavemanEstimatedSaved.

Tương tự `getChartData()` trong `usageRepo.js` nhưng thêm `rtkSaved`.

### 3. `/api/settings/token-saver/per-request?page=1&limit=50&filter=rtk-only|caveman-only|both` — GET

Per-request breakdown để user xem chi tiết.

**Response:**

```json
{
  "requests": [
    {
      "timestamp": "2026-06-09T10:30:00Z",
      "provider": "claude",
      "model": "claude-sonnet-4-5",
      "rtkSaved": 40000,
      "rtkFilters": ["git-diff", "grep"],
      "cavemanLevel": "full",
      "cavemanEstimatedSaved": 1500,
      "totalTokens": 120000
    }
  ],
  "total": 1500,
  "page": 1,
  "limit": 50
}
```

---

## Phase 3: UI Components

Theo project convention — reusable components ở `packages/components/token-saver/`, page-level orchestration ở `app/`.

### Component Tree

```
packages/components/token-saver/
├── index.js                    — barrel export
├── TokenSaverOverview.js       — Summary cards (4 summary metrics)
├── SavingsTrendChart.js        — Area/bar chart over time
├── RtkFilterBreakdown.js       — Per-filter table + donut chart
├── CavemanLevelHistory.js      — Level impact display + est savings
└── TokenSaverPerRequestTable.js — Paginated per-request table
```

### Component Details

#### `TokenSaverOverview.js`

4 summary cards (dựa trên pattern `StatsCards.js` hiện tại):
- Total bytes saved (input - RTK)
- RTK savings rate %
- Caveman est savings rate %
- Combined total est savings
- Requests affected count
- Active caveman level

#### `SavingsTrendChart.js`

Recharts area chart:
- X-axis: time buckets (hours/days)
- Y-axis: bytes
- Stacked areas: total tokens vs saved tokens
- Toggle: RTK only / Caveman only / Combined

#### `RtkFilterBreakdown.js`

- Table: Filter name | Hits | Bytes Saved | % of total
- Sortable columns
- Donut chart: top 5 filters by savings
- Link tới settings RTK để bật/tắt filter

#### `CavemanLevelHistory.js`

- Current level badge with est saving %
- Timeline chart: caveman level changes over time
- Statistical comparison: avg output tokens per request with different levels
- Info panel: copy prompt của level hiện tại

#### `TokenSaverPerRequestTable.js`

- Table mỗi dòng = 1 request
- Columns: Time | Provider | Model | RTK Saved | RTK Filters | Caveman Level | Est Output Saved
- Filter: RTK only / Caveman only / Both
- Pagination server-side
- Click → open request detail modal (reuse `RequestDetailsTab` from usage page)

---

## Phase 4: Page Integration

### New page

`src/app/(dashboard)/dashboard/token-saver/page.js`

**Layout** — Tabbed, pattern theo Usage page:

```jsx
<Tabs>
  <Tab label="Overview">
    <TokenSaverOverview period={period} />
    <SavingsTrendChart period={period} />
  </Tab>
  <Tab label="RTK Breakdown">
    <RtkFilterBreakdown period={period} />
  </Tab>
  <Tab label="Caveman">
    <CavemanLevelHistory period={period} />
  </Tab>
  <Tab label="Per-Request">
    <TokenSaverPerRequestTable />
  </Tab>
</Tabs>
```

### URL structure

- `/dashboard/token-saver` — default tab overview
- `/dashboard/token-saver?tab=rtk` — RTK breakdown
- `/dashboard/token-saver?tab=caveman` — Caveman breakdown
- `/dashboard/token-saver?tab=requests` — Per-request log

### Sidebar navigation

Thêm link vào sidebar (file layout dashboard):
- Icon: `savings` hoặc `token`
- Label: "Token Saver"
- Vị trí: sau Usage, trước Settings

---

## Phase 5: Thứ tự triển khai

### Week 1 — Data persistence

```
☐ open-sse/handlers/chatCore/requestDetail.js — thêm rtkStats param
☐ open-sse/handlers/chatCore/streamingHandler.js — pass rtkStats
☐ src/lib/db/repos/usageRepo.js — saveRequestUsage lưu rtkSaved + rtkMeta
☐ Migration: usageHistory table thêm columns
☐ Test: verify data persisted correctly
```

### Week 2 — API endpoints

```
☐ /api/settings/token-saver/stats — implementation
☐ /api/settings/token-saver/chart — implementation
☐ /api/settings/token-saver/per-request — implementation
☐ Unit tests cho endpoints
```

### Week 3 — UI components (packages/components/token-saver/)

```
☐ TokenSaverOverview.js
☐ SavingsTrendChart.js
☐ RtkFilterBreakdown.js
☐ CavemanLevelHistory.js
☐ TokenSaverPerRequestTable.js
```

### Week 4 — Page + integration

```
☐ src/app/(dashboard)/dashboard/token-saver/page.js
☐ Sidebar link
☐ E2E test: load page, verify data, filter by period
☐ Lint check
```

---

## Lưu ý kỹ thuật

| Issue | Giải pháp |
|-------|-----------|
| **Không có historical data** | Chỉ track từ ngày deploy Phase 1. Có thể backfill bằng parse request logs nếu cần |
| **Caveman không có metric chính xác** | Dùng estimation factor per level. Không claim chính xác, chỉ "estimated" |
| **DB migration** | Cần migration script add columns, xử lý NULL cho old rows |
| **Performance trên table lớn** | `rtkMeta` là JSON — không query filter trong JSON. Chỉ query aggregate `rtkSaved` column |
| **Settings sync** | Caveman level lưu ở settings table — report cần read settings để biết level hiện tại + historical changes |
| **Chi phí lưu trữ** | Mỗi request thêm ~100-500 bytes cho rtkMeta. Với 100k requests/tháng = ~10-50MB/tháng — chấp nhận được |

---

## File tham khảo

- RTK engine: `open-sse/rtk/index.js` — `compressMessages()` returns `{ bytesBefore, bytesAfter, hits: [{ shape, filter, saved }] }`
- Caveman: `open-sse/rtk/caveman.js` — `injectCaveman(body, format, level)` — no return value
- Usage persistence: `src/lib/db/repos/usageRepo.js` — `saveRequestUsage()` + `getUsageStats()`
- Existing StatsCards: `packages/components/rtk/StatsCards.js` — pattern cho summary display
- Cost Report (reference pattern): `src/app/(dashboard)/dashboard/usage/components/CostReport.js`
- Cost chart components: `packages/components/cost/`
