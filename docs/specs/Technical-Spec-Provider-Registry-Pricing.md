# Provider Registry & Pricing — Technical Specification

> **Metadata**
> Date: 2026-09-08
> Author(s): Reverse-engineered from source (nqdev-codebase-analyst)
> Status: Implemented
> Last Updated: 2026-09-08
> Version: 1.0
> Related Docs: `AGENTS.md` (root) "Provider system", `packages/AGENTS.md`, `docs/guide/05-provider-system.md`

---

## 1. Overview

The provider registry is 9Router's catalog of every upstream AI/media/search service it can route to — over 100 registry files under `open-sse/providers/registry/` covering chat/LLM providers plus TTS, STT, image generation, web search, and embeddings vendors, merged at runtime with a small hand-maintained extension set in `packages/providers/registry/` for non-upstream additions. A parallel pricing module (`open-sse/providers/pricing.js` + `packages/providers/pricing.js`) resolves a $/1M-token rate for any `provider/model` pair through a three-tier fallback chain, powering cost display and cost-aware combo routing.

### Context
Sits underneath every other routing feature: the combo pipeline, capability auto-switch, and tier-routing all depend on the registry (for capabilities/format) and pricing module (for cost figures) being accurate and complete.

### Scope
Registry structure and build (`open-sse/providers/index.js`), the fork-safe extension mechanism (`packages/providers/registry/`), and the pricing resolution chain (`getPricingForModel`).

**Out of scope:** executor implementations (how a request is actually sent to a provider — that's `open-sse/executors/`), translator implementations (format conversion).

## 2. Motivation

### Problem Statement
- **Who has the problem?** The team maintaining this fork, who must add providers 9Router's upstream doesn't have, without creating perpetual merge conflicts against upstream's own provider list.
- **Pain point:** `open-sse/providers/registry/index.js` is an **auto-generated** file, regenerated whenever upstream adds a provider via merge — hand-editing it directly means every future upstream merge either silently reverts the edit or conflicts.
- **Impact:** Without an isolation mechanism, every fork-specific provider addition is a recurring maintenance/conflict cost on every upstream sync.

### Current State
Solved via a two-source-merge design: `packages/providers/registry/index.js` (hand-maintained, small, fork-owned) is spread into the same `PROVIDERS`/`PROVIDER_MODELS`/`PROVIDER_MEDIA` maps as the upstream-generated `open-sse/providers/registry/index.js`, with the fork's entries taking precedence (spread first).

### Why Now
N/A — documenting the existing, working mechanism.

## 3. Goals

1. **Fork-safe provider addition** — new providers never require touching an upstream-owned/auto-generated file.
   - Success metric: adding provider requires only creating `packages/providers/registry/{id}.js` + one import/array line in the small hand-maintained `packages/providers/registry/index.js`.
2. **Accurate, current-enough pricing** for cost display and cost-aware routing.
   - Success metric: `getPricingForModel(provider, model)` resolves for every model returned by `PROVIDER_MODELS`, falling back gracefully (pattern match) for unlisted/new model IDs.
3. **Correct capability/format metadata** so the translation and combo-capability-auto-switch layers behave correctly per provider.

### Success Criteria

| Metric | Target |
|---|---|
| Registry files not requiring hand-edit of auto-generated file for new fork providers | 100% of fork-added providers (5 confirmed today: `kira`, `revidapi`, `vilao`, `codely`, `zenmux`, `opencode-zen`, `aimlapi`, `meta-llm`, `gurouter`, `hhtechapi` — 10 currently registered in `packages/providers/registry/index.js`) |
| Pricing resolution fallback depth | 3 tiers (provider-override → canonical model → glob pattern), always attempted in order before returning `null` |
| Provider count | 100+ registry files in `open-sse/providers/registry/` (LLM chat + media/search/TTS/STT/image providers combined); root `AGENTS.md` cites "40+" specifically for LLM chat-capable upstream providers |

## 4. Non-Goals

- ❌ Live pricing sync from provider APIs — pricing is hardcoded in JS (plus a cached `models.dev` snapshot for some models via `modelsDevPricingRepo.js`), not fetched per-request.
- ❌ Per-account custom pricing overrides beyond the existing `pricingRepo.js` (kv scope `pricing`) user-override layer — that layer exists but is not part of this spec's registry/pricing-module core.
- ❌ Validating that a registered provider's model list is still accurate against the live upstream API (a stale/removed model would only surface as a runtime error, not a build-time check).

## 5. Design

### High-Level Architecture

```
packages/providers/registry/{id}.js (fork-owned, 10 files)  ─┐
                                                               ├─▶ spread FIRST into
open-sse/providers/registry/{id}.js (upstream-owned,          │   REGISTRY (open-sse/providers/index.js)
  100+ files, auto-generated index.js import list)  ─────────┘        │
                                                                        ▼
                                                        PROVIDERS, PROVIDER_MODELS, PROVIDER_MEDIA
                                                                        │
                        ┌───────────────────────────────────────────────┼─────────────────────────┐
                        ▼                                               ▼                          ▼
        open-sse/config/providers.js                    open-sse/config/providerModels.js   getCapabilitiesForModel()
        (re-export, shared headers, region resolvers)    (+ CORE_PROVIDER_MODELS)             (open-sse/providers/capabilities.js)

open-sse/providers/pricing.js :: getPricingForModel(provider, model)
  1. PROVIDER_PRICING[provider][model]            (built-in override)
  1b. EXTRA_PROVIDER_PRICING[provider][model]      (packages/providers/pricing.js — fork extension)
  2. MODEL_PRICING[model] (or baseModel after stripping "vendor/" prefix)
  3. PATTERN_PRICING glob match (ordered list, first match wins)
  → null if nothing matches
```

### System Components

#### Component 1: Registry Build (`open-sse/providers/index.js`)

**Responsibility:** Merge fork-extension providers (`@9router/providers/registry/index.js`) and upstream-generated providers (`open-sse/providers/registry/index.js`) into single `REGISTRY`/`PROVIDERS`/`PROVIDER_MODELS`/`PROVIDER_MEDIA` maps. Extension providers are spread **first**, so a fork-defined provider id can shadow/extend an upstream one if they collide (though in practice ids are kept distinct).

**Each registry entry shape** (per `REGISTRY_TEMPLATE.js`): transport config (`baseUrl`, `format`), OAuth config (`clientId`/`clientSecret`/`tokenUrl`/`authUrl`/`refreshUrl`) or `noAuth: true`, static `headers`, and a model list.

#### Component 2: Fork Extension Point (`packages/providers/registry/`)

**Responsibility:** The only sanctioned place to add a non-upstream provider. `index.js` here is explicitly commented "Hand-maintained (NOT auto-generated)" — a deliberate contrast with its upstream counterpart. Currently registers 10 providers (`kira`, `revidapi`, `vilao`, `codely`, `zenmux`, `opencode-zen`, `aimlapi`, `meta-llm`, `gurouter`, `hhtechapi`); two more (`llm7`, `sambanova`) are commented out as "duplicate with open-sse" — i.e., upstream later added its own version of those, and the fork's copies were disabled rather than deleted (preserved for reference/rollback).

**Steps to add a provider (per root `AGENTS.md`):**
1. `packages/providers/registry/{id}.js` (copy shape from `open-sse/providers/REGISTRY_TEMPLATE.js`).
2. Register in `packages/providers/registry/index.js` (import + array entry — 2 lines).
3. Optionally an executor in `open-sse/executors/` (only for non-OpenAI-compatible transport — `DefaultExecutor` handles the common case).
4. Optionally translators in `open-sse/translator/{request,response}/`, registered in `open-sse/translator/index.js`.

#### Component 3: Pricing Resolution (`open-sse/providers/pricing.js`)

**Responsibility:** `getPricingForModel(provider, model)` — the single source of truth cost calculators call. Three-tier fallback documented in Design's architecture diagram above; `calculateCostFromTokens(tokens, pricing)` converts a resolved pricing object + a usage-tokens object into a dollar figure, correctly avoiding double-charging cached/cache-creation tokens at the full input rate (`nonCachedInput = inputTokens - cachedTokens - cacheCreationTokens`).

**Pricing object shape:** `{ input, output, cached?, reasoning?, cache_creation? }` — all $/1M tokens. Missing `cached`/`reasoning`/`cache_creation` fall back to `input`/`output`/`input` respectively inside `calculateCostFromTokens`.

**Pattern pricing** uses simple glob matching (`*` wildcard, case-insensitive) checked in list order — first match wins, so more-specific patterns (e.g. `gpt-5.6-*`) must be listed before more-generic ones (e.g. `gpt-5*`) in `PATTERN_PRICING`.

#### Component 4: Fork Pricing Extension (`packages/providers/pricing.js`)

Mirrors the registry extension pattern — `EXTRA_PROVIDER_PRICING` is checked as fallback tier 1b, after the built-in `PROVIDER_PRICING` override but before canonical `MODEL_PRICING`.

### Data Model

No database table — this is entirely static, in-source configuration (JS object literals), loaded at process start. The only DB-backed pricing layer is `pricingRepo.js` (kv scope `pricing`), a user-facing *override* on top of everything described here, out of this spec's scope.

### Security Considerations
No secrets live in the registry/pricing files themselves — OAuth `clientId`/`clientSecret` values in `providers/registry/{id}.js` are the provider's own public OAuth app credentials (standard for PKCE/device-code flows), not per-user secrets; per-user tokens are stored in `providerConnections`, not here.

## 6. API & Interfaces

### Internal API
```js
// open-sse/providers/index.js
export const PROVIDERS, PROVIDER_MODELS, PROVIDER_MEDIA, REGISTRY;

// open-sse/providers/pricing.js
getPricingForModel(provider, model) -> { input, output, cached?, reasoning?, cache_creation? } | null
calculateCostFromTokens(tokens, pricing) -> number  // dollars
matchPattern(pattern, model) -> boolean
formatCost(cost) -> string  // "$X.XX"
```

### Public-facing surfaces built on this module
- `GET /api/pricing` — pricing overrides CRUD (dashboard).
- `GET /v1/models` — model catalog, sourced from `PROVIDER_MODELS`.
- `/dashboard/usage` cost charts — computed via `calculateCostFromTokens`.

## 7. Metrics & Success Criteria

No automated metric tracks "pricing table freshness" — this is a manually-maintained data file, and stale entries would only surface as incorrect cost figures in the dashboard, not an error. Regression baseline (`tests/__baseline__/verify-*.mjs`) does cover provider-registry structure/aliases, catching accidental registry shape breakage (not pricing accuracy).

## 8. Trade-Offs

| Decision | Alternative | Why chosen |
|---|---|---|
| Hardcoded pricing tables in JS | Fetch live from provider billing APIs per request | No per-request latency/dependency; most providers don't expose a queryable pricing API anyway; `modelsDevPricingRepo.js` cached snapshot supplements this for some models |
| Spread fork-extension providers first | Spread upstream first | Lets a fork provider intentionally override an upstream-defined id if ever needed, without special-casing |
| Auto-generated `open-sse/providers/registry/index.js` | Hand-maintained single index for everything | Matches upstream's own generation tooling — regenerating cleanly on every upstream sync avoids a merge-conflict-prone hand file for the 100+ upstream providers |
| Glob-pattern pricing fallback, ordered list | A lookup trie / more structured pattern matching | Simplicity — a short ordered array is easy to reason about and edit by hand for a few dozen patterns |

### What We're Giving Up
- Pricing can silently drift from a provider's actual current rate if not manually updated (no alerting on staleness).
- Two nearly-identical "add a provider" flows exist (`open-sse/providers/registry/` for upstream, `packages/providers/registry/` for fork) — a contributor must know which one applies, or risk their addition being wiped on the next upstream sync.

## 9. Alternatives Considered

Not documented as an explicit ADR in-repo. The fork-extension pattern (`packages/providers/registry/`) is clearly a deliberate architectural response to repeated merge-conflict pain (inferred from the root `AGENTS.md` "Fork & upstream sync" section's explicit framing), rather than a documented alternatives-weighing process.

## 10. Implementation

Already implemented; 100+ upstream provider registry files, 10 fork-extension providers, pricing tables covering dozens of model families (Claude, GPT, Gemini, Qwen, Kimi, DeepSeek, GLM, MiniMax, Grok, plus a large TokenRouter reseller override block). No further phased plan exists in-repo.

### Testing Strategy (current)
`tests/__baseline__/verify-*.mjs` compares committed snapshots for "providers, aliases, OAuth URLs" — run after touching provider registry or alias logic, per root `AGENTS.md`. **Known broken on Windows** (path-prefix matching bug in the baseline-diff script) — diff by eye or run on Linux/CI.

## 11. Open Questions

- [ ] Is there a process (manual or scheduled) for periodically re-verifying pricing table accuracy against provider-published rates, or is drift only caught when a user notices?
- [ ] What's the intended lifecycle for the two commented-out fork providers (`llm7`, `sambanova`) now duplicated upstream — delete, or keep as a rollback reference indefinitely?
- [ ] Should `packages/PACKAGES-ANALYSIS.md` (flagged as stale in `packages/AGENTS.md`, still listing removed `kira-ai/`) be corrected or removed to avoid confusing future contributors about the provider-registry pattern?

## 12. References

**Related specs:** `Technical-Spec-Combo-Pipeline-Fallback.md` (consumes capability metadata + pricing for tier-routing).
**Source files:** `open-sse/providers/index.js`, `open-sse/providers/pricing.js`, `open-sse/providers/capabilities.js`, `open-sse/providers/REGISTRY_TEMPLATE.js`, `packages/providers/registry/index.js`, `packages/providers/pricing.js`.
**Prior docs:** `docs/guide/05-provider-system.md`, root `AGENTS.md` "Provider system".

## 13. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | — | — | ⭕ Pending |
| Engineering | — | — | ⭕ Pending |

## 14. Document History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-09-08 | 1.0 | nqdev-codebase-analyst | Initial spec, reverse-engineered from `open-sse/providers/*.js` + `packages/providers/registry/*.js` |
