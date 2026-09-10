# Model Combo Cooldown — Technical Specification

> **Metadata**
> Date: 2026-09-08
> Author(s): Reverse-engineered from source (nqdev-codebase-analyst)
> Status: Implemented
> Last Updated: 2026-09-08
> Version: 1.0
> Related Docs: `docs/specs/Technical-Spec-Combo-Pipeline-Fallback.md`, `packages/AGENTS.md`, `AGENTS.md` (root) "packages/" table

---

## 1. Overview

`packages/model-combo-cooldown/` is a small, self-contained package that prevents a combo from immediately retrying a model that just failed inside that same combo. When `handleComboChat` marks a model as failed, it is skipped for a fixed TTL (default 5 minutes) on subsequent requests to *that same combo* — while remaining fully usable in any other combo, or as a direct (non-combo) target.

### Context
One of several `packages/*` "engines" that `open-sse/services/combo.js` imports via `@9router/model-combo-cooldown` — built as an isolated package specifically so it never needs to touch `open-sse/` internals directly (see root `AGENTS.md` "New features: always in packages/" hard rule).

### Scope
This spec covers the cooldown store's data model, API, TTL/expiry semantics, and its two call sites (`filterSkippedComboModels` read path, `markComboModelFailed` write path) inside the combo loop.

**Out of scope:** the combo loop itself (see Combo Pipeline spec), token-limit routing and tier-routing (sibling packages with a similar fail-open shape but different purpose).

## 2. Motivation

### Problem Statement
- **Who has the problem?** Combos with a model that fails repeatedly (e.g., mid-outage) waste retries hammering the same broken model on every subsequent request until the outage clears.
- **Pain point:** Without cooldown, a combo with `[modelA, modelB, modelC]` where `modelA` is down still tries `modelA` first on *every* request, adding latency (a failed call + its timeout) before falling through to `modelB`.
- **Impact:** Extra latency and wasted upstream calls during a provider incident, proportional to request volume during the outage window.

### Current State
Implemented — this is the shipped mitigation, not a proposed feature.

### Why Now
N/A (documenting existing code).

## 3. Goals

1. **Skip known-bad combo/model pairs** for a bounded window after a failure.
   - Success metric: a model marked failed in combo X is excluded from combo X's candidate list until TTL expiry.
2. **Scope isolation** — a failure in one combo must not penalize the same model in a different combo.
   - Success metric: cooldown key is `(comboName, modelStr)`, not `modelStr` alone.
3. **Never block a request** — cooldown must degrade safely if it would otherwise empty the candidate list.
   - Success metric: `filterSkippedComboModels` returns the original list unchanged when every candidate is cooling down.

### Success Criteria

| Metric | Target |
|---|---|
| Cooldown TTL | 5 minutes (`DEFAULT_MODEL_COOLDOWN_TTL_MS = 5 * 60 * 1000`), overridable via `modelCooldown.ttlMs` |
| Fail-open guarantee | 100% — verified by code inspection: `filterSkippedComboModels` returns `models` unchanged if `kept.length === 0` |
| Memory growth | Bounded — entries lazy-expire on read, no unbounded accumulation under normal traffic patterns (though see §11 Open Questions on cleanup of long-idle combos) |

## 4. Non-Goals

- ❌ Cross-process/persistent cooldown state (in-memory `Map`, resets on restart — accepted trade-off given the short TTL).
- ❌ Cooldown for direct (non-combo) model calls — scope is explicitly per-combo.
- ❌ Application to fusion combos (`handleFusionChat` does not call `markComboModelFailed`/`filterSkippedComboModels` — this is a documented gap, see Open Questions).
- ❌ Configurable per-model TTL (single global default, only overridable at the call level, not per model).
- ❌ Dashboard UI for cooldown state (data is exposed via `listActiveCooldowns()` but no route/page currently renders it — verify before assuming a UI exists).

## 5. Design

### High-Level Architecture

```
open-sse/services/combo.js :: handleComboChat()
  │
  ├─ read path (before trying models):
  │    filterSkippedComboModels(comboName, rotatedModels)
  │      → isComboModelSkipped(comboName, model) for each model
  │      → returns filtered list, or original if filtering would empty it
  │
  └─ write path (on fallback-eligible failure per model):
       markComboModelFailed(comboName, modelStr, ttlMs)
         → cooldowns.set(`${comboName}::${modelStr}`, Date.now() + ttlMs)
```

### System Components

#### Component 1: Cooldown Store (`packages/model-combo-cooldown/cooldownStore.js`)

**Responsibility:** Own the in-memory `Map<string, number>` (`cooldownKey -> expiresAtMs`) and all read/write/expiry operations. No I/O, no persistence, pure in-process state.

**Key functions:**
```js
markComboModelFailed(comboName, modelStr, ttlMs = DEFAULT_MODEL_COOLDOWN_TTL_MS) -> void
isComboModelSkipped(comboName, modelStr) -> boolean          // lazy-expires on read
filterSkippedComboModels(comboName, models: string[]) -> string[]   // fail-open
listActiveCooldowns() -> { comboName, model, expiresAt }[]   // for dashboard display, lazy-expires stale entries in the same pass
resetComboCooldown(comboName?) -> void                        // test/admin helper; omit comboName to clear all
```

**Key format:** `` `${comboName || "__default__"}::${modelStr}` `` — the `__default__` fallback handles the (presumably rare) case of a falsy `comboName`.

**Expiry strategy:** lazy — no background timer/interval. A read (`isComboModelSkipped`/`listActiveCooldowns`) that finds an expired entry deletes it on the spot. This means memory is only reclaimed by future reads, not proactively, but since combo requests continually re-read the same keys during normal use this is not a practical leak.

#### Component 2: Defaults (`packages/model-combo-cooldown/config/defaults.js`)

```js
export const DEFAULT_MODEL_COOLDOWN_TTL_MS = 5 * 60 * 1000; // 5 minutes
```
Single configuration constant. No environment-variable override exists — changing the default requires editing this file (or passing `modelCooldown.ttlMs` explicitly per call site).

#### Component 3: Barrel (`packages/model-combo-cooldown/index.js`)

Re-exports the public surface: `markComboModelFailed`, `isComboModelSkipped`, `filterSkippedComboModels`, `listActiveCooldowns`, `resetComboCooldown`, `DEFAULT_MODEL_COOLDOWN_TTL_MS`.

### Workflows

#### Workflow: Model fails inside a combo

```
1. handleComboChat tries modelStr for comboName via handleSingleModel(body, modelStr)
2. Call fails with a fallback-eligible error (checkFallbackError → shouldFallback=true)
   OR throws an exception
3. if (modelCooldown?.enabled) markComboModelFailed(comboName, modelStr, modelCooldown.ttlMs)
4. Loop continues to the next model in rotatedModels
```

#### Workflow: Next request to the same combo, within TTL

```
1. handleComboChat computes rotatedModels (after round-robin, before token-limit filter)
2. if (modelCooldown?.enabled):
     filtered = filterSkippedComboModels(comboName, rotatedModels)
     if filtered.length !== rotatedModels.length: log which models were skipped and why
     rotatedModels = filtered
3. The previously-failed model is absent from this request's candidate list
   → saves one guaranteed-fail round-trip
4. If EVERY model in the combo is currently cooling down: filterSkippedComboModels
   returns the ORIGINAL unfiltered list (fail-open) — the combo still attempts every
   model rather than returning an empty candidate set / hard error
```

### Data Model

No persistent schema — a single process-local `Map<string, number>`. Not part of `src/lib/db/schema.js`; explicitly excluded from the shared SQLite persistence layer by design (see Trade-offs).

### Security Considerations
None beyond what the combo pipeline itself carries — this package does not touch credentials, does not accept externally-controlled input beyond combo name/model strings already validated at combo-creation time (`/^[a-zA-Z0-9_.\-]+$/`).

## 6. API & Interfaces

### Internal API (only — no HTTP surface of its own)

```js
import { markComboModelFailed, isComboModelSkipped, filterSkippedComboModels,
         listActiveCooldowns, resetComboCooldown, DEFAULT_MODEL_COOLDOWN_TTL_MS }
  from "@9router/model-combo-cooldown";
```

Consumed exclusively from `open-sse/services/combo.js`'s `handleComboChat`, gated by the caller-supplied `modelCooldown: { enabled: true, ttlMs? }` option. Both combo branches in `src/sse/handlers/chat.js` set `modelCooldown: { enabled: true }` unconditionally (always-on, not user-configurable from the dashboard today — see Open Questions).

## 7. Metrics & Success Criteria

No dedicated metrics; visible only via:
- Console log lines: `log.info("COMBO", "cooldown: skip [...] (recent failure in combo \"...\")")`.
- `listActiveCooldowns()` is callable but not currently wired to any dashboard route (verify — not found in `src/app/api/combos*` during this analysis; flagged as an open question rather than assumed absent).

## 8. Trade-Offs

| Decision | Alternative | Why chosen |
|---|---|---|
| In-memory `Map`, no persistence | SQLite table, Redis key with TTL | Matches the short (5 min) TTL — persisting state that self-expires within minutes across a restart adds complexity for negligible benefit; consistent with `comboRotationState`'s same in-memory pattern in `combo.js` |
| Lazy expiry (on-read) | Background sweep interval | Avoids an extra timer per process; correctness doesn't depend on timely cleanup since expired entries are functionally inert until read anyway |
| Global TTL constant, not per-model | Per-model configurable TTL | Simplicity; the failure being cooled down is transient-outage-shaped in practice, where a uniform window is a reasonable default |
| Fail-open on full-cooldown | Return an error / empty list | A combo that still tries (recently-failed) models is strictly better than a combo that refuses to serve the request at all |

### What We're Giving Up
- No cross-instance cooldown sharing if 9Router ever runs multiple processes.
- No historical/analytical view of which models cool down most often (no persistence = no trend data).
- No per-dashboard-user visibility today unless `listActiveCooldowns()` is wired into a route (unconfirmed).

## 9. Alternatives Considered

Not documented as an explicit ADR. The design closely mirrors the existing `comboRotationState` pattern already in `open-sse/services/combo.js`, suggesting the team intentionally reused a proven in-memory-Map approach rather than introducing a new persistence mechanism for this feature.

## 10. Implementation

Already implemented (small, ~99-line `cooldownStore.js` plus a 1-line defaults file and a barrel). No further phased implementation plan exists in-repo. Natural extension points for future work:
- Wire `listActiveCooldowns()` into a dashboard endpoint/page for operator visibility.
- Add a `DISABLE_MODEL_COOLDOWN` / per-combo settings override if operators need to turn this off selectively (currently always-on for non-fusion combos, all-or-nothing).

### Testing Strategy (current)
`resetComboCooldown()` exists explicitly as a test helper, implying `tests/` exercises this module directly. No dedicated test file for `packages/model-combo-cooldown` was located during this pass — recommend confirming coverage exists under `tests/unit/` before relying on it as regression-tested.

## 11. Open Questions

- [ ] Is `listActiveCooldowns()` surfaced anywhere in the dashboard UI today, or is it dead code awaiting a future settings page?
- [ ] Should fusion combos also apply model cooldown, or is the exclusion intentional (panel models are meant to always be tried fresh)?
- [ ] Is a per-combo or per-model TTL override needed, or is the global 5-minute default sufficient for all observed failure patterns?
- [ ] Should cooldown state survive a server restart (e.g., via a lightweight SQLite table) given combos used in production may see outages that outlast a deploy cycle?

## 12. References

**Related specs:** `Technical-Spec-Combo-Pipeline-Fallback.md`.
**Source files:** `packages/model-combo-cooldown/index.js`, `packages/model-combo-cooldown/cooldownStore.js`, `packages/model-combo-cooldown/config/defaults.js`, `open-sse/services/combo.js` (call sites).

## 13. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | — | — | ⭕ Pending |
| Engineering | — | — | ⭕ Pending |

## 14. Document History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-09-08 | 1.0 | nqdev-codebase-analyst | Initial spec, reverse-engineered from `packages/model-combo-cooldown/*.js` |
