# Models.dev Pricing Integration Plan

**Status**: Draft  
**Date**: 2026-06-11  
**Author**: Agent (OpenCode)  
**Goal**: Integrate [models.dev](https://models.dev) public pricing into 9router as independent data source, complementing existing static pricing (`src/shared/constants/pricing.js`).

---

## 1. Data Sources Analysis

### 1.1 `api.json` — Provider-centric pricing
- **2.26 MB**, 141 providers, 1 line (unformatted JSON)
- Structure: `{ provider_id: { id, name, env, api, models: { model_id: { cost: { input, output, cache_read?, cache_write?, tiers?, context_over_200k? } } } } }`
- All costs in **$/1M tokens** (USD)
- **Cost fields**: `input`, `output` (base) + optional: `cache_read`, `cache_write`, `tiers`, `context_over_200k`, `input_audio`, `reasoning`
- Covers paid providers + some free (cost 0/0)

### 1.2 `models.json` — Model-centric metadata (NO pricing)
- **126 KB**, 211 models
- Structure: `{ "provider/model_id": { id, name, family, attachment, reasoning, tool_call, temperature, knowledge, release_date, last_updated, modalities, limit: { context, output }, weights, benchmarks } }`
- **Zero pricing data** — pure model capability catalog

### 1.3 `catalog.json` — Combined superset
- **2.38 MB**, ~600 models across 141 providers
- Structure: `{ models: { model_id: {...} }, providers: { provider_id: { ...provider_with_pricing } } }`
- Contains everything: model metadata + provider auth + pricing — same format as api.json but with models.json merged
- **Most authoritative source** — single fetch replaces both api.json + models.json

### 1.4 Key Gaps vs 9router pricing
| Feature | models.dev | 9router |
|---------|-----------|---------|
| `cached` (cache_read) | Per-provider | Per-canonical-model |
| `reasoning` | Per-provider | Per-canonical-model |
| `cache_creation` (cache_write) | Per-provider | Per-canonical-model |
| Context tiers | Yes (`context_over_200k`) | No |
| Usage tiers | Yes (`tiers`) | No |
| Model ID format | `provider/model_id` | Canonical name (no prefix) |
| Provider count | 141 | ~40 |
| Model count | ~600 | ~200 |

---

## 2. Integration Architecture

### 2.1 Design Principle
**Independent data source** — models.dev pricing stored separately from existing `PROVIDER_PRICING`/`MODEL_PRICING`. Not a replacement, but a second reference the system can optionally use.

### 2.2 Three-Layer Resolution (extended)

Current fallback (unchanged):
```
PROVIDER_PRICING → MODEL_PRICING → PATTERN_PRICING
```

New optional layer (when enabled):
```
models.dev pricing ▶ (if available AND newer) → override defaults
```

### 2.3 Data Flow

```
┌──────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   models.dev │     │  modelsDevService   │     │   pricing resolver  │
│  catalog.json│────→│  (fetch + cache)    │────→│  (merge with        │
│              │     │                     │     │   existing pricing)  │
└──────────────┘     └─────────────────────┘     └─────────────────────┘
                     │                      │
                     │  SQLite kv store     │
                     │  (persist snapshot)  │
                     └──────────────────────┘
```

### 2.4 Proposed Files

| File | Purpose |
|------|---------|
| `open-sse/services/modelsDevService.js` | Fetch, parse, cache models.dev data |
| `src/lib/db/repos/modelsDevPricingRepo.js` | Persist models.dev pricing snapshot in SQLite |
| `src/app/api/models-dev/route.js` | REST API: GET /api/models-dev (status, lastSync, provider list) |
| `src/app/api/models-dev/sync/route.js` | POST /api/models-dev/sync (trigger sync) |
| `src/app/dashboard/settings/models-dev/page.js` | Dashboard UI: toggle, view prices, last sync |
| `src/shared/constants/modelsDevDefaults.js` | Default config (sync interval, URLs) |

### 2.5 SQLite Schema (pricingRepo KV store reuse)

Scope key: `'modelsDevPricing'`
Value shape:
```json
{
  "lastSynced": "2026-06-11T10:00:00Z",
  "sourceUrl": "https://models.dev/catalog.json",
  "providers": {
    "openai": {
      "name": "OpenAI",
      "models": {
        "gpt-4o": {
          "input": 2.5,
          "output": 10,
          "cache_read": 1.25,
          "tiers": true,
          "context_over_200k": false
        }
      }
    }
  },
  "etag": "\"abc123\"",
  "version": "1"
}
```

### 2.6 Merging Strategy

When `getPricingForModel(provider, modelId)` is called:
1. Compute base price from existing 3-layer fallback (unchanged)
2. If models.dev pricing exists for exact `provider/model` match:
   - Compare `lastSynced` timestamp
   - If models.dev data is newer than the code deployment date → optionally prefer it
   - User can toggle: "Prefer models.dev prices" checkbox in dashboard
3. Return merged result with provenance metadata

### 2.7 Sync Mechanism

| Trigger | Behavior |
|---------|----------|
| Server start | Check if data older than 24h → background sync |
| Manual (dashboard) | Immediate sync |
| Periodic (optional) | Cron every 6h via Next.js `unstable_revalidate` or interval |
| On-demand (API call) | POST /api/models-dev/sync |

---

## 3. Model ID Mapping

Critical challenge: models.dev IDs differ from 9router model names.

**models.dev format**: `provider/model_id` (e.g., `openai/gpt-4o`, `anthropic/claude-sonnet-4-6`)  
**9router format**: Canonical name (e.g., `gpt-4o`, `claude-sonnet-4-6`)

Mapping strategy:
1. Extract canonical name: strip `provider/` prefix → match against `MODEL_PRICING` keys
2. For exact match failure → use fuzzy match via `PATTERN_PRICING` glob
3. If no match → store in DB as unmapped (dashboard shows warning)

Mapping table stored as separate SQLite KV record (`'modelsDevModelMap'`):
```json
{
  "openai/gpt-4o": "gpt-4o",
  "anthropic/claude-sonnet-4-6": "claude-sonnet-4-6",
  "deepseek/deepseek-chat": "deepseek-chat"
}
```

---

## 4. Dashboard UI

### 4.1 New Page: `/dashboard/settings/models-dev`

```
┌─────────────────────────────────────────────┐
│  Models.dev Pricing                         │
│                                             │
│  ● Enabled          [Disable]               │
│  Prefer models.dev prices: [x]              │
│  Auto-sync every: [24 hours ▼]              │
│                                             │
│  ─────────────────────────────────────────  │
│  Last synced: 2026-06-11 09:00 UTC          │
│  Providers: 141  |  Models: 587             │
│  Mapped: 412  |  Unmapped: 175              │
│                                             │
│  [Sync Now] [View Raw Data]                 │
│                                             │
│  ─────────────────────────────────────────  │
│  Provider    | Models | Source | Status     │
│  OpenAI      | 52     | matched | ✓         │
│  Anthropic   | 24     | matched | ✓         │
│  Upstage     | 3      | no match | ⚠        │
│  ...                                       │
└─────────────────────────────────────────────┘
```

### 4.2 Integration into Existing Pricing Modal

Add toggle in existing PricingModal (`src/shared/components/PricingModal.js`):
- "Show models.dev price" button → overlay shows models.dev price next to 9router price
- Color coding: green if agreed, yellow if slightly different, red if big difference

---

## 5. Implementation Phases

### Phase 1: Core Service (3-4 days)
| Task | Files | Effort |
|------|-------|--------|
| Create `modelsDevService.js` — fetch + parse catalog.json | `open-sse/services/modelsDevService.js` | 1 day |
| Create `modelsDevPricingRepo.js` — SQLite KV persistence | `src/lib/db/repos/modelsDevPricingRepo.js` | 0.5 day |
| Implement model ID mapping logic (extract + fuzzy match) | `open-sse/services/modelsDevService.js` | 0.5 day |
| Create API routes (status, sync) | `src/app/api/models-dev/*/route.js` | 1 day |
| Register in service initialization | `src/app/api/v1/chat/route.js` | 0.5 day |

### Phase 2: Dashboard UI (2-3 days)
| Task | Files | Effort |
|------|-------|--------|
| Settings page `/dashboard/settings/models-dev` | `src/app/dashboard/settings/models-dev/page.js` | 1 day |
| Integrate toggle into existing PricingModal | `src/shared/components/PricingModal.js` | 0.5 day |
| Provider comparison table | Component in settings page | 0.5 day |
| Sync status display | Component in settings page | 0.5 day |

### Phase 3: Pricing Resolution Integration (1-2 days)
| Task | Files | Effort |
|------|-------|--------|
| Extend `getPricingForModel()` to consult models.dev | `src/shared/constants/pricing.js` or new resolver | 0.5 day |
| Add "Prefer models.dev" toggle handling | Pricing resolver | 0.5 day |
| Provenance metadata in cost calculation | `src/lib/db/repos/usageRepo.js` | 0.5 day |
| Warning for unmapped models | Dashboard + log | 0.5 day |

### Phase 4: Polish & Testing (2 days)
| Task | Effort |
|------|--------|
| Error handling (fetch failure, stale data) | 0.5 day |
| Rate limiting on sync | 0.5 day |
| Dashboard price difference indicators | 0.5 day |
| Document integration in AGENTS.md | 0.5 day |

**Total: ~8-11 days**

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| models.dev goes down or changes schema | Pricing sync broken | Cache last snapshot; log error gracefully |
| Model ID mapping misses many models | Low coverage | Manual mapping table in JSON; community contributions |
| models.dev prices differ substantially from 9router | Confusion | Keep both visible; dashboard shows delta; user always chooses preference |
| Large JSON (~2.4MB) fetched on every sync | Bandwidth | HTTP ETag/If-None-Match; stream-parse; daily sync only |
| 141 providers clutter dashboard | Information overload | Filter to "matched 9router providers" view + search |

---

## 7. Key Design Decisions

1. **catalog.json only** — skip api.json + models.json since catalog.json is the superset. Single source reduces sync complexity.
2. **Reuse existing SQLite KV store** — no new DB migration or schema. All pricing snapshots use `pricingRepo` with scope `'modelsDevPricing'`.
3. **Never auto-override user prices** — models.dev data only fills in gaps. User-manual prices in dashboard always win.
4. **ETag-based caching** — models.dev likely serves static JSON; ETag prevents refetching unchanged data.
5. **Independent toggle** — feature disabled by default. Must be explicitly enabled in dashboard, keeping zero impact on existing installs.
