# SSE Translation & Streaming Pipeline — Technical Specification

> **Metadata**
> Date: 2026-09-08
> Author(s): Reverse-engineered from source (nqdev-codebase-analyst)
> Status: Implemented
> Last Updated: 2026-09-08
> Version: 1.0
> Related Docs: `open-sse/AGENTS.md`, `docs/guide/11-translator-system.md`, `docs/guide/10-executors.md`, `docs/guide/09-rtk-token-saver.md`

---

## 1. Overview

The core request/response pipeline inside `open-sse/handlers/chatCore.js` is what makes 9Router's "any client dialect ↔ any provider format" promise work: it resolves the model, runs a chain of fail-open token-saving hooks, detects the source format, translates the request into the target provider's shape, dispatches through a per-provider executor, and translates the streamed or JSON response back into the client's expected format — including retry-after-refresh on 401/403.

### Context
This is the engine `src/sse/handlers/chat.js` calls into once a model and credentials have been resolved (see Combo Pipeline spec for everything upstream of this point). It is provider-agnostic and knows nothing about combos, accounts, or the dashboard.

### Scope
Request lifecycle through `chatCore.js`, the pre-translate hook chain (Privacy → RTK → Headroom → Caveman → Ponytail → CMEM), the translator registry's OpenAI-pivot design, and executor dispatch.

**Out of scope:** combo/account fallback (separate spec), CMEM's own internal memory-storage design (only its injection point is covered here), provider registry/pricing (separate spec).

## 2. Motivation

### Problem Statement
- **Who has the problem?** Any client speaking one dialect (OpenAI Chat Completions, Claude Messages, Gemini, Codex Responses) that needs to reach a provider speaking a different one — and any operator whose LLM spend is inflated by verbose, repeated tool-result content in agentic sessions.
- **Pain point:** Building N×M direct converters for N client dialects and M provider formats does not scale; naively forwarding tool outputs verbatim on every turn wastes tokens.
- **Impact:** Without a pivot format, adding a new provider or client dialect requires O(N) or O(M) new converters instead of O(1); without token-saving hooks, agentic coding sessions (which repeatedly resend large diffs/grep output) cost proportionally more per turn as context grows.

### Current State
Solved via an OpenAI-pivot translator registry plus a fail-open pre-translate hook chain — both implemented and shipped.

### Why Now
N/A — documenting the existing, shipped pipeline.

## 3. Goals

1. **O(1) provider/format addition** — a new provider or client dialect should only need translators to/from OpenAI, not to/from every other format.
   - Success metric: `translator/index.js` registry pattern; **direct routes** (e.g. `claude:kiro`) exist as an explicit optimization only for fragile/lossy pairs, not as the default requirement.
2. **Never let a token-saving optimization break a request.**
   - Success metric: every hook in the chain (RTK, Headroom, Caveman, Ponytail) is documented and implemented as fail-open — any internal error returns the original body untouched, never throws.
3. **Transparent credential refresh** — a request should retry automatically after a 401/403-triggered token refresh rather than surfacing the error to the client.
   - Success metric: `chatCore.js` refresh-and-retry branch on 401/403 for refreshable providers.

### Success Criteria

| Metric | Target |
|---|---|
| New provider integration effort | 1 registry file + optional executor + optional translator pair (not a full N×M matrix) |
| Token-saving hook failure blast radius | Zero — fail-open by contract |
| 401/403 recoverable errors | Retried once after refresh, transparent to caller |

## 4. Non-Goals

- ❌ Perfect fidelity across all format pairs — the OpenAI bridge is explicitly lossy for thinking/reasoning content, non-base64 images, tool ids, `is_error`, audio, and `tool_choice:"none"` (documented, accepted trade-off, mitigated by direct routes for the worst pairs).
- ❌ Round-tripping binary/protobuf provider formats (Kiro EventStream, Cursor protobuf, CommandCode NDJSON) through the OpenAI pivot — these are handled entirely inside their own executor instead.
- ❌ CMEM's memory storage/retrieval algorithm (separate concern, only the injection hook point is in scope here).

## 5. Design

### High-Level Architecture

```
open-sse/handlers/chatCore.js :: handleChatCore(body, modelInfo, credentials, ...)
  │
  ├─ 1. services/model.js :: parseModel  → resolve provider/model
  │
  ├─ 2. PRE-TRANSLATE HOOK CHAIN (all fail-open, run in this fixed order):
  │      PrivacyEngine → RTK (rtk/index.js compressMessages) → Headroom (external
  │      /v1/compress proxy, optional) → Caveman (terse-reply system prompt inject)
  │      → Ponytail (lazy-senior-dev prompt inject) → CMEM inject (context recall)
  │
  ├─ 3. executors/index.js :: getExecutor(provider)  → DefaultExecutor | specialized
  │
  ├─ 4. translator/index.js :: translateRequest(source, target, body)
  │        source → OpenAI (pivot) → target   [unless a direct source:target route is registered]
  │
  ├─ 5. executor.execute(transformedBody, credentials)  → upstream provider API (SSE or JSON)
  │
  ├─ 6. on 401/403 (refreshable provider): refreshCredentials() → retry once
  │
  ├─ 7. translator/index.js :: translateResponse(target, source, providerChunks)
  │        → normalized back to the CLIENT's original format
  │
  └─ 8. CMEM capture (post-response, opt-in) → src/lib/usageDb.js (log usage)
```

### System Components

#### Component 1: Core Orchestrator (`open-sse/handlers/chatCore.js`)

**Responsibility:** The single entry point tying together model resolution, hooks, translation, and execution for one request. `handlers/chatCore/` sub-folder holds the streaming/non-streaming/sse-to-json variants.

#### Component 2: Translator Registry (`open-sse/translator/index.js`)

**Responsibility:** `register(from, to, reqFn, resFn)` — translators self-register as an **import side-effect**, meaning every new translator file **must** be imported in `translator/index.js` or it silently doesn't exist at runtime (a documented footgun that also causes a specific test-suite failure mode: `require(...)` is used for lazy-loading and silently no-ops under vitest/ESM unless a test file imports `./registerAll.js` first).

`translateRequest(sourceFormat, targetFormat, body)` / `translateResponse(targetFormat, sourceFormat, chunks)` — both check for a **direct route** on the exact `source:target` pair first (skipping the lossy double-hop through OpenAI) before falling back to the two-hop pivot.

**Directory shape:** `request/<from>-to-<to>.js`, `response/<from>-to-<to>.js`, `schema/` (shared enums: `ROLE`, `CLAUDE_BLOCK`, finish reasons), `concerns/` (shared parsing logic: toolCall, thinking, reasoning, image, finishReason, usage, chunk — reused across translator pairs rather than reimplemented), `formats.js` + `formats/` (per-format detection/helpers).

#### Component 3: Token-Saving Hook Chain (`open-sse/rtk/`)

All hooks run **before** translation, in this fixed order, and share one hard contract: **fail-open, never throw**.

| Hook | What it does | File |
|---|---|---|
| PrivacyEngine | (Privacy-related pre-processing; see `open-sse/` root for exact scope) | — |
| RTK | Compresses `tool_result` content in-place for OpenAI/Claude/Kiro message shapes; 21 content-aware filters (git-diff, grep, ls, tree, log, ...) selected via `autodetect.js` (sniffs first 1KB); skips `is_error`/`status:"error"` results to preserve error traces | `rtk/index.js`, `rtk/filters/`, `rtk/autodetect.js` |
| Headroom | Optional delegation to an external `/v1/compress` proxy; if the proxy is down, fails open (returns null, body untouched) | `rtk/headroom.js` |
| Caveman | Injects a system prompt forcing terse, "caveman-speak" replies — up to 65% output-token savings per the root `AGENTS.md` | `rtk/caveman.js` |
| Ponytail | Injects a "lazy senior dev" persona prompt (Lite/Full/Ultra intensity) encouraging minimal, YAGNI-first code output | `rtk/ponytail.js` |
| CMEM inject | Recalls relevant prior-session context and injects it (opt-in, disabled by default); per-target-format via `injection/formatters/{openai,claude,gemini}.js` | `packages/cmem/` |

Preprocessors in `rtk/preprocessors/` (e.g. `contentCleaner`) run ahead of the filters proper.

#### Component 4: Executor Layer (`open-sse/executors/`)

**Responsibility:** Actually perform the upstream HTTP call. `base.js` (`BaseExecutor`, override points: `getBaseUrls`/`buildHeaders`/`buildUrl`/`execute`), `default.js` (handles any standard OpenAI-compatible API — the common case, no executor file needed per-provider unless behavior diverges), and ~19-21 specialized executors for non-standard transports (`kiro`, `codex`, `cursor`, `github`, `antigravity`, `gemini-cli`, `qoder`, `qwen`, `iflow`, `azure`, `vertex`, `opencode`, `grok-web`, `perplexity-web`, `ollama-local`, `commandcode`, `xiaomi-tokenplan`, ...). `getExecutor` falls back to `DefaultExecutor` when a provider has no special-case file.

### Workflows

#### Workflow: Chat completion, format translation + streaming

```
1. Client sends OpenAI-format streaming request for a Claude-backed model
2. chatCore.js resolves provider=claude, format=claude (from providers registry)
3. Pre-translate hooks run (RTK compresses any tool_result blocks in messages, etc.)
4. translateRequest("openai", "claude", body) — no direct openai:claude route
   needed since OpenAI IS the pivot format; body is shaped to Claude's Messages API
5. executor (DefaultExecutor or a claude-specific one) POSTs to Claude's API,
   receives an SSE stream
6. translateResponse("claude", "openai", claudeChunks) — normalizes each SSE chunk
   back into OpenAI-style chat.completion.chunk objects as they arrive
7. Client receives OpenAI-format SSE chunks throughout, unaware Claude was the
   actual backend
8. On stream end: usage extracted (from final chunk or estimated), logged via
   src/lib/usageDb.js
```

#### Workflow: 401/403 refresh-and-retry

```
1. Executor call returns 401/403
2. chatCore.js checks whether the provider supports token refresh
3. refreshCredentials() (via open-sse/services/tokenRefresh.js + oauthCredentialManager.js)
4. On successful refresh: retry the SAME request once with the new token
5. On failed refresh: propagate the error upward (src/sse's account-fallback
   loop then decides whether to try a different account/model)
```

### Data Model
No new persistent entities — this pipeline is stateless per-request except for usage logging (`usageHistory`/`usageDaily`, owned by the DB layer, out of scope here) and CMEM's own tables (out of scope, see CMEM package).

### Security Considerations
RTK/Headroom mutate the request body in-place but never log or transmit raw content beyond the existing request/response flow; Headroom's external proxy call is the one place request content leaves the process boundary before reaching the actual AI provider — operators enabling it should be aware content transits an additional hop. `ENABLE_REQUEST_LOGS`/`OBSERVABILITY_ENABLED` control whether full bodies are persisted to disk/DB (sensitive, opt-in, documented as such).

## 6. API & Interfaces

### Internal API
```js
// open-sse/translator/index.js
register(fromFormat, toFormat, translateRequestFn, translateResponseFn)
translateRequest(sourceFormat, targetFormat, body) -> translatedBody
translateResponse(targetFormat, sourceFormat, providerChunksOrJson) -> clientShapedChunksOrJson

// open-sse/executors/index.js
getExecutor(providerId) -> ExecutorInstance   // DefaultExecutor if unregistered

// open-sse/rtk/index.js
compressMessages(messages, options) -> compressedMessages | null   // fail-open
```

### Public-facing surface
Every `/v1/*` and `/v1beta/*` endpoint is ultimately powered by this pipeline; from the client's perspective the only visible contract is "send format X, get format X back," regardless of the actual upstream provider's native format.

## 7. Metrics & Success Criteria

Console logging only (per-hook, per-translator debug logs gated by `DEBUG_MITM`/`ENABLE_TRANSLATOR`/similar flags). No aggregate metric exists for "translation success rate" or "hook fail-open trigger count" — a hook silently degrading (e.g., Headroom proxy down) is only visible in logs, not in a dashboard KPI.

## 8. Trade-Offs

| Decision | Alternative | Why chosen |
|---|---|---|
| OpenAI as pivot format | Direct N×M converter matrix | O(N+M) instead of O(N×M) translator files; accepted lossy-bridge cost for uncommon pairs, mitigated by direct routes for fragile ones |
| Fail-open token-saving hooks | Fail-closed (block request on hook error) | A compression bug should never be worse than "this turn wasn't compressed" — correctness of the underlying request always wins over the optimization |
| `require()`-based lazy translator loading | Static ESM imports throughout | Presumably bundler/tree-shaking related for the Next.js build; documented cost is the vitest/ESM silent-no-op footgun requiring `registerAll.js` in tests |
| Executor-level handling for binary formats (Kiro/Cursor/CommandCode) instead of forcing them through the pivot | Force everything through OpenAI JSON | Some formats are fundamentally incompatible with a JSON pivot (protobuf, EventStream) — forcing translation would lose data or require lossy re-encoding |

### What We're Giving Up
- Thinking/reasoning content, non-base64 images, tool ids, `is_error`, audio, and `tool_choice:"none"` don't survive an OpenAI-bridge hop for pairs without a direct route.
- No visibility metric for how often fail-open hooks are silently degrading (Headroom proxy down, etc.) beyond log-diving.

## 9. Alternatives Considered

Not documented as an explicit ADR in-repo. The OpenAI-pivot choice is a common, well-understood pattern for multi-format gateways (OpenAI's format being the de facto lingua franca most tools already speak) rather than a documented internal debate.

## 10. Implementation

Already implemented; 12 request translators + 10 response translators per `docs/guide/19-key-files-reference.md`, 19-21 specialized executors, 21 RTK filters. No further phased plan exists in-repo for this core pipeline itself (ongoing work is additive: new provider/format pairs as needed).

### Testing Strategy (current)
`tests/translator/` — dedicated translator test suite, includes `matrix.js` (provider-model test matrix builder) and `registerAll.js` (the required import fixing the lazy-load footgun in tests, per `tests/translator/AGENTS.md`). RTK has E2E tests gated behind `RUN_E2E=1` (`tests/unit/rtk.e2e.test.js`, `rtk.multi-provider.e2e.test.js`).

## 11. Open Questions

- [ ] Is there a plan to reduce the OpenAI-bridge's documented lossy fields (thinking, tool ids, `is_error`, audio) via more direct routes, or is the current direct-route coverage considered sufficient?
- [ ] Should a metric/dashboard surface how often fail-open hooks (RTK, Headroom) are silently no-op'ing due to internal errors, so operators can detect a broken filter rather than just losing the token-saving benefit unnoticed?
- [ ] Is the `require()`-based lazy translator loading pattern intentional long-term (bundler-specific reasoning), or a candidate for migration to static imports now that the vitest/ESM footgun is a known, documented pain point?

## 12. References

**Related specs:** `Technical-Spec-Combo-Pipeline-Fallback.md` (calls into this pipeline via `handleSingleModelChat` → `handleChatCore`), `Technical-Spec-Provider-Registry-Pricing.md` (executor/format metadata source).
**Source files:** `open-sse/handlers/chatCore.js`, `open-sse/translator/index.js`, `open-sse/rtk/index.js`, `open-sse/executors/index.js`, `open-sse/executors/base.js`.
**Prior docs:** `docs/guide/11-translator-system.md`, `docs/guide/10-executors.md`, `docs/guide/09-rtk-token-saver.md`, `open-sse/AGENTS.md`.

## 13. Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Product | — | — | ⭕ Pending |
| Engineering | — | — | ⭕ Pending |

## 14. Document History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-09-08 | 1.0 | nqdev-codebase-analyst | Initial spec, reverse-engineered from `open-sse/handlers/chatCore.js`, `open-sse/translator/`, `open-sse/rtk/`, `open-sse/executors/` |
