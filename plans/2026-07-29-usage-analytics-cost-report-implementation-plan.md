# Usage Analytics Cost Report Implementation Plan

**Trạng thái: ✅ DONE — verified 2026-07-29.** Đã wire vào tab "Cost Report" trong Usage page. Path trong plan gốc (`/packages/@9router/components/cost/`) sai cấu trúc — path thật (và đã sửa lại bên dưới) là `packages/components/cost/`, resolve qua alias `@9router/components` (xem `jsconfig.json`: `@9router/*` → `./packages/*`).

## Overview
Add Cost Report tab to Usage Analytics page with detailed cost visualizations and breakdowns. Prioritize reusable components in packages directory.

## Current State
- Cost data already stored in usageHistory/usageDaily tables
- Cost calculated at write time via usageRepo.js calculateCost()
- Existing UI shows cost in OverviewCards, UsageChart, UsageTable
- Pricing model from shared/constants/pricing.js

## Implementation

### 1. Route Changes (Source)
- Modify `/app/(dashboard)/dashboard/usage/page.js`
- Add "cost-report" to tabs array
- Conditional render CostReport component

### 2. Main Component (Source)
- Create `/app/(dashboard)/dashboard/usage/components/CostReport.js`
- Contains layout, date selector, export button
- Imports sub-components from packages

### 3. Reusable Sub-components (Packages) — ✅ DONE
Created in `packages/components/cost/` (import as `@9router/components/cost/*`):
- [x] `CostSummaryCards.js` - total cost, daily avg, projected monthly
- [x] `CostByProviderChart.js` - pie chart provider breakdown
- [x] `CostByModelChart.js` - bar chart model distribution
- [x] `CostTrendChart.js` - line chart daily cost trend
- [x] `CostBreakdownTable.js` - sortable/filterable detailed table
- [x] `index.js` - barrel export (not in original plan, added for the package pattern)

### 4. Utilities (Packages)
- Reused existing fmt/fmtCost from utils/format — no separate `packages/utils/cost.js` was needed

### 5. API Check
- Verify `/api/usage/stats` and `/api/usage/chart` provide sufficient data
- Add new endpoint only if existing APIs insufficient

### File Location Summary (corrected to actual paths)
```
src/app/(dashboard)/dashboard/usage/
├── page.js                     ✅ modified — tab "cost-report" wired in
└── components/
    └── CostReport.js            ✅

packages/components/cost/
├── index.js                     ✅
├── CostSummaryCards.js          ✅
├── CostByProviderChart.js       ✅
├── CostByModelChart.js          ✅
├── CostTrendChart.js            ✅
└── CostBreakdownTable.js        ✅
```

### Implementation Steps — ✅ all done
1. [x] Update UsagePage.js with new tab
2. [x] Create CostReport component with layout
3. [x] Build sub-components in packages/
4. [x] Import and assemble in CostReport.js
5. [ ] Not re-verified in this pass: responsive design, export functionality, large-dataset performance

### Reuse Opportunities
- Existing period selector logic
- Recharts implementation patterns
- Formatting utilities (fmt, fmtCost)
- Data fetching hooks
- Table component designs

### Considerations
- Maintain UI consistency
- Ensure responsive design
- Handle loading/error states
- Optimize for large datasets
- Follow existing code conventions
- Verify cost calculation accuracy
- Use existing export functionality if available
