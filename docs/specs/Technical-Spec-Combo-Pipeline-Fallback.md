# Combo Pipeline & Fallback — Technical Specification

> **Metadata**
> Date: 2026-09-08
> Author(s): Reverse-engineered from source (nqdev-codebase-analyst)
> Status: Implemented
> Last Updated: 2026-09-08
> Version: 1.0
> Related Docs: `docs/specs/Technical-Spec-Model-Combo-Cooldown.md`, `docs/Business-Document.md` §5, `src/sse/AGENTS.md`, `open-sse/AGENTS.md`

---

## 1. Overview

The combo pipeline is 9Router's core resilience mechanism: a request targeting a *combo* (a named ordered list of `provider/model` strings) is tried against each model in turn — and, within each model, against each configured account/credential — until one succeeds. It is the primary reason a client integration against 9Router survives individual provider outages, rate limits, or expired credentials without any client-side retry logic.

### Context
Sits between the Next.js route layer and the provider-agnostic `open-sse/` engine. Two files implement it: `src/sse/handlers/chat.js` (entry, per-request orchestration, account fallback) and `open-sse/services/combo.js` (`handleComboChat`/`handleFusionChat`, the model-level retry loop and reordering pipeline).

### Scope
This spec covers: combo detection, the three combo strategies (fallback, round-robin, fusion), the model-reordering pipeline (token-limit → cooldown → tier-routing → capability auto-switch), and the account-fallback loop nested inside each model attempt.

**Out of scope:** per-combo model cooldown internals (separate spec), provider credential storage/OAuth (see Auth spec), translation/execution internals (see SSE-Translation-Streaming spec).

## 2. Motivation

### Problem Statement
- **Who has the problem?** Any API client sending requests through 9Router when a single provider/account/model is unavailable.
- **Pain point:** Without automatic fallback, a rate-limited or down provider fails every request until manually swapped out.
- **Impact:** Broken agent sessions, manual intervention, lost work in long-running coding-agent tasks.

### Current State (this system already implements the solution)
A combo definition (`combos` table) lists candidate models; `handleComboChat` iterates them; within each model, `handleSingleModelChat` iterates every active credential for that model's provider before giving up on that model.

### Why Now
N/A — this is the existing, shipped mechanism being documented, not a proposed change.

## 3. Goals

1. **Zero-touch resilience** — a client should not need to detect or react to a provider/account outage.
   - Success metric: fraction of combo requests that succeed via fallback (2nd+ model or account) vs. fail entirely.
2. **Bounded latency overhead** — fallback should not multiply latency unboundedly.
   - Success metric: transient-error cooldown wait is capped at 5s per hop (`cooldownMs <= 5000` gate in `combo.js`).
3. **Correct capability routing** — a request needing vision/pdf/audio input should not be sent to a model that will silently drop that data.
   - Success metric: capability auto-switch floats a capable model to the front when `detectRequiredCapabilities` finds hard requirements.

### Success Criteria

| Metric | Target | Notes |
|---|---|---|
| Combo exhaustion (all models/accounts fail) | Return 503 with `Retry-After` when derivable | Implemented (`unavailableResponse`) |
| Non-fallback-eligible errors | Returned immediately, no wasted retries | Implemented (`checkFallbackError`) |
| Cooldown pool never empties | Fail-open — always at least one candidate | Implemented (`filterSkippedComboModels`) |

## 4. Non-Goals

- ❌ Cross-process/distributed state for cooldown or rotation (in-memory `Map`, single-process only — see §8 Trade-offs).
- ❌ Guaranteeing a specific model succeeds — only that *some* model in the combo is tried if one is viable.
- ❌ Rate limiting inbound client requests (out of scope; see Business-Document §6.4).
- ❌ Persisting fallback/cooldown history for analytics (not currently logged beyond console).

## 5. Design

### High-Level Architecture

```
Client
  │ POST /v1/chat/completions { model: "<combo-name>", ... }
  ▼
src/app/api/v1/chat/completions/route.js  (thin route)
  ▼
src/sse/handlers/chat.js :: handleChat()
  │ 1. parse body, requireApiKey check
  │ 2. getComboModels(modelStr) → combo?
  │ 3. resolve strategy (per-combo override → settings.comboStrategy → "fallback")
  │ 4. augmentModelsWithCapacityAdapter (may inject extra models for missing capability)
  ▼
"fusion" strategy?──yes──▶ open-sse/services/combo.js :: handleFusionChat()
  │no
  ▼
open-sse/services/combo.js :: handleComboChat()
  │ reorder pipeline: token-limit → cooldown → tier-routing → capability auto-switch
  │ for each model in order:
  ▼
src/sse/handlers/chat.js :: handleSingleModelChat(body, model)
  │ while(true) over getProviderCredentials(provider, excludeConnectionIds, model):
  │   checkAndRefreshToken → handleChatCore (open-sse) → success? return : markAccountUnavailable
  ▼
Response (2xx) or exhaustion → next model in combo, or final error to client
```

### System Components

#### Component 1: Combo Resolver (`src/sse/handlers/chat.js`)

**Responsibility:** Detect whether the incoming `model` string is a combo name, resolve strategy, and dispatch to fallback or fusion handling. Also re-detects combos inside `handleSingleModelChat` (a combo name can arrive there when `getModelInfo` returns `provider: null`) — combo detection therefore runs **twice** per request in some paths; both branches must stay in sync (documented pitfall in `src/sse/AGENTS.md`).

**Key interface:**
```
handleChat(request) -> Response
handleSingleModelChat(body, modelStr) -> Response   // also the account-fallback loop
```

#### Component 2: Model-Level Retry Loop (`open-sse/services/combo.js :: handleComboChat`)

**Responsibility:** Own the reorder pipeline and the per-model try/fallback loop.

**Reorder pipeline (applied in this fixed order, each stage optional/config-gated):**
1. **Round-robin rotation** (`getRotatedModels`) — if `comboStrategy === "round-robin"`, rotates the array start index based on in-memory `comboRotationState`, honoring a "sticky" request count before advancing.
2. **Token-limit bypass** (`@9router/token-limit-routing`) — hard-drops models whose configured max-input-tokens can't fit the estimated prompt. Fail-open (never empties the list).
3. **Model cooldown filter** (`@9router/model-combo-cooldown`) — skips models that failed inside *this* combo within the last 5 minutes. Fail-open. See dedicated spec.
4. **Cost/tier-aware reorder** (`@9router/tier-routing`) — reorders (never drops) by price or task-criticality, only when `tierRouting.enabled`.
5. **Capability auto-switch** (`reorderByCapabilities`) — floats models satisfying detected hard capabilities (vision/pdf/audioInput/videoInput) to the front; soft capabilities (e.g. search) only break ties within a tier. Stable sort, never drops a model.

**Try loop:** for each model in the final order, call `handleSingleModel(body, modelStr)`. On 2xx, return immediately. On failure, `checkFallbackError(status, errorText)` (from `accountFallback.js`) decides whether to continue to the next model; non-fallback-eligible errors return immediately as-is. Transient 502/503/504 with a short cooldown (≤5s) get a brief `await` before moving on, giving the provider a chance to recover. Every fallback-eligible failure calls `markComboModelFailed` if cooldown is enabled.

#### Component 3: Account Fallback Loop (`src/sse/handlers/chat.js :: handleSingleModelChat`)

**Responsibility:** For one resolved model, try every active credential for its provider before declaring the model itself failed.

```
while (true) {
  credentials = getProviderCredentials(provider, excludeConnectionIds, model)
  if (!credentials) return 404
  if (credentials.allRateLimited) return 503 + Retry-After
  checkAndRefreshToken(credentials)          // proactive OAuth refresh
  result = handleChatCore(body, modelInfo, credentials, ...)  // open-sse engine call
  if (result.success) return result
  shouldFallback = markAccountUnavailable(...)   // via accountFallback.js checkFallbackError
  if (shouldFallback) { excludeConnectionIds.add(credentials.id); continue }
  return result   // no-fallback error returned as-is
}
```
There is **no cap on total accounts tried** — the loop only exits on credential exhaustion or success.

#### Component 4: Fusion Handler (`handleFusionChat`)

**Responsibility:** Alternative combo strategy — fan the request to a panel of models in parallel (non-streaming, tools flattened to prose via `flattenToolHistory`), collect answers with quorum-grace (`minPanel`≥2, `stragglerGraceMs`=8s after quorum, `panelHardTimeoutMs`=90s absolute cap), then have a judge model (default `panel[0]`) synthesize one final answer from anonymized "Source N" panel responses. Degrades to direct pass-through if only 0-1 panel answers succeed. **Model cooldown is not applied to fusion combos.**

### Workflows

See `docs/Business-Document.md` §5 WF-02 and WF-03 for the full step-by-step happy-path and business rules — not duplicated here to avoid drift.

### Data Model

No new persistent tables; consumes the existing `combos` table (`id, name, kind, models[]`) and `providerConnections` (credentials). Round-robin rotation state and cooldown state are both in-memory `Map`s, not persisted (see Trade-offs).

### Security Considerations
No new attack surface — combo names are validated against `/^[a-zA-Z0-9_.\-]+$/` at creation (`POST /api/combos`), preventing injection via combo name. Credentials themselves are handled entirely by the Auth/session subsystem (separate spec); this pipeline only reads/marks them.

## 6. API & Interfaces

### Public API (unchanged surface — combos are transparent to the client)
`POST /v1/chat/completions` (and Claude `/v1/messages`, Codex `/v1/responses`) with `model` set to a combo name behaves identically to a normal chat request from the client's perspective; the combo/fallback machinery is invisible except via response latency and, on total exhaustion, a `503` with `Retry-After`.

### Combo management API
```
POST /api/combos
{ "name": "my-coding-combo", "models": ["cc/claude-opus-4-6", "glm/glm-5.1"] }
```
`name` must match `/^[a-zA-Z0-9_.\-]+$/`.

### Internal APIs
- `handleComboChat({ body, models, handleSingleModel, log, comboName, comboStrategy, comboStickyLimit, tierRouting, tokenLimitRouting, modelCooldown }) -> Promise<Response>`
- `handleFusionChat({ body, models, handleSingleModel, log, comboName, judgeModel, tuning }) -> Promise<Response>`
- `getRotatedModels(models, comboName, strategy, stickyLimit) -> string[]`
- `reorderByCapabilities(models, requiredCapabilitiesSet) -> string[]`
- `detectRequiredCapabilities(body) -> Set<string>` (`"vision" | "pdf" | "audioInput" | "videoInput"`)

## 7. Metrics & Success Criteria

No dedicated metrics dashboard exists for combo behavior specifically (console logs only, tag `"COMBO"`/`"FUSION"`). Derivable from `usageHistory`/`requestDetails` if `OBSERVABILITY_ENABLED`, but not aggregated into a fallback-rate KPI today.

| Signal | Current visibility |
|---|---|
| Which model in a combo ultimately answered | `usageHistory.model` per request |
| Fallback occurred | Only in console logs (`log.info("COMBO", ...)`), not persisted |
| Fusion panel success rate | Console logs only |

## 8. Trade-Offs

| Decision | Alternative | Why chosen |
|---|---|---|
| In-memory rotation/cooldown state | Redis/shared store | No external dependency required for a single-process, single-operator gateway; state loss on restart is acceptable given short TTLs |
| Sequential (not parallel) model trials in fallback strategy | Parallel racing | Avoids paying for N simultaneous provider calls on every request; fusion strategy exists specifically for when parallel panel calls are wanted |
| Fixed reorder-stage order (token-limit → cooldown → tier → capability) | Configurable ordering | Keeps behavior predictable; capability (hard data-loss prevention) always wins last, ensuring correctness trumps cost optimization |
| No cap on accounts tried within a model | Bounded retry count | Simpler; relies on `checkFallbackError`/backoff to naturally stop retrying a genuinely broken account rather than an arbitrary attempt ceiling |

### What We're Giving Up
- No cross-instance coordination if 9Router is ever run as multiple processes/replicas (out of scope today — single-process design).
- No historical fallback-rate reporting without enabling `OBSERVABILITY_ENABLED` and building a query on top of `requestDetails`.

## 9. Alternatives Considered

Not documented in the repository as a considered-and-rejected list — no ADR/RFC files were found for this subsystem. The trade-offs in §8 are inferred from code comments (e.g., "fixes: combo falls through on transient 503" in `combo.js`), not from an explicit alternatives doc.

## 10. Implementation

Already implemented and shipped; not phased for this analysis. For future modification, the natural extension points are:
- `open-sse/services/combo.js` reorder pipeline (add a new stage between existing ones).
- `open-sse/services/accountFallback.js` `checkFallbackError`/`ERROR_RULES` (add new fallback-eligible error patterns).
- `src/sse/handlers/chat.js` (keep the two combo-detection branches — `handleChat` and `handleSingleModelChat` — in sync, per the documented pitfall).

### Testing Strategy (current)
`tests/` (separate vitest package) includes combo-routing pattern tests reachable via `npx vitest run -t "combo-routing"`. Regression baselines exist for provider/alias behavior but not specifically for combo fallback sequencing — no dedicated combo-fallback regression suite was found.

## 11. Open Questions

- [ ] Should fallback/cooldown events be persisted for a "combo health" dashboard, beyond console logs?
- [ ] Is there an intended maximum on total account attempts within a single model, to bound worst-case latency on a request whose provider has many broken accounts?
- [ ] Should model cooldown be extended to fusion combos, or is exclusion intentional long-term?

## 12. References

**Related specs:** `Technical-Spec-Model-Combo-Cooldown.md`, `Technical-Spec-Provider-Registry-Pricing.md`.
**Source files:** `src/sse/handlers/chat.js`, `open-sse/services/combo.js`, `open-sse/services/accountFallback.js`, `src/sse/services/auth.js`.
**Prior docs:** `docs/guide/06-combo-system.md`, `docs/ARCHITECTURE.md` ("Combo + Account Fallback Flow").

## 13. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | — | — | ⭕ Pending (no product owner identified in repo) |
| Engineering | — | — | ⭕ Pending |

## 14. Document History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-09-08 | 1.0 | nqdev-codebase-analyst | Initial spec, reverse-engineered from `open-sse/services/combo.js` + `src/sse/handlers/chat.js` |
