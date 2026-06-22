# Usage Analytics Cost Report Implementation Plan

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

### 3. Reusable Sub-components (Packages)
Create in `/packages/@9router/components/cost/`:
- `CostSummaryCards.js` - total cost, daily avg, projected monthly
- `CostByProviderChart.js` - pie chart provider breakdown
- `CostByModelChart.js` - bar chart model distribution
- `CostTrendChart.js` - line chart daily cost trend
- `CostBreakdownTable.js` - sortable/filterable detailed table

### 4. Utilities (Packages)
- Add cost formatting helpers to `/packages/@9router/utils/cost.js` if needed
- Reuse existing fmt/fmtCost from utils/format

### 5. API Check
- Verify `/api/usage/stats` and `/api/usage/chart` provide sufficient data
- Add new endpoint only if existing APIs insufficient

### File Location Summary
```
/app/(dashboard)/dashboard/usage/
├── page.js (modified)
└── components/
    └── CostReport.js (source)

/packages/@9router/components/cost/
├── CostSummaryCards.js
├── CostByProviderChart.js
├── CostByModelChart.js
├── CostTrendChart.js
└── CostBreakdownTable.js
```

### Implementation Steps
1. Update UsagePage.js with new tab
2. Create CostReport component with layout
3. Build sub-components in packages/
4. Import and assemble in CostReport.js
5. Apply existing styles/patterns
6. Test date ranges and exports

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
