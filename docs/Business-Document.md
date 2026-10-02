# Business Documentation: 9Router

> **Document version:** v2.0
> **Analysis date:** 2026-09-08
> **Source:** Full-repo analysis of `d:\nqdev-wps\github\nqdev-group\9router` (branch `opcode/quyit-02`, fork of an upstream project synced into `master-forked`)
> **Tech stack:** Node.js / Next.js 16 (App Router) monorepo, SQLite persistence, no external message broker
> **Prior art reused:** This document consolidates and supersedes the previous 42-line `docs/Business-Document.md` stub, `docs/ARCHITECTURE.md` (563 lines, mermaid diagrams), `docs/guide/*.md` (19 hand-written technical guides), and every `AGENTS.md` in the tree — those remain the canonical low-level technical references; this document is the business-facing synthesis.

---

## 1. System Overview

### 1.1 What 9Router is

**9Router** (`9router-app`) is a **local, self-hosted AI routing gateway with a Next.js dashboard**. It exposes a single OpenAI-compatible endpoint family (`/v1/*`, `/v1beta/*`) and routes every request across **40+ upstream AI providers** (OpenAI, Anthropic, Gemini, GLM, Kimi, Qwen, GitHub Copilot, Cursor, Antigravity, Kiro, Ollama, and many OpenAI/Anthropic-compatible endpoints), handling:

- **Format translation** between client dialects (OpenAI Chat Completions, Claude Messages, Gemini, Codex Responses API) and provider-native formats.
- **Model-combo fallback** — a named sequence of models tried in order (or round-robin) until one succeeds.
- **Multi-account fallback** — multiple credentials per provider, automatically rotated on rate-limit/auth/outage errors.
- **OAuth + API-key credential management**, including token refresh (proactive and reactive).
- **Token/quota usage tracking** and cost accounting.
- **Token-saving engines** (RTK, Headroom, Caveman, Ponytail, CMEM) that reduce LLM spend before a request ever reaches a provider.
- **Optional cloud sync** for multi-device state.

### 1.2 Three published artifacts

| Artifact | What it is | Where |
|---|---|---|
| Dashboard + gateway | The Next.js server doing the actual routing; root `package.json` (`9router-app`) | repo root, `src/`, `open-sse/` |
| CLI launcher | Installs/starts the server, manages a system tray icon; published to npm as `9router` | `cli/` (own `package.json`, own version) |
| Agent skills | Drop-in `SKILL.md` files (chat, image, video, tts, stt, embeddings, web-fetch, web-search, kiraai-*) so external AI agents (Claude, Cursor, ChatGPT) can consume 9Router as a tool | `skills/`, distributed via raw GitHub links |

### 1.3 Key features

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | OpenAI-compatible gateway | Single `/v1/*` surface fronting 40+ providers | ✅ Active |
| 2 | Format translation pipeline | OpenAI-pivot translator: `source → OpenAI → target`, with direct routes for lossy pairs | ✅ Active |
| 3 | Model combo fallback | Named model chains with fallback/round-robin/fusion strategies | ✅ Active |
| 4 | Multi-account fallback | Per-provider credential rotation with cooldown/backoff | ✅ Active |
| 5 | Per-combo model cooldown | Skip a model that just failed inside a specific combo for 5 min | ✅ Active |
| 6 | Cost/tier-aware routing | Reorder combo models by price or task-criticality | ✅ Active |
| 7 | Token-limit routing | Skip combo models whose configured max-input-token limit can't fit the prompt | ✅ Active |
| 8 | Fusion combos | Fan a prompt to a panel of models in parallel, a judge model synthesizes one answer | ✅ Active |
| 9 | Token-saving engines (RTK/Headroom/Caveman/Ponytail) | Compress tool results, inject terse-response prompts, fail-open | ✅ Active |
| 10 | CMEM (context memory) | Long-term context memory engine, opt-in | ✅ Active (disabled by default) |
| 11 | OAuth device-code + PKCE flows | Onboarding for 10+ OAuth providers | ✅ Active |
| 12 | Usage/cost dashboard | Request logging, daily aggregation, token-saver stats | ✅ Active |
| 13 | Discord provider-down alerts | Notifies when every account for a provider is unavailable | ✅ Active |
| 14 | Cloud sync | Optional multi-device sync of providers/aliases/combos/keys | ✅ Active (opt-in) |
| 15 | MITM proxy / tunnel | Local MITM interception + Cloudflare/Tailscale tunnel for remote access | ✅ Active |
| 16 | 9Router-as-MCP-server | Exposes 9Router capabilities as MCP tools over Streamable HTTP at `/v1/mcp` | 🚧 Partial (media/web/usage/health tools not yet implemented) |

### 1.4 Target users

- **Primary**: developers/teams self-hosting a gateway to consolidate multiple AI provider accounts/keys behind one stable endpoint, for cost control, redundancy, or to point OpenAI-only tools at non-OpenAI providers.
- **Secondary**: AI coding agents (Claude Code, Codex CLI, Cursor, Cline, Continue, Roo, etc.) consuming 9Router as a drop-in OpenAI-compatible backend, and CLI users running `9router` as a local launcher/tray app.

### 1.5 Success metrics

No KPIs, adoption targets, or budget figures are defined anywhere in the codebase or docs. See §9.2 Open Questions.

### 1.6 Dependencies

**External services (used only if the corresponding provider is configured):** the 40+ AI provider APIs themselves (OpenAI, Anthropic, Google, etc.), an optional cloud-sync endpoint (`CLOUD_URL`, default `https://9router.com`), an optional Discord webhook for provider-down alerts, an optional Cloudflare tunnel worker for remote dashboard access.

**No message broker / job queue is used anywhere in this repo** — see §9.1 Appendix for the explicit negative-detection result.

---

## 2. Technical Architecture

### 2.1 Technology stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Language | JavaScript (ESM), no TypeScript in the app itself | — | `typescript` is a devDependency only (editor/IDE support); source is `.js`/`.jsx` |
| Framework | Next.js (App Router) | `^16.1.6` | React 19.2.4, standalone output |
| Runtime | Node.js or Bun | — | Dual-runtime support throughout (`dev:bun`, `start:bun`) |
| Database | SQLite | — | 4-tier driver chain, see §2.4 |
| State (client) | Zustand | `^5.0.10` | `src/store/` — provider/settings/theme/user/notification/header-search stores |
| UI | React 19 + Tailwind CSS 4 + Monaco Editor + Recharts + @xyflow/react | — | Dashboard-only |
| Auth | JWT (cookie) + bcrypt + API keys (HMAC) | — | No third-party auth provider required; OIDC/SAML supported |
| Message queue | **None** | — | See §9.1 |
| Cache | In-memory only (LRU response cache, in-process cooldown maps) | — | No Redis/Memcached |
| Deploy | Docker (`decolua/9router`, `ghcr.io/decolua/9router`), or bare `node custom-server.js` | — | `Dockerfile`, `docker-compose.yml` |
| CI | GitHub Actions (`.github/workflows/docker-publish.yml`), Dependabot | — | |

### 2.2 Overall architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                       CLIENTS                                     │
│  Claude Code / Codex CLI / Cursor / Cline / Continue / Roo /       │
│  any OpenAI-compatible SDK          Browser (Dashboard UI)         │
└──────────────┬───────────────────────────────┬────────────────────┘
               │ HTTPS /v1/*, /v1beta/*         │ HTTPS /dashboard, /api/*
               ▼                                ▼
┌───────────────────────────────────────────────────────────────────┐
│                  9Router — Next.js server (custom-server.js)      │
│                                                                     │
│  src/app/api/v1/* (thin routes) ──▶ src/sse/handlers/chat.js       │
│    (combo resolution, account fallback loop)                       │
│         │                                                          │
│         ▼                                                          │
│  open-sse/handlers/chatCore.js                                     │
│    (pre-hooks: Privacy → RTK → Headroom → Caveman → Ponytail →     │
│     CMEM inject) → format detect → translate → dispatch            │
│         │                                                          │
│         ▼                                                          │
│  open-sse/executors/[provider].js ──▶ upstream provider API        │
│         │                                                          │
│         ▼                                                          │
│  open-sse/translator/response/*.js (normalize back to client fmt)  │
│         │                                                          │
│         ▼                                                          │
│  src/lib/usageDb.js (log usage) ──▶ SQLite (data.sqlite)            │
│                                                                     │
│  src/app/(dashboard)/dashboard/* ──▶ src/app/api/* (CRUD)          │
│    Providers, Combos, Keys, Settings, Usage, RTK config, CMEM UI   │
└───────────────────────────────────────────────────────────────────┘
               │
               ▼ (optional)
        Cloud sync endpoint, Discord webhook, Cloudflare/Tailscale tunnel
```

### 2.3 Folder structure

```
9router/
├── src/                      ← Next.js app (App Router)
│   ├── app/api/               ← All HTTP routes (v1 compat, dashboard CRUD, OAuth, CLI tools) — thin routes only
│   ├── app/(dashboard)/       ← React dashboard pages
│   ├── sse/                   ← Bridges Next.js routes to open-sse (chat.js = combo + account fallback loop)
│   ├── lib/                   ← Infra glue: DB driver/repos, auth, tunnel, mitm, oauth utils
│   ├── shared/                ← Shared React components/hooks/constants/services
│   ├── store/                 ← Zustand stores
│   └── dashboardGuard.js      ← Centralized auth middleware
├── open-sse/                  ← Standalone, provider-agnostic SSE engine (its own AGENTS.md)
│   ├── providers/, executors/, translator/, rtk/, services/, handlers/, config/
├── packages/                  ← ALL new feature engines/UI, imported via @9router/* — hard rule, see §5's Business Rules
│   ├── cmem/, components/, validation/, providers/, provider-alert/, services/,
│   │   tier-routing/, token-limit-routing/, model-combo-cooldown/, mcpServer/, utils/, revidapi/
├── cli/                       ← Standalone npm CLI package (`9router` on npm)
├── skills/                    ← Published agent-skill definitions (product artifact)
├── tests/                     ← Separate vitest package (own package.json)
├── gitbook/                   ← Public documentation site (Next.js, en/es/... locales)
└── docs/                      ← This documentation set
```

### 2.4 Persistence

SQLite at `${DATA_DIR}/db/data.sqlite` (`DATA_DIR` defaults to `~/.9router` on POSIX, `%APPDATA%/9router` on Windows). Driver selection is a **fallback chain**, first available wins: `bun:sqlite` (Bun runtime) → `better-sqlite3` (optional native dependency) → `node:sqlite` (Node ≥22.5) → `sql.js` (pure-WASM, guaranteed fallback, debounced disk flush). All access goes through `getAdapter()`; 12 repo files in `src/lib/db/repos/` own one table/domain each (`usageRepo.js` is the largest, 820+ lines).

---

## 3. Domain Model

### 3.1 Core entities

> Source: `src/lib/db/schema.js`, `src/lib/db/AGENTS.md`

| Entity | Table | Key fields | Description |
|---|---|---|---|
| **Settings** | `settings` (1 row, id=1) | `cloudEnabled`, `comboStrategy`, `stickyRoundRobinLimit`, `requireLogin`, `password_hash`, `providerAlertState`, ... | Single global settings blob, deep-merged with defaults |
| **ProviderConnection** | `providerConnections` | `id`, `provider`, `authType` (oauth/apikey), `name`, `email`, `priority`, `isActive`, `data` (accessToken/refreshToken/expiresAt/apiKey/testStatus/lastError/rateLimitedUntil) | One credential/account for one provider; the unit multi-account fallback rotates over |
| **ProviderNode** | `providerNodes` | `id`, `type`, `name`, `data` (baseUrl, apiType/prefix) | User-defined OpenAI-compatible / Anthropic-compatible custom endpoint |
| **ProxyPool** | `proxyPools` | `id`, `isActive`, `testStatus`, `data` | Outbound proxy configuration for upstream calls |
| **ApiKey** | `apiKeys` | `id`, `key` (unique), `name`, `machineId`, `isActive` | Bearer key a client presents to 9Router itself (distinct from provider credentials) |
| **Combo** | `combos` | `id`, `name` (unique, `^[a-zA-Z0-9_.\-]+$`), `kind`, `models` (JSON array) | Named fallback/round-robin/fusion model chain |
| **kv (generic)** | `kv` (scope, key) | — | Backing store for model aliases, custom models, mitm alias mapping, pricing overrides, models.dev cache, per-provider disabled model lists, per-model token-limit overrides |
| **UsageHistory / UsageDaily** | `usageHistory`, `usageDaily` | provider, model, prompt/completion tokens, connectionId, timestamp | Per-request and daily-aggregated usage/cost |
| **RequestDetails** | `requestDetails` | full request/response (sanitized) | Debug-level request/response log, opt-in via `OBSERVABILITY_ENABLED` |
| **CMEM tables** | `cmem_observations`, `cmem_sessions`, `cmem_context_cache` (+ FTS5) | — | Context-memory engine storage; created lazily, not in the shared migration chain |

### 3.2 Relationships

```
Settings (1) ──controls──> ProviderConnection (N)
ProviderNode (1) ──backs (as compatible provider)──> ProviderConnection (N)
ProviderConnection (1) ──emits──> UsageHistory (N)
Combo (1) ──references (by string, not FK)──> "provider/model" strings (N)
ApiKey (N) ──authenticates──> inbound /v1/* requests
```

There are no traditional foreign-key relationships between most tables — 9Router deliberately keeps most non-structured data in a single `data TEXT` JSON column per row (see §7.4 "Configuration & Deployment" pattern), and combos reference models by plain string (`"provider/model"`), not by a normalized FK to a providers table.

### 3.3 Key enums / status fields

**ProviderConnection.authType**: `oauth` | `apikey`
**ProviderConnection.data.testStatus**: provider-connection health, e.g. `active` / error states surfaced from the last test
**Combo strategy** (`settings.comboStrategy`, overridable per-combo): `fallback` (try in order) | `round-robin` (rotate with sticky limit) | `fusion` (parallel panel + judge synthesis)
**tierRouting.mode**: `cheapest-first` | `task-aware`
**Account selection strategy** (`src/sse/services/auth.js`): `fill-first` (priority order, default) | `round-robin` (with sticky limit)

---

## 4. Actors & Permissions

### 4.1 Actors

| Actor | Description | Auth mechanism |
|-------|-------------|-----------------|
| **Dashboard user** | Human operator managing providers/combos/settings/usage through the web UI | JWT cookie (`src/dashboardGuard.js`), bcrypt password (`INITIAL_PASSWORD` default `123456`, must be overridden in production), optional OIDC/SAML |
| **API client** | Any OpenAI/Claude/Gemini/Codex-compatible client calling `/v1/*` or `/v1beta/*` | Optional Bearer API key (`REQUIRE_API_KEY=true` to enforce); otherwise open on `/v1/*` |
| **CLI process** | The published `9router` npm CLI, launching/managing the local server and tray icon | CLI token / local-request bypass |
| **System (background)** | Proactive token-refresh interval, cloud-sync scheduler, WAL checkpoint timers, provider-alert debounce | Internal, no external auth |
| **Upstream AI provider** | The 40+ external AI APIs 9Router calls out to | 9Router authenticates *to* them (OAuth token or API key stored in `providerConnections`) |

There is **no multi-tenant user model** — 9Router is a single-operator local gateway; "users" in the domain sense are provider accounts/connections, not application end-users with individual permissions.

### 4.2 Access control matrix (route prefixes)

| Resource / path prefix | Public | JWT/CLI-token protected | Local-only (loopback + auth) |
|---|:---:|:---:|:---:|
| `/api/health`, `/api/init`, `/api/locale`, `/api/auth/login\|logout\|status\|oidc\|saml` | ✅ | | |
| `/v1/*`, `/v1beta/*` | ✅ (own key check inside handler) | | |
| `/api/settings/*`, `/api/keys/*`, `/api/providers/*`, `/api/combos/*`, `/api/oauth/*`, `/api/usage/*`, `/api/media-providers/*`, `/api/pricing`, `/api/tags`, `/api/cli-tools/*` (most), `/api/translator/*` | | ✅ | |
| `/api/shutdown`, `/api/version/shutdown\|update`, `/api/oauth/cursor\|kiro/auto-import` | | ✅ (always, regardless of `requireLogin`) | |
| `/api/cli-tools/cowork-settings`, `/api/cli-tools/antigravity-mitm`, `/api/mcp/*`, `/api/tunnel/tailscale-*`, `/api/oauth/*/auto-import`, `/api/auth/reset-password`, `/api/headroom/start\|stop\|proxy` | | | ✅ |
| Any other `/api/*` not listed | | ✅ (deny-by-default) | |

Auth is enforced **centrally** in `src/dashboardGuard.js`, not per-route — individual route handlers assume the guard already ran.

---

## 5. Business Workflows

| # | Workflow | Actor | Trigger | Result |
|---|---|---|---|---|
| WF-01 | Chat completion via single model | API client | `POST /v1/chat/completions` with a `provider/model` string | Streamed/JSON response from the resolved provider, usage logged |
| WF-02 | Chat completion via combo (fallback) | API client | Same endpoint, `model` = a combo name | First working model in the chain answers; failed models are cooled down for 5 min in that combo |
| WF-03 | Chat completion via combo (fusion) | API client | Combo with `fusion` strategy | Panel of models answer in parallel; a judge model synthesizes one final answer |
| WF-04 | Account fallback within one model | System (internal to WF-01/02) | A provider call fails with a fallback-eligible error | Next credential/account for that provider is tried; account is cooled down/backed off |
| WF-05 | Provider onboarding (OAuth) | Dashboard user | Start OAuth flow (PKCE or device-code) from the dashboard | New `providerConnections` row with tokens; usable immediately for routing |
| WF-06 | Provider onboarding (API key) | Dashboard user | Paste API key in dashboard | New `providerConnections` row (authType=apikey) |
| WF-07 | Token refresh | System | Proactive (5-min interval, <30-min-to-expiry) or reactive (401/403 during a request) | Access token refreshed and persisted; request retried once |
| WF-08 | Combo creation/management | Dashboard user | `POST/PUT/DELETE /api/combos` | New/updated fallback chain, name validated against `/^[a-zA-Z0-9_.\-]+$/` |
| WF-09 | Provider-down alerting | System | Every connection for a provider becomes unavailable | Discord embed sent (if `providerAlertEnabled`), debounced by `providerAlertCooldown`; recovery message sent symmetrically |
| WF-10 | Cloud sync enable/sync/disable | Dashboard user | Toggle in dashboard settings | Providers/aliases/combos/keys pushed to/pulled from `CLOUD_URL`; local `newer wins` merge on sync |
| WF-11 | Dashboard login | Dashboard user | `POST /api/auth/login` with password | JWT cookie issued; `INITIAL_PASSWORD` used until a password is set |
| WF-12 | Usage inspection | Dashboard user | Visit `/dashboard/usage` | Aggregated + per-request usage/cost charts from `usageRepo.js` |
| WF-13 | RTK / token-saver configuration | Dashboard user | `/dashboard/token-saver` UI | Adjusts compression filters/intensity for the RTK engine; persisted in `settings` |
| WF-14 | 9Router-as-MCP-server tool call | External MCP client | Calls a tool at `/v1/mcp` | Proxies into the same `src/sse/handlers/*.js` functions the REST API uses (never bypasses combo/fallback) |

### WF-02 detail: Combo chat with fallback

**Source code:** `src/sse/handlers/chat.js` (`handleChat`, `handleSingleModelChat`), `open-sse/services/combo.js` (`handleComboChat`)

**Pre-conditions:** the model string resolves to a registered combo name; at least one model in the combo has an active credential.

**Happy path:**
```
1. Client POSTs /v1/chat/completions with model = "<combo-name>"
2. handleChat() detects a combo (getComboModels) and picks a strategy
   (per-combo override → settings.comboStrategy → "fallback")
3. augmentModelsWithCapacityAdapter may insert extra models if the
   request needs a capability (vision/pdf/audio) the target lacks
4. handleComboChat() applies, in order:
   a. round-robin rotation (if strategy=round-robin)
   b. token-limit bypass (drop models that can't fit the prompt)
   c. cooldown filter (skip models that failed in THIS combo <5 min ago)
   d. cost/tier-aware reorder (if tierRouting enabled)
   e. capability auto-switch (float vision/pdf-capable models to front)
5. For each candidate model in order:
   a. handleSingleModelChat() resolves provider/model, then loops over
      that provider's credentials (account fallback, WF-04)
   b. Success (2xx) → return response immediately
   c. Fallback-eligible failure → markComboModelFailed (5-min cooldown
      for this combo+model pair), try next model
   d. Non-fallback-eligible failure → return the error as-is, stop
6. All models exhausted → 503 with Retry-After (or the last error)
```

**Business rules:**
- Cooldown scope is `(comboName, modelStr)` — the same model can still be used normally in a *different* combo that hasn't seen the failure.
- Cooldown is **fail-open**: if every model in a combo is cooling down, the filter returns the full list unchanged rather than emptying the candidate pool.
- Cooldown state is **in-memory only** (a `Map`), resets on server restart — acceptable given the 5-minute TTL.
- Combo detection runs **twice** (once in `handleChat`, again inside `handleSingleModelChat` when `modelInfo.provider` is null) — a known duplication the team tracks in `src/sse/AGENTS.md`.
- Transient errors (502/503/504) with a short cooldown (≤5s) get a brief `await` before falling through, giving a momentarily-overloaded provider a chance to recover instead of being skipped outright.
- Model cooldown is **not applied to fusion combos**.

### WF-03 detail: Fusion combo

**Source code:** `open-sse/services/combo.js` (`handleFusionChat`)

1. Prompt is fanned out to every panel model in parallel, forced **non-streaming**, tools stripped and flattened into prose (`flattenToolHistory`) so panel models don't loop on tool calls.
2. Responses are collected with **quorum-grace**: once `minPanel` (default 2, capped by panel size) succeed, a short grace window (`stragglerGraceMs`, default 8s) lets stragglers catch up; a hard timeout (`panelHardTimeoutMs`, default 90s) caps total wait.
3. Degrades gracefully: 0 answers → 503; exactly 1 answer → returned directly, no fusion.
4. A **judge model** (falls back to `panel[0]` if unset) receives all anonymized panel answers ("Source 1", "Source 2", ...) and is instructed to analyze consensus/contradictions/blind-spots, then write one authoritative answer — never mentioning that multiple models were consulted. The judge call preserves the client's original stream flag, so streaming still works for the final answer.

---

## 6. API & Integrations

### 6.1 API overview

**Base surface:** `http://<host>:<port>/v1/*` (OpenAI-compatible), `/v1beta/*` (Gemini-compatible), `/codex/*` (rewritten to `/api/v1/responses`). Default dev port 20127, commonly run on 20128.
**Auth:** Bearer API key (optional, `REQUIRE_API_KEY=true`) for `/v1/*`; JWT cookie for the dashboard/management API.
**Content-Type:** `application/json`; chat completions stream via SSE when `stream: true`.

### 6.2 Endpoint groups

> Source: `src/app/api/AGENTS.md`, `docs/ARCHITECTURE.md`

| Group | Examples | Auth |
|---|---|---|
| LLM compat (`v1/`, `v1beta/`) | `chat/completions`, `messages` (Claude), `responses` (Codex), `models[/[kind]]`, `embeddings`, `images`, `audio`, `videos`, `search`, `web` | Public prefix; optional API key check inside handler |
| Dashboard CRUD | `combos`, `keys`, `providers`, `provider-nodes`, `proxy-pools`, `models`, `models-dev`, `model-token-limits`, `media-providers`, `settings`, `usage`, `pricing`, `tags` | JWT/CLI token |
| Auth | `auth/login|logout|status|reset-password|oidc|saml` | Mostly public (login is how you get a session) |
| OAuth | `oauth/[provider]/[action]` (generic device-code + PKCE dispatcher) + provider-specific dirs (`codex`, `cursor`, `gitlab`, `iflow`, `kiro`) | JWT/CLI token (auto-import routes: local-only) |
| CLI tool config writers | `cli-tools/*` — reads/writes local CLI config files (Claude Code, Codex, Cline, Copilot, Droid, Kilo, Opencode, ...) | JWT/CLI token (some local-only) |
| Sidecar process control | `headroom/*`, `pxpipe/*`, `tunnel/*` (start/stop/restart/status) | JWT/CLI token (some local-only) |
| MCP | `mcp/[plugin]/*` (9Router-as-MCP-client, dashboard tool cards); separately, `/v1/mcp` (9Router-as-MCP-server) | JWT-only (dashboard bridge) vs. Bearer API key (server) — deliberately different paths so remote/tunnel access to the MCP server isn't broken by the dashboard-only bridge's JWT gate |
| Process/app-level | `health`, `init`, `locale`, `version`, `shutdown` | Public / always-protected (shutdown) |

### 6.3 External integrations

| Service | Purpose | Config |
|---|---|---|
| 40+ AI providers | Actual LLM/image/embedding/tts/stt/search execution | Per-provider OAuth client id/secret or API key, stored in `providerConnections` |
| Cloud sync endpoint | Optional multi-device sync of providers/aliases/combos/keys | `CLOUD_URL` (server), `NEXT_PUBLIC_CLOUD_URL` (client), default `https://9router.com` |
| Discord webhook | Provider-down / recovery alerts | `settings.providerAlertWebhookUrl`, gated by `providerAlertEnabled` |
| Cloudflare tunnel worker | Remote dashboard/API access without port-forwarding | `TUNNEL_WORKER_URL` |
| Tailscale | Alternative remote access | `src/app/api/tunnel/tailscale-*` (local-only) |
| models.dev | Cached pricing snapshot for cost calculation | `modelsDevPricingRepo.js` |

### 6.4 Rate limiting / throttling

No global request-rate-limiting middleware was found in the codebase; the resilience mechanisms present are all *outbound* (toward upstream providers): per-account cooldown/backoff on 429/5xx, per-combo-model cooldown, and `Retry-After` propagation to the client on full exhaustion. Whether to add *inbound* rate limiting is an open question (§9.2).

---

## 7. Configuration & Deployment

### 7.1 Environment variables (selected — see `.env.example` and `docs/guide/14-environment-variables.md` for the full ~140-variable reference)

| Variable | Default | Required | Description |
|---|---|:---:|---|
| `JWT_SECRET` | auto-generated, persisted to `~/.9router/jwt-secret` | Recommended to set explicitly in production | Dashboard session cookie signing |
| `INITIAL_PASSWORD` | `123456` | **Must override in production** | First-login dashboard password |
| `API_KEY_SECRET` | fixed default string | Recommended | HMAC secret for generated API keys |
| `MACHINE_ID_SALT` | fixed default string | Recommended | Salt for stable machine-ID hashing |
| `DATA_DIR` | `~/.9router` / `%APPDATA%/9router` | No | SQLite DB + backups + config location |
| `PORT` | Next.js default | No | HTTP port (commonly 20128) |
| `BASE_URL` / `NEXT_PUBLIC_BASE_URL` | — / `http://localhost:3000` | No | Server prefers `BASE_URL` for internal sync callbacks |
| `CLOUD_URL` / `NEXT_PUBLIC_CLOUD_URL` | `https://9router.com` | No | Cloud sync endpoint |
| `REQUIRE_API_KEY` | `false` | No | Enforce Bearer key on `/v1/*` — recommended for internet-exposed deploys |
| `AUTH_COOKIE_SECURE` | `false` | Recommended `true` behind HTTPS | Secure flag on the auth cookie |
| `ENABLE_REQUEST_LOGS` | `false` | No | Writes full request/response logs to `logs/` — treat as sensitive |
| `OBSERVABILITY_ENABLED` | `false` | No | Persist request-detail records for debugging |
| `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` / `NO_PROXY` | — | No | Outbound proxy for upstream provider calls |

### 7.2 Database setup

No manual migration step required — `runMigrationOnce(adapter)` runs automatically on first `getAdapter()` call: versioned migrations (4, in `src/lib/db/migrations/`) → additive schema sync from `schema.js TABLES` → one-time legacy JSON import → pre-schema-change backup on app-version bump.

### 7.3 Running the application

```bash
# Development
npm install
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev
# or with Bun
npm run dev:bun

# Production
npm run build && PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start

# Docker
docker build -t 9router .
docker-compose up -d
```

### 7.4 Background jobs

| Job | Schedule | Description |
|---|---|---|
| Background token refresh | Interval, default 5 min | Proactively refreshes OAuth connections expiring within 30 min; skipped in edge/build/browser runtimes, disable via `DISABLE_BACKGROUND_TOKEN_REFRESH` |
| Cloud sync scheduler | Periodic, when `cloudEnabled` | Pushes/pulls provider/alias/combo/key state to/from `CLOUD_URL` |
| WAL checkpoint | Every 60s per adapter instance | Truncates the SQLite WAL file (better-sqlite3/node:sqlite/bun:sqlite adapters) |
| DB backup pruning | On schema-version bump | Keeps 3 newest backups in `${DATA_DIR}/db/backups/` |

### 7.5 Monitoring & logging

Console logs (`src/sse/utils/logger.js`, colored session tags); per-request usage aggregates in the `usageHistory`/`usageDaily` tables surfaced at `/api/usage/*`; optional deep request/response logs under `logs/` (`ENABLE_REQUEST_LOGS=true`) and `requestDetails` table (`OBSERVABILITY_ENABLED=true`); Discord alerting for provider-wide outages. No integration with an external APM/metrics system (Prometheus, Datadog, etc.) was found.

---

## 8. Testing Strategy

Tests live in `tests/` as a **fully separate npm package** (own `package.json`, own vitest config) — not run from the root.

```bash
cd tests && npm install && npm test
cd tests && npx vitest run --reporter=verbose path/to/file.test.js   # single file
cd tests && npx vitest run --reporter=verbose -t "combo-routing"      # pattern match
```

- **Not all-green on a plain checkout**: ~938 pass, ~64 fail (baseline, see `tests/__baseline__/known-fails.txt` — 26 items) plus environment-dependent failures (a `cloud/` worker directory referenced by one test isn't in this repo; an xAI OAuth test times out without network).
- Real-provider tests are gated behind `RUN_REAL=1` and read live credentials from `~/.9router/db/data.sqlite` — not run by default, not part of CI-safe regression checking.
- Regression baselines (`tests/__baseline__/verify-*.mjs`) compare against committed snapshots for the provider registry, aliases, and OAuth URLs — run these after touching provider/alias logic. **Known-broken on Windows**: the verify script's path-matching assumes a Linux container path prefix (`/app/`) that Windows `vitest --reporter=json` output never contains, so it misreports every currently-failing test as a fresh regression on Windows. Diff by eye or run on Linux/CI instead.
- A specific gotcha for translator tests: `open-sse/translator/index.js` lazy-loads translators via `require(...)`, which silently no-ops under vitest/ESM unless the test file imports `./registerAll.js` first — otherwise the translator registry is empty and assertions falsely pass.
- No dedicated performance/load-testing setup was found in the repo.

---

## 9. Appendix

### 9.1 Async queue / message broker detection (Phase 4.5)

**Result: no queue or message-broker infrastructure was found.** Explicit checks performed:
- `package.json` (root) dependencies/devDependencies: no `amqplib`, `kafka-node`/`kafkajs`, `bull`/`bullmq`, `ioredis`/`redis`, `@aws-sdk/client-sqs`, `@google-cloud/pubsub`, `nats`, `zeromq`, or similar.
- Repo-wide search across every `package.json` (including `cli/`, `tests/`, `gitbook/`) for the same identifiers: no matches.
- The combo-pipeline provider-fallback loop in `open-sse/services/combo.js` (`handleComboChat`'s `for` loop over `rotatedModels`) is a **synchronous in-process retry loop**, not a message queue — it does not publish/consume messages, has no broker, and holds no durable queue state (cooldowns are an in-memory `Map`). It is documented here explicitly so it is not mistaken for queue infrastructure in future analysis.
- The only asynchronous background work in the system is interval-based (background token refresh, cloud-sync scheduler, WAL checkpoint) — timers, not queues.

Because no queue system exists, `docs/Queue-Flow-Diagrams.md` was **not created**, and the `queue-flow` diagram type is omitted from the Phase 5 diagram viewer.

### 9.2 Glossary

| Term | Definition |
|---|---|
| **Combo** | A named, ordered list of `provider/model` strings tried in sequence (or parallel, for fusion) until one succeeds |
| **Account fallback** | Rotating between multiple credentials for the same provider when one is rate-limited/erroring |
| **Model cooldown** | Per-combo, in-memory, 5-minute skip of a model that just failed inside that specific combo |
| **Fusion combo** | A combo strategy where a panel of models answer in parallel and a judge model synthesizes one final answer |
| **RTK (Request Token Killer)** | Engine that compresses `tool_result` content in-place before translation, using 21 content-aware filters |
| **Headroom** | Optional external `/v1/compress` proxy RTK can delegate to; fail-open if unreachable |
| **Caveman** | System-prompt injection mode forcing terse, "caveman-speak" replies to cut output tokens |
| **Ponytail** | System-prompt injection mode ("lazy senior dev" persona) encouraging minimal, YAGNI-first code output |
| **CMEM** | Context Memory Engine — opt-in long-term memory across sessions, backed by SQLite FTS5 |
| **Executor** | Per-provider adapter (`open-sse/executors/*.js`) implementing the actual upstream HTTP call |
| **Translator** | Per-format-pair converter (`open-sse/translator/{request,response}/*.js`) normalizing requests/responses through an OpenAI-pivot format |
| **Provider node** | A user-defined custom OpenAI-compatible or Anthropic-compatible endpoint, distinct from the built-in provider registry |
| **DATA_DIR** | Root directory for all local persistent state (SQLite DB, backups, JWT secret) |

### 9.3 Open Questions

Points the codebase and existing docs cannot answer — flagged honestly rather than guessed:

- [ ] **Success metrics / KPIs**: no adoption targets, cost-savings %, or uptime SLOs are defined anywhere. Who owns the product roadmap?
- [ ] **Inbound rate limiting**: no per-client/per-IP rate limiting was found on `/v1/*` or the dashboard API — is this intentional (self-hosted, trusted network) or a gap for internet-exposed deployments?
- [ ] **Multi-tenancy**: the system is single-operator/single-password by design (`INITIAL_PASSWORD`). Is multi-user/multi-tenant support ever planned, or is "one dashboard password per install" the permanent model?
- [ ] **Cloud sync backend**: `CLOUD_URL`/`NEXT_PUBLIC_CLOUD_URL` point at an external service (`https://9router.com`) whose implementation is explicitly out of scope for this repo (per `docs/ARCHITECTURE.md` "Out of Scope") — what are its guarantees (durability, conflict resolution beyond "local newer wins", auth model)?
- [ ] **MCP server tool coverage**: `packages/mcpServer/` is explicitly partial — media/web/usage/health tools are not yet implemented (see `plans/2026-08-27-mcp-server-tools-planning.md`). What's the completion timeline?
- [ ] **Test suite health**: ~64 known-failing tests on a plain checkout is the accepted baseline, not zero — is there a plan to burn this down, or is it considered permanently acceptable given upstream-sync churn?
- [ ] **Backup/restore**: `exportDb()`/`importDb()` exist and automatic backups are pruned to 3 newest, but there's no automated restore procedure — is manual file copy the intended recovery path in production?
- [ ] **`packages/kira-ai/`**: referenced as "removed" in root `AGENTS.md` but still listed in `docs/guide/19-key-files-reference.md` and `packages/PACKAGES-ANALYSIS.md` — should those stale docs be corrected, and is Kira AI integration fully retired or reachable via another package (`revidapi/`?)?

### 9.4 Analyzed files

| File | Purpose |
|---|---|
| `AGENTS.md` (root) | Canonical technical architecture, hard rules, dev/test commands |
| `open-sse/AGENTS.md` | SSE engine internals |
| `src/sse/AGENTS.md` | Next.js↔open-sse bridge, combo/account-fallback detail |
| `src/app/api/AGENTS.md` | API route conventions, auth/middleware matrix |
| `src/lib/db/AGENTS.md` | SQLite driver/schema/repos |
| `packages/AGENTS.md` | Feature-package internals, `@9router/*` resolution |
| `docs/ARCHITECTURE.md` | Prior full architecture doc with mermaid diagrams (reused extensively here) |
| `docs/guide/*.md` (19 files) | Prior hand-written technical guides (provider system, combo system, database, auth, RTK, executors, translator, environment variables, key files, etc.) |
| `open-sse/services/combo.js` | `handleComboChat`/`handleFusionChat` — read in full for §5 workflow detail |
| `packages/model-combo-cooldown/*.js` | Read in full for the cooldown mechanism described in WF-02 |
| `package.json` (root) | Dependency/tech-stack detection, queue-library negative check |

### 9.5 Document history

| Date | Version | Change |
|---|---|---|
| 2026-09-08 | v2.0 | Full 5-phase codebase analysis; supersedes the 42-line stub, consolidates `ARCHITECTURE.md` + `guide/*` |
| (unknown) | v1.0 | Original stub (Executive Summary / Mission / Problem / Audience / Value only) |
