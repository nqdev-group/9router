# Packages/ — Kiến trúc & Phân tích

## Tổng quan

`packages/` là nơi chứa **mọi feature engine, UI component, validation schema, provider helper** mới.
Import qua alias `@9router/*` (định nghĩa trong `jsconfig.json`).

```
packages/
  cmem/          → @9router/cmem        (Context Memory Engine)
  components/    → @9router/components/ (UI Components)
  kira-ai/       → @9router/kira-ai/    (Kira AI integration)
  mcpServer/     → @9router/mcpServer/  (MCP Server)
  provider-alert/ → @9router/provider-alert/ (Provider alerting)
  providers/     → @9router/providers/  (Extra provider registry)
  revidapi/      → @9router/revidapi/   (RevidAPI TTS)
  utils/         → @9router/utils/      (Shared utilities)
  validation/    → @9router/validation/ (JSON/Config schemas)
  index.js       ← stub for path alias resolution
```

---

## 1. cmem (`@9router/cmem`)

**Context Memory Engine** — ghi nhớ & inject context từ lần chat trước.
Opt-in, disabled by default. Dùng `cmem_*` tables trong 9router DB.

```
cmem/
  index.js                 → export { CmemEngine }
  core/
    index.js               → CmemEngine class (orchestrator)
    memoryStore.js          → lưu/v/search observations (FTS5)
    summarizer.js           → tóm tắt content bằng LLM hoặc heuristic
    contextBuilder.js       → build context từ observations + token budget
    tokenBudget.js          → quản lý token allocation
    configResolver.js       → resolve config với defaults
  capture/
    index.js               → export { Observer, OBSERVATION_TYPES }
    observer.js             → extract observation từ messages/response
    types.js                → observation type constants
  injection/
    index.js               → export { Injector, injectOpenAI, injectClaude, injectGemini }
    injector.js             → format-agnostic injection engine
    formatters/
      openai.js             → inject system msg cho OpenAI format
      claude.js             → inject cho Claude format
      gemini.js             → inject cho Gemini format
  config/
    defaults.js             → DEFAULT_CMEM_CONFIG
    modes.js                → CMEM_MODES map (code, code--zh, ...)
  utils/
    hash.js                 → hashContent()
    tokens.js               → estimateTokens()
```

### Pipeline hooks (trong `open-sse/handlers/chatCore.js`)

- `injectContext()` — pre-translate (sau PrivacyEngine, trước dispatch)
- `captureObservation()` — post-response (trong `onStreamComplete`)
- Cả 2 **fail-open**: error → null → skip

### DB tables (tạo trong `cmemRepo.js` migration)

- `cmem_observations` — content, summary, facts, concepts, files, tokens
- `cmem_sessions` — session metadata
- `cmem_context_cache` — cached context chunks
- `cmem_obs_fts` — FTS5 virtual table cho full-text search

---

## 2. components (`@9router/components/`)

UI component packages, import bởi Dashboard pages.

```
components/
  index.js                 → barrel export tất cả components
  rtk/                     → RTK Engine UI
    IntensitySelector.js   → export function IntensitySelector
    FilterGrid.js          → export function FilterGrid
    AdvancedSettings.js
    StatsCards.js
    TestPanel.js
  caveman/                 → Caveman Engine UI
    Index.js
    LevelSelector.js
    InfoPanel.js
    TestPanel.js
  cmem/                    → CMEM Engine UI
    ModeSelector.js
    TokenBudgetSlider.js
    ContextSections.js
    TestPanel.js
    StatsCards.js
    ObservationList.js
  cost/                    → Cost/Usage Charts
    CostBreakdownTable.js
    CostByModelChart.js
    CostByProviderChart.js
    CostReport.js
    CostSummaryCards.js
    CostTrendChart.js
  token-saver-report/      → Token Saver Report UI
    CavemanLevelHistory.js
    CmemContextStats.js
    ResponseCacheStats.js
    RtkFilterBreakdown.js
    SavingsTrendChart.js
    TokenSaverOverview.js
    TokenSaverPerRequestTable.js
```

### ⚠️ Barrel export pattern

Tất cả component hiện tại dùng **named export** (`export function X`).
Barrel `index.js` dùng:
```js
export { IntensitySelector } from "./rtk/IntensitySelector.js"; // ✓ đúng cho named export
```

Không dùng `export default function` ở components — nên barrel `export { X }` là đúng.
(Ngược lại, engine packages như `cmem/core/index.js` export `class CmemEngine` — dùng `export { CmemEngine }`.)

---

## 3. validation (`@9router/validation/`)

Config/input validation schemas.

```
validation/
  index.js                 → barrel: re-export * từ tất cả schemas
  rtkConfigSchemas.js      → validateRtkConfig(), VALID_INTENSITIES, ...
  cavemanSchemas.js        → validateCavemanConfig(), VALID_CAVEMAN_LEVELS
  cmemSchemas.js           → validateCmemConfig(), VALID_CMEM_MODES, ...
  privacySchemas.js        → validatePrivacyConfig(), DEFAULT_KEYWORDS, ...
```

Dùng `export *` pattern trong barrel.

---

## 4. kira-ai (`@9router/kira-ai/`)

Kira AI provider config.

```
kira-ai/
  index.js                 → export { KIRA_PROVIDER_ID, KIRA_PROVIDER_CONFIG, KIRA_MODELS }
  config.js                → provider definitions, model list (text/image/video/tts)
```

---

## 5. mcpServer (`@9router/mcpServer/`)

MCP (Model Context Protocol) server factory.

```
mcpServer/
  index.js                 → export { createMCPServer }
  lib/server.js            → createMCPServer({ name, handler })
  package.json             → @9router/mcp-server
```

---

## 6. provider-alert (`@9router/provider-alert/`)

Alerting khi provider accounts đều down.

```
provider-alert/
  index.js                 → export { checkAllAccountsDown, checkRecovery, sendDiscordAlert, ... }
  engine.js                → checkAllAccountsDown(), checkRecovery(), formatAlertMessage()
  discord.js               → sendDiscordAlert() webhook với retry 429
```

---

## 7. providers/registry (`@9router/providers/registry`)

Extra provider registry entries (bổ sung cho `open-sse/providers/registry/`).

```
providers/registry/
  index.js                 → auto-generated static imports
  kira.js                  → Kira provider config
  llm7.js                  → LLM7 provider config
  sambanova.js             → Sambanova provider config
```

File `index.js` là auto-generated (giống `open-sse/providers/registry/index.js`).
**Không hand-edit.**

---

## 8. revidapi (`@9router/revidapi/`)

RevidAPI TTS (text-to-speech) integration.

```
revidapi/
  index.js                 → export { REVIDAPI_REGISTRY_ENTRY, REVIDAPI_MODELS_CONFIG, revidapiAdapter, ... }
  config.js                → registry entry, models, voices, engine configs, API endpoints
  adapter.js               → synthesize() function, poll-based status checking
```

---

## 9. utils (`@9router/utils/`)

Shared utilities.

```
utils/
  header.util.js           → getPageInfoUtil() — page metadata cho dashboard header
```

---

## Barrel Export Summary

| Package | Export Pattern | Barrel |
|---------|---------------|--------|
| cmem | `export class` / named | `export { X }` |
| components | **`export function`** (named) | `export { X }` |
| validation | named | `export *` |
| kira-ai | named | `export { X }` |
| mcpServer | named | `export { X }` |
| provider-alert | named | `export { X }` |
| revidapi | named | `export { X }` |
| utils | named | — |

---

## Phát hiện quan trọng

1. **Không có `export default function`** trong components như AGENTS.md mô tả — tất cả dùng `export function` (named). Barrel `export { X }` là đúng.
2. **cmem là package phức tạp nhất** — 15 files, 6 subdirs, có DB migration riêng, pipeline hooks, config defaults, validation schemas.
3. **providers/registry/index.js** là auto-generated — copy pattern từ `open-sse/providers/registry/`.
4. **provider-alert** là package utility thuần — gọi từ pipeline, không có UI.
5. **Mỗi engine (cmem, rtk, caveman)** đều có: core logic + config defaults + validation schema + UI components + DB tables (nếu cần).
