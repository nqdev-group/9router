# Product Requirements Document: 9Router

> **Document version:** v1.0
> **Analysis date:** 2026-09-08
> **Source:** Reverse-engineered from the codebase at `d:\nqdev-wps\github\nqdev-group\9router` — this is a **retrospective PRD** describing what the shipped system does and implies about intent, not a forward-looking spec authored before the fact. Sections requiring product ownership (budget, timeline, named stakeholders) are marked TBD rather than invented.

---

## 1. Executive Summary

9Router is a self-hosted AI routing gateway that fronts 40+ upstream AI providers behind one OpenAI-compatible endpoint. It solves provider fragmentation, account/rate-limit fragility, and LLM token cost through format translation, multi-model/multi-account fallback, and a token-saving engine pipeline — all running locally, with an optional cloud-sync layer for multi-device use. The project is an actively-maintained fork of an upstream open-source project (`master-forked`), with this fork adding its own feature packages (`packages/`) kept isolated from upstream to minimize merge conflicts. It ships as a Next.js server, an npm-published CLI launcher, and a set of agent-skill definitions for AI coding tools.

**Current business status**: active development; no public metrics on adoption/usage scale are present in the repository. See §8 for what *is* measurable from the code and §15 for risk.

## 2. Problem Statement

### Current state problems
- **Provider fragmentation**: every AI vendor (OpenAI, Anthropic, Google, GitHub Copilot, Cursor, and 35+ others) exposes a different request/response shape. A team using multiple providers must either maintain multiple SDK integrations or accept lock-in to one vendor.
- **Fragility**: a single provider account can be rate-limited, have an expired OAuth token, or suffer an outage — any of which breaks a naive integration mid-session.
- **Cost**: LLM usage, especially for agentic coding tools that re-send large tool outputs (diffs, grep results, file trees) every turn, is expensive; most of that repeated context is compressible without losing meaning.
- **Operational blindness**: without centralized usage tracking, teams don't know which provider/model/account is driving spend or which is silently failing.

### Pain points
- Developers integrating an OpenAI-only tool against a non-OpenAI-compatible model (e.g., Gemini, Claude via a different auth flow) need a translation layer.
- Teams with several provider accounts (for cost or quota reasons) need a way to spread/rotate load without hand-rolling retry logic per client.
- Coding agents burn a large fraction of their token budget on tool-result content that a compression pass could shrink with no semantic loss.

### Market context
9Router exists in the same space as commercial LLM gateways/routers (e.g., OpenRouter, LiteLLM) but is explicitly **local-first / self-hosted**, aimed at developers who want to keep credentials and routing logic on their own machine rather than trust a third-party proxy with API keys. It also has a dual identity as both a standalone dashboard product and an "agent tool" consumable by AI coding agents via published `skills/`.

### Why now
Not stated in the repository — no dated roadmap or business case document was found. The `CHANGELOG.md` shows continuous, frequent releases (e.g., v26.5.65-rc01 at time of analysis), indicating active, ongoing investment rather than a specific "why now" trigger.

## 3. Solution Overview

9Router's solution is a local gateway process with four cooperating subsystems:

1. **Translation core** (`open-sse/translator/`) — normalizes every supported client dialect (OpenAI, Claude Messages, Gemini, Codex Responses) and every supported provider format through an OpenAI-pivot intermediate representation, with direct routes for lossy pairs.
2. **Routing & resilience layer** (`src/sse/handlers/chat.js`, `open-sse/services/combo.js`, `open-sse/services/accountFallback.js`) — resolves a `provider/model` or combo name, rotates across accounts and models on failure, and supports cost-aware and capability-aware reordering.
3. **Token-saving pipeline** (`open-sse/rtk/`, `packages/cmem/`) — compresses tool-result content, optionally injects terse-response system prompts, and optionally maintains cross-session context memory — all fail-open so a bug in an optimization never breaks a request.
4. **Management dashboard** (`src/app/(dashboard)/`) — the human-facing surface for onboarding providers, defining combos, inspecting usage/cost, and configuring every engine above.

This addresses the problems in §2 directly: translation removes fragmentation, fallback removes fragility, RTK/Caveman/Ponytail/CMEM reduce cost, and the usage dashboard removes operational blindness.

## 4. Target Audience

### Primary users
Individual developers and small engineering teams self-hosting an AI gateway — typically to (a) consolidate several paid/free provider accounts behind one endpoint for cost control or quota pooling, or (b) point an OpenAI-API-only tool at a provider that doesn't natively speak that API.

### Secondary users
- **AI coding agents** (Claude Code, Codex CLI, Cursor, Cline, Continue, Roo, OpenClaw, Droid, etc.) — consuming 9Router as a backend via the published `skills/` definitions or directly via its OpenAI-compatible endpoint.
- **CLI/tray users** — people running the published `9router` npm package as a lightweight local launcher with a system tray icon, not necessarily touching the dashboard UI at all.

### User personas (inferred, not sourced from a persona doc)
- *"The multi-account power user"* — has 3-5 different provider accounts (some free-tier, some paid) and wants automatic fallback/cost-aware routing across them.
- *"The agent operator"* — runs an AI coding agent daily and cares most about token-cost reduction (RTK/Caveman/Ponytail) and reliability (combo fallback) during long agent sessions.
- *"The self-hoster"* — prioritizes not sending API keys through a third-party SaaS proxy; runs 9Router in Docker on a home server or VPS.

### Market segment
Individual developers / small teams, not enterprise (no multi-tenant user model, no SSO-as-a-service, no per-seat billing found in the codebase).

## 5. Core Features

| Feature | Description | User value | Business impact |
|---|---|---|---|
| OpenAI-compatible `/v1/*` gateway | One stable API surface for 40+ providers | Write integration code once | Removes provider lock-in |
| Format translation | OpenAI-pivot translator with direct routes | Any client works with any provider | Expands addressable provider list without per-pair custom code |
| Model combo fallback | Named model chains, 3 strategies (fallback/round-robin/fusion) | Requests survive a single model/provider being down | Reduces perceived downtime to near zero |
| Multi-account fallback | Rotate credentials per provider on failure | Quota/rate-limit exhaustion on one account doesn't stop requests | Higher effective quota ceiling per provider |
| Per-combo model cooldown | Skip a just-failed model in that combo for 5 min | Avoids repeatedly hammering a model mid-outage | Fewer wasted upstream calls, faster fallback |
| Cost/tier-aware routing | Reorder combo candidates by price or task-criticality | Cheaper models tried first for non-critical tasks | Directly reduces spend |
| Token-limit routing | Skip models whose max-input-token limit can't fit the prompt | Avoids guaranteed-fail calls | Saves a wasted round-trip + latency |
| Fusion combos | Parallel panel + judge synthesis | Higher-quality answers than any single model | Differentiator vs. simple round-robin routers |
| RTK / Headroom / Caveman / Ponytail | Token-saving engine pipeline, all fail-open | Materially lower per-session token spend for agentic tools | Core cost-reduction value proposition |
| CMEM | Opt-in cross-session context memory | Agents "remember" past sessions | Differentiator; reduces repeated context re-explanation |
| OAuth + API-key onboarding | PKCE and device-code flows for 10+ OAuth providers | Low-friction provider setup from the dashboard | Lowers time-to-value |
| Usage/cost dashboard | Per-request and daily-aggregated usage, token-saver stats | Visibility into spend and provider health | Operational trust |
| Discord provider-down alerts | Fires when every account for a provider is unavailable | Faster incident awareness | Reduces mean-time-to-notice |
| Cloud sync (opt-in) | Multi-device sync of config | Same setup across machines | Convenience for multi-machine users |
| CLI + tray launcher | npm-published `9router`, system tray | Zero-friction local start/stop | Lowers adoption barrier for non-Docker users |

## 6. MVP Definition

Since this PRD is retrospective, "MVP" is reframed as: **what would be the minimum viable subset if this system were rebuilt from scratch today, based on which features the architecture treats as core vs. optional.**

### In scope for MVP
- Single-model routing through `/v1/chat/completions` with format translation for at least OpenAI + Claude + Gemini formats.
- Provider connection management (OAuth + API key) with a basic dashboard.
- Model combo fallback (fallback strategy only — round-robin/fusion are refinements).
- Multi-account fallback with cooldown/backoff.
- SQLite persistence with the driver-fallback chain (guarantees the app runs with zero native-dependency setup via the `sql.js` WASM fallback).
- Basic usage logging.

### Out of scope for MVP (present in the shipped system as **post-MVP** additions)
- RTK/Headroom/Caveman/Ponytail token-saving engines.
- CMEM context memory.
- Fusion combos.
- Cost/tier-aware and token-limit-aware routing.
- Cloud sync.
- MITM proxy / tunnel (Cloudflare/Tailscale) for remote access.
- 9Router-as-MCP-server.
- CLI/tray launcher as a separate npm package.
- Discord alerting.

### Success criteria for MVP
Not documented — inferred only: a client can send one OpenAI-format chat request through 9Router and get a correctly-translated response from at least 2-3 different providers, with a working fallback on simulated failure.

## 7. Post-MVP Features (already shipped, in likely build order based on `packages/` and `CHANGELOG.md` evidence)

1. Multi-provider format translation expansion (Kiro, Cursor, Antigravity, CommandCode, protobuf/EventStream binary formats).
2. Model combo system (fallback → round-robin → fusion, in that apparent sophistication order).
3. RTK token-compression engine (21 filters) → Headroom external proxy → Caveman → Ponytail (successive token-saving layers).
4. Cost/tier-aware routing and token-limit routing (both explicitly built as `packages/` add-ons after the core combo loop, per `open-sse/services/combo.js` comments referencing "Phase 5 of input-tokens-optimization.md").
5. Per-combo model cooldown (isolated `packages/model-combo-cooldown/`, most recent of the routing refinements based on its narrow, well-isolated scope).
6. CMEM context memory engine.
7. Cloud sync.
8. MCP server exposure (explicitly incomplete — media/web/usage/health tools pending).
9. CLI/tray launcher as a separately-versioned npm package.

## 8. Success Metrics & KPIs

No KPI targets are defined in the repository. What the system *can* measure (via `usageRepo.js` / `/api/usage/*`) but does not set targets for:

| Measurable signal | Where it's captured |
|---|---|
| Requests per provider/model/day | `usageDaily` table |
| Prompt/completion token counts per request | `usageHistory` table |
| Token-saver savings (RTK/Caveman) | `token-saver-report` component, `usageRepo.js` stats functions |
| Account/provider failure rate | `providerConnections.data.lastError`, `testStatus` |
| Provider-down incident count | Discord alert firing (`provider-alert` state), not persisted as a metric series |

**Recommendation (not currently implemented):** if KPIs are to be formalized, natural candidates are token-cost-saved %, combo fallback success rate, and account-failure mean-time-to-recovery — all derivable from existing tables without new instrumentation.

## 9. User Stories & Acceptance Criteria

| # | Story | Acceptance criteria |
|---|---|---|
| US-01 | As a developer, I want to send an OpenAI-format request and have it answered by a Claude account I've connected, so I can use one client SDK for both. | `POST /v1/chat/completions` with `model: "claude/..."` returns a valid OpenAI-shaped response (streaming and non-streaming) when only a Claude OAuth connection exists. |
| US-02 | As a developer, I want a request to automatically retry on a different account when my primary account is rate-limited, so my session doesn't fail. | Simulated 429 on account A causes automatic retry on account B for the same provider, transparent to the client, within the same HTTP request. |
| US-03 | As a developer, I want to define a combo of 3 models so that if my preferred model is down, cheaper/alternate models answer instead. | `POST /api/combos` creates a combo; a chat request using that combo name falls through models in order on failure; a model that fails is skipped for 5 minutes in that combo on the next call. |
| US-04 | As an operator, I want a Discord message when a provider goes fully down, so I notice before users complain. | When every connection for a provider is unavailable, a Discord embed is sent (once, debounced) via the configured webhook. |
| US-05 | As an agent-tool user, I want repeated large tool outputs (git diffs, grep results) to be compressed automatically, so my session costs less without me doing anything. | RTK compresses `tool_result` content in supported shapes (OpenAI/Claude/Kiro) before translation, without altering assistant-visible meaning; failure to compress never blocks the request (fail-open). |
| US-06 | As a dashboard user, I want to see today's spend by provider/model, so I can catch a cost spike early. | `/dashboard/usage` renders per-provider/model token and cost charts sourced from `usageDaily`. |
| US-07 | As an operator, I want the app to run even without native build tools installed, so setup isn't blocked by a missing compiler. | `better-sqlite3` is optional; if unavailable, the app falls back to `sql.js` (WASM) automatically with no manual configuration. |

### Edge cases explicitly handled in code
- All combo models cooling down simultaneously → cooldown filter fails open (returns full list) rather than emptying the candidate pool.
- Fusion combo where every panel model fails → 503 rather than a malformed synthesis.
- Fusion combo where exactly one panel model succeeds → answer returned directly, no judge call (nothing to fuse).
- A combo name arriving inside `handleSingleModelChat` (double-detection path) is still correctly re-resolved as a combo.

## 10. Technical Requirements

- **Technology choices**: Next.js 16 (App Router) + React 19, Node.js or Bun runtime, SQLite (no external DB service required), no message broker (see Business-Document §9.1).
- **Performance**: no formal SLOs documented; fusion combos cap wall-clock exposure via a hard 90s timeout with an 8s straggler-grace window after quorum.
- **Security requirements**: JWT-signed dashboard session, bcrypt password hashing, HMAC-signed API keys, centralized route-level auth gating (`dashboardGuard.js`), secrets never logged to git (env-var driven), optional `AUTH_COOKIE_SECURE`/`REQUIRE_API_KEY` hardening flags for internet-exposed deployments.
- **Scalability targets**: not documented. Architecturally the system is single-process/single-instance (in-memory cooldown/rotation state, SQLite as the store) — horizontal scaling would require externalizing that state, which is not currently implemented.
- **Integration requirements**: must remain wire-compatible with OpenAI Chat Completions, Claude Messages, Gemini, and OpenAI Responses (Codex) client dialects, and with each of the 40+ upstream provider APIs' own formats — a moving target as providers change their APIs (mitigated by the translator's modular per-pair registration).

## 11. Constraints & Dependencies

### Technical constraints
- Upstream fork sync: `src/` and `open-sse/` can be touched by a future upstream merge at any time, so all new logic must live in `packages/` and be consumed via `@9router/*` imports — a hard architectural rule (`AGENTS.md`), not a suggestion.
- `open-sse/providers/registry/index.js` is auto-generated/upstream-owned; new (non-upstream) providers must go through `packages/providers/registry/` instead.
- SQLite driver availability varies by runtime (Bun vs. Node version vs. native build tools) — the 4-tier fallback chain exists specifically to guarantee the app never fails to start due to a missing driver.

### Business constraints
Not documented (no budget/headcount data in the repository).

### Resource constraints
Not documented — commit history (`git log`) shows a small, active contributor set but headcount/allocation isn't in-repo data.

### External dependencies
- Availability and API stability of 40+ third-party AI providers (outside 9Router's control).
- Optional cloud-sync backend (`https://9router.com`) — its implementation is out of scope for this repo.
- npm registry (for CLI package publishing), Docker Hub / GHCR (for image publishing).

### Risk factors
See §15.

## 12. Team & Roles

Not documented in the repository — no CODEOWNERS, no team roster, no named product owner. Git history shows commits under multiple contributor identities plus automated release/changelog commits; this is consistent with a small active team but specific roles/responsibilities are TBD (project-stakeholder input needed).

## 13. Timeline & Milestones

Not documented as a forward plan. Retrospectively, `CHANGELOG.md` shows a continuous stream of dated releases (frequent patch/RC versions, e.g. `v26.5.65-rc01` at analysis time), indicating an ongoing rolling-release cadence rather than milestone-based planning. No public roadmap document was found in the repository.

## 14. Budget Considerations

Not documented — self-hosted, open-source-style project; no billing/monetization code was found (no Stripe/payment integration, no per-seat licensing check). Operating cost for a self-hoster is primarily their own upstream AI provider usage, which 9Router's token-saving features are explicitly designed to reduce.

## 15. Risks & Mitigation Strategies

| Risk | Likelihood | Impact | Mitigation present in code | Residual concern |
|---|---|---|---|---|
| Upstream merge conflicts overwrite local customizations | Medium-High (frequent syncs per `AGENTS.md`) | Medium | Hard rule: new logic isolated in `packages/`, never inline in `src/`/`open-sse/`; `.orig` files flag known hotspots (`chat.js`, `auth.js`) | Discipline-dependent; a rule violation reintroduces the risk |
| Default `INITIAL_PASSWORD=123456` left unchanged in a production/internet-exposed deploy | Medium | High (full dashboard takeover) | Documented requirement to override; not technically enforced (no startup warning found for default password in production) | No automated guard-rail — purely documentation-based |
| SQLite as single source of truth, single-process | Low (by design, not a bug) | Medium (no horizontal scale-out) | `sql.js` WASM guarantees the app *starts*; backups + pruning exist | No built-in HA/replication story |
| In-memory cooldown/rotation state lost on restart | Low | Low | Explicitly accepted trade-off given the short (5 min) TTL | None needed at current scale |
| Token-saving engines (RTK/Caveman/etc.) corrupting a request | Low | Medium (could break agent sessions) | All engines documented and implemented as fail-open — any internal error returns the original body untouched | Fail-open is a mitigation, not a guarantee of *correct* compression, only *safe* failure |
| Fusion combo panel cost (N parallel model calls per request) | Medium | Medium (spend) | Bounded panel size configured per combo; quorum-grace avoids waiting for every straggler | No documented per-request cost cap or user-facing cost estimate before firing a fusion combo |
| Test suite not fully green on checkout (~64 known failures) | Certain (documented baseline) | Low-Medium | `known-fails.txt` baseline tracking so regressions are distinguishable from pre-existing failures | Windows tooling for this check is itself broken (path-matching bug), raising the bar for verifying "no new regression" locally on Windows |
| No inbound rate limiting on `/v1/*` | Unknown | Medium-High if internet-exposed without `REQUIRE_API_KEY` | `REQUIRE_API_KEY` flag exists as an opt-in gate | No rate limiting even *with* the key enabled — a leaked key has no throttle |

### Assumptions
- The project will continue syncing with its upstream fork indefinitely (not a one-time fork-and-diverge).
- Self-hosted, single-operator deployment remains the primary use case (no evidence of a hosted-SaaS pivot in the codebase).

## 16. Glossary

See Business-Document.md §9.2 for the full technical glossary (Combo, Account fallback, Model cooldown, Fusion combo, RTK, Headroom, Caveman, Ponytail, CMEM, Executor, Translator, Provider node, DATA_DIR) — not duplicated here to avoid drift between the two documents.

**Business/product terms used above:**

| Term | Definition |
|---|---|
| Self-hosted | Run entirely on infrastructure the operator controls, as opposed to a third-party SaaS |
| Fork sync | The process of merging an actively-developed upstream open-source project's changes into this repository's `master-forked` branch |
| Retrospective PRD | A PRD written by analyzing an already-built system, rather than authored before implementation began |
