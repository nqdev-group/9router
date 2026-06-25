# 9Router — Tài liệu Nghiệp vụ & Quy trình

_Cập nhật: 2026-06-24 | Phiên bản: 0.5.8_

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Giới thiệu

**9Router** là một local AI routing gateway mã nguồn mở, hoạt động như một proxy OpenAI-compatible giữa CLI tools coding (Claude Code, Codex, Cursor, Cline, OpenClaw...) và các upstream AI providers (40+ providers, 100+ models).

Mục tiêu chính: cho phép developers sử dụng **nhiều AI providers đồng thời** qua một endpoint duy nhất mà không cần cấu hình tool thủ công, kết hợp với cơ chế **token saver (RTK)** để giảm 20-40% input tokens.

### 1.2 Mục đích nghiệp vụ

- **Tối ưu hóa chi phí**: Tự động fallback giữa subscription → cheap → free providers
- **Không gián đoạn**: Khi một provider hết quota, tự động chuyển sang provider khác (combo)
- **Tiết kiệm tokens**: Nén tool_result content (git diff, grep, ls...) trước khi gửi lên LLM
- **Tương thích đa nền tảng**: Claude Code, Codex CLI, Cursor IDE, Cline, OpenClaw, Continue, Roo...
- **Quản lý tập trung**: Dashboard web để quản lý tất cả providers, keys, combos, usage tracking

### 1.3 Actors

| Actor | Mô tả | Công cụ |
|-------|-------|---------|
| **Developer (End User)** | Lập trình viên sử dụng AI coding tools | Claude Code, Codex CLI, Cursor IDE, OpenClaw, Cline |
| **Dashboard Admin** | Quản trị viên cấu hình hệ thống | Web browser → Dashboard UI |
| **Hệ thống 9Router** | Proxy gateway xử lý routing tự động | Next.js server (port 20128) |
| **Upstream Provider** | Dịch vụ AI bên ngoài | Anthropic, OpenAI, Google, Kiro, GLM, MiniMax... |
| **Cloud Sync Service** | Dịch vụ đồng bộ cấu hình đa thiết bị | 9router.com (external) |

### 1.4 Ngữ cảnh hoạt động

```
┌──────────────┐     POST /v1/chat/completions     ┌──────────────────┐
│  CLI Tools   │ ────────────────────────────────── │                  │
│  Claude Code │         OpenAI-compatible          │  9Router Server  │
│  Codex CLI   │ ──────────────────────────────────►│  (Port 20128)    │
│  Cursor      │                                    │                  │
│  Cline       │     http://localhost:20128/v1       │  Dashboard:      │
│  OpenClaw    │                                    │  localhost:20128 │
└──────────────┘                                    └────────┬─────────┘
                                                              │
                              ┌───────────────────────────────┤
                              │                               │
                    ┌─────────▼──────────┐         ┌──────────▼─────────┐
                    │  Provider Layer    │         │  SQLite Database   │
                    │  40+ Providers     │         │  $DATA_DIR/db/     │
                    │  100+ Models       │         │  data.sqlite        │
                    └────────────────────┘         └────────────────────┘
```

### 1.5 Luồng request tổng quan

```
POST /v1/chat/completions
  └── Auth check (API key or local mode)
  └── Model/Combo resolution
  └── Account selection (round-robin, fallback)
  └── OAuth token refresh (if needed)
  └── Pre-processing chain:
      ├── PrivacyEngine (mask secrets)
      ├── RTK compression (tool_result)
      ├── Headroom proxy (optional)
      ├── Caveman mode (terse output)
      ├── CMEM injection (contextual memory)
      └── Ponytail mode (YAGNI prompt)
  └── Format detection + translation (source → OpenAI → target)
  └── Executor dispatch → upstream provider
  └── Response translation (target → OpenAI → source)
  └── CMEM capture (async, post-response)
  └── Usage tracking + cost calculation
  └── SSE streaming or JSON response back to client
```

---

## 2. KIẾN TRÚC KỸ THUẬT

### 2.1 Kiến trúc 3 lớp

```
┌────────────────────────────────────────────────────────────────────┐
│  LỚP 1 — API ROUTES (src/app/api/)                                │
│  ┌────────────────────┐  ┌──────────────────────────────────────┐  │
│  │  /v1/* Endpoints   │  │  /api/* Management APIs              │  │
│  │  Chat Completions  │  │  Auth, Providers, Combos, Keys       │  │
│  │  Models/Messages   │  │  Usage, Settings, OAuth Flows        │  │
│  │  Embeddings/Images │  │  Cloud Sync, CLI Tools               │  │
│  │  Audio/Search      │  │  Media Providers                     │  │
│  └────────────────────┘  └──────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│  LỚP 2 — SSE + ROUTING CORE (src/sse/ + open-sse/)                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  src/sse/handlers/chat.js   — Entry point, combo/account    │   │
│  │  open-sse/handlers/chatCore.js — Orchestration, dispatch     │   │
│  │  open-sse/executors/   — 22 provider-specific adapters       │   │
│  │  open-sse/services/    — model, provider, fallback, combo    │   │
│  └─────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────┤
│  LỚP 3 — TRANSLATION REGISTRY (open-sse/translator/)              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Source Format → OpenAI (intermediate) → Target Format      │   │
│  │  13 formats: openai, claude, gemini, kiro, cursor, vertex  │   │
│  │  Direct routes: claude→kiro (skip lossy double-hop)         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack

| Layer | Công nghệ | Ghi chú |
|-------|-----------|---------|
| Runtime | Node.js 18+ / Bun | Next.js standalone server |
| Framework | Next.js 16 (App Router) | ESM throughout, Webpack (no turbopack) |
| UI | React 19 + Tailwind CSS 4 | JSdoc types, no TS |
| State | Zustand 5 | 7 stores |
| Database | SQLite | 4-driver chain: bun → better-sqlite3 → node:sqlite → sql.js |
| Streaming | SSE (Server-Sent Events) | Disconnect-aware stream controller |
| Auth | JWT + API Key HMAC + OAuth 2.0 PKCE | Dashboard cookie + Bearer token |
| CLI Package | CommonJS (esbuild bundle) | Published as `9router` on npm |
| Charts | Recharts 3, @xyflow/react 12 | Dashboard analytics |
| Lint | ESLint 9 + eslint-config-next | Flat config |

### 2.3 Component Map

| Component | Vị trí | Chức năng |
|-----------|--------|-----------|
| **Chat Handler** | `src/sse/handlers/chat.js` | Entry point: parse body, combo iteration, account fallback loop |
| **Chat Core** | `open-sse/handlers/chatCore.js` | Central dispatcher: format detection, translation, executor dispatch, retry |
| **Executors** | `open-sse/executors/` (22 files) | Provider-specific HTTP + auth adapters |
| **Translator** | `open-sse/translator/` | Format conversion registry (13 formats) |
| **RTK Engine** | `open-sse/rtk/` (15 files) | Tool_result compression (21 filters) |
| **PrivacyEngine** | `open-sse/privacy/` | Mask API keys, passwords, tokens in request |
| **CMEM Engine** | `packages/cmem/` (16 files) | Contextual memory injection + capture (opt-in) |
| **Dashboard** | `src/app/(dashboard)/dashboard/` | 17 management pages |
| **Auth Guard** | `src/dashboardGuard.js` | Middleware: JWT + API key + CLI token |
| **Local DB** | `src/lib/db/` | SQLite layer (4 adapters, schema, repos, migrations) |
| **Usage DB** | `src/lib/usageDb.js` | Usage tracking + request details |
| **Provider Registry** | `open-sse/providers/registry/` (97 files) | Provider definitions, models, capabilities |

---

## 3. DOMAIN MODEL

### 3.1 Database Schema (SQLite — 11 tables + CMEM tables)

```
┌────────────────────────────────────────────────────────────────────┐
│                        SQLite Database                              │
│                    $DATA_DIR/db/data.sqlite                          │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐    │
│  │  _meta        │   │  settings        │   │  kv              │    │
│  │  key: TEXT PK │   │  id: INT PK      │   │  scope: TEXT PK  │    │
│  │  value: TEXT  │   │  data: TEXT      │   │  key: TEXT PK    │    │
│  └──────────────┘   │  (JSON blob)      │   │  value: TEXT     │    │
│                     └──────────────────┘   └──────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  providerConnections                                          │   │
│  │  id, provider, authType, name, email, priority, isActive,    │   │
│  │  data (JSON: apiKey, accessToken, refreshToken, etc.)        │   │
│  │  createdAt, updatedAt                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────┐   ┌──────────────┐   ┌──────────────────┐    │
│  │  providerNodes   │   │  proxyPools  │   │  apiKeys         │    │
│  │  id, type, name  │   │  id, active  │   │  id, key, name   │    │
│  │  data (JSON)     │   │  data (JSON) │   │  machineId       │    │
│  └──────────────────┘   └──────────────┘   └──────────────────┘    │
│                                                                     │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐    │
│  │  combos      │   │  usageHistory    │   │  requestDetails  │    │
│  │  id, name    │   │  id, timestamp   │   │  id, timestamp   │    │
│  │  models:JSON │   │  provider, model │   │  provider, model │    │
│  │  kind        │   │  tokens, cost    │   │  data (JSON)     │    │
│  └──────────────┘   │  rtkSaved, meta  │   └──────────────────┘    │
│                     └──────────────────┘                           │
│  ┌──────────────┐                                                  │
│  │  usageDaily  │                                                  │
│  │  dateKey PK  │                                                  │
│  │  data (JSON) │                                                  │
│  └──────────────┘                                                  │
│                                                                     │
│  ┌──────────────────────────────┐                                   │
│  │  CMEM Tables (opt-in)        │                                   │
│  │  cmem_observations           │                                   │
│  │  cmem_sessions               │                                   │
│  │  cmem_context_cache + FTS5   │                                   │
│  └──────────────────────────────┘                                   │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Core Entities & Relationships

```
Settings ──1:1──► controls global behavior (requireLogin, cloudEnabled, rtkEnabled, etc.)

ProviderConnection ──N:1──► Provider (via provider field)
ProviderConnection ──N:1──► ProviderNode (compatible custom endpoint)
ProviderConnection ──1:N──► UsageHistory (per-request tokens)

Combo ──1:N──► models[] (ordered fallback sequence)
Combo ──N:1──► Settings.strategy (fallback or fusion)

ApiKey ──1:1──► MachineId (who generated)
ApiKey ──N:1──► Settings.requireApiKey (toggle enforcement)

UsageHistory ──N:1──► UsageDaily (aggregated)

CmemObservations ──N:1──► Model/Provider (context memory entries)
```

### 3.3 Entity Field Details

| Entity | Key Fields | Ý nghĩa |
|--------|-----------|---------|
| **providerConnections** | `provider`, `authType` (oauth/api-key/none), `data` (JSON: tokens, keys), `priority`, `isActive` | Mỗi record là một tài khoản provider |
| **settings** | `data` JSON: `rtkEnabled`, `cavemanEnabled`, `cmemEnabled`, `requireLogin`, `cloudEnabled`, `comboStrategy` | Single-row configuration |
| **combos** | `name` (unique), `models` (JSON array), `kind` (normal/fusion) | Chuỗi fallback models theo thứ tự |
| **apiKeys** | `key` (HMAC-signed), `machineId` (who created), `isActive` | API keys cho CLI tools truy cập |
| **usageHistory** | `provider`, `model`, `promptTokens`, `completionTokens`, `cost`, `status`, `rtkSaved` | Mỗi request một record |
| **providerNodes** | `type`, `name`, `data` (JSON: baseUrl, apiType) | Custom compatible endpoints |
| **cmem_observations** | `model`, `messages`, `response`, `provider`, `tokenCount` | Memory observations for contextual recall |
| **cmem_sessions** | `sessionId`, `model`, `provider`, `startedAt` | Session tracking for CMEM |
| **cmem_context_cache** | `queryHash`, `context`, `tokenCount`, `expiresAt` | FTS5-indexed cache for fast context retrieval |

---

## 4. ACTORS & PERMISSIONS

### 4.1 Actor Matrix

| Actor | Truy cập | Xác thực | Quyền hạn |
|-------|----------|----------|-----------|
| **Developer** | `/v1/*` API | API Key (optional) hoặc local mode | Gửi chat completions, list models, embeddings |
| **Dashboard Admin** | `/api/*` + Dashboard UI | JWT cookie (password login) | CRUD providers, combos, keys, settings, OAuth flows |
| **9Router Server** | Nội bộ | N/A | Gọi upstream providers, ghi DB, refresh tokens |
| **Upstream Provider** | External API | OAuth token / API Key | Xử lý inference request |
| **Cloud Service** | `/api/sync/*` | API Key + Machine ID | Đồng bộ cấu hình, providers, combos |

### 4.2 Dashboard Auth Flow

```
User → Browser → /dashboard/*
  └── Middleware (dashboardGuard.js) kiểm tra JWT cookie
       ├── Có JWT hợp lệ → render dashboard
       └── Không có JWT:
            ├── requireLogin=false → cho phép truy cập
            └── requireLogin=true → redirect /login

User → Browser → /login
  ├── POST /api/auth/login
  │   ├── password =*= INITIAL_PASSWORD (first time)
  │   └── password =*= password_hash (subsequent)
  └── Response: Set-Cookie JWT token
```

### 4.3 API Key Auth (Developer)

```
POST /v1/chat/completions
  Header: Authorization: Bearer <apiKey>

  └── Handler kiểm tra:
       ├── requireApiKey=fa*** → bỏ qua key check
       └── requireApiKey=tr** → xác thực HMAC:
            ├── Valid → tiếp tục request
            └── Invalid → 401 Unauthorized
```

---

## 5. DANH SÁCH QUY TRÌNH NGHIỆP VỤ

| # | Quy trình | Mô tả | Source chính |
|---|-----------|-------|-------------|
| 1 | **Chat Completion — Entry & Account Loop** | Xử lý chat request từ CLI tool, combo/account fallback | `src/sse/handlers/chat.js:40-313` |
| 2 | **Chat Completion — Core Pipeline** | Preprocessing → translation → executor → stream | `open-sse/handlers/chatCore.js:42-444` |
| 3 | **Combo & Account Fallback** | Auto fallback qua models/accounts | `open-sse/services/combo.js`, `accountFallback.js` |
| 4 | **OAuth Connection** | Kết nối provider, auto token refresh | `src/app/api/oauth/*`, `open-sse/services/tokenRefresh.js` |
| 5 | **RTK Token Saver** | Nén tool_result, 21 filters auto-detect | `open-sse/rtk/index.js` |
| 6 | **API Key Management** | CRUD API keys cho CLI | `src/app/api/keys/*` |
| 7 | **Provider CRUD** | Quản lý, test, validate providers | `src/app/api/providers/*` |
| 8 | **Usage & Cost Tracking** | Ghi log tokens, daily aggregate | `src/lib/usageDb.js`, `repos/usageRepo.js` |
| 9 | **Cloud Sync** | Đồng bộ config đa thiết bị | `src/shared/services/cloudSyncScheduler.js` |
| 10 | **CMEM Engine** | Contextual memory injection + capture | `packages/cmem/` |
| 11 | **Dashboard Login** | Auth admin | `src/app/api/auth/*` |

---

## 6. CHI TIẾT TỪNG QUY TRÌNH

---

### Quy trình 1: Chat Completion — Entry & Account Loop

**File**: `src/sse/handlers/chat.js` (lines 40-313)
**Mô tả**: Điểm vào chính cho mọi chat request. Parse body, resolve model/combo, quản lý account fallback loop.

```
POST /v1/chat/completions
  │
  ├── 1. Parse JSON body (line 44-50)
  │     └── Lỗi JSON → 400 Invalid JSON body
  │
  ├── 2. Log endpoint, model, message count, tools, effort (line 66-71)
  │
  ├── 3. API Key check (line 83-95)
  │     └── requireApiKey=tr** + key invalid → 401
  │
  ├── 4. Check model string (line 97-100)
  │     └── Missing → 400
  │
  ├── 5. Bypass patterns (line 102-105)
  │     └── Warmup/naming requests → response ngay
  │
  ├── 6. Combo detection (line 107-146)
  │     ├── Is combo? → Strategy:
  │     │     ├── "fusion" → handleFusionChat()
  │     │     └── "fallback" → handleComboChat()
  │     └── Not combo → handleSingleModelChat()
  │
  └── 6b. handleSingleModelChat() (line 155-313)
        ├── Resolve model info (alias → provider/model)
        ├── Load settings: rtkEnabled, cavemanEnabled, cmemEnabled, etc.
        ├── Get credentials loop:
        │     ├── getProviderCredentials() → chọn account
        │     ├── checkAndRefreshToken() → refresh OAuth
        │     ├── handleChatCore() → pipeline xử lý
        │     ├── Success? → return response
        │     └── Fail? → markAccountUnavailable() → retry next account
        └── Hết accounts → all unavailable error
```

**Business Rules**:
- Combo sticky round-robin: optional giữ account cố định trong combo (`settings.stickyRoundRobinLimit`)
- Provider thinking override: cấu hình thinking on/off/effort per-provider từ dashboard
- Account cooldown: exponential backoff khi account fail (rate-limit, auth error)

---

### Quy trình 2: Chat Completion — Core Pipeline

**File**: `open-sse/handlers/chatCore.js` (lines 42-444)
**Mô tả**: Pipeline xử lý lõi — preprocessing → format translation → executor → response stream.

```
handleChatCore({ body, modelInfo, credentials, ... })
  │
  ├── 1. Format detection (line 46)
  │     └── detectFormat(body) → "openai", "claude", "gemini", etc.
  │
  ├── 2. Preprocessors (line 62-65)
  │     ├── preprocessBody(): clean whitespace, dedup
  │     └── pruneBody(): context pruning (nếu messages >= 2)
  │
  ├── 3. Provider thinking override (line 69-79)
  │     └── mode "on/off" → extended thinking; "low/med/high" → reasoning_effort
  │
  ├── 4. Stream mode detection (line 81-105)
  │     ├── Client requests streaming? → stream=true
  │     ├── Provider forceStream? → stream=true
  │     ├── Image generation model? → stream=false
  │     ├── DeepSeek-TUI non-interactive? → stream=false
  │     └── Client Accept: application/json? → stream=false
  │
  ├── 5. Native passthrough check (line 114-116)
  │     └── CLI tool + provider same ecosystem → skip translation
  │
  ├── 6. Modality strip + image prefetch (line 121-131)
  │     ├── stripUnsupportedModalities(): remove vision/audio blocks
  │     └── prefetchRemoteImages(): convert URLs → base64
  │
  ├── 7. Format translation (line 141-148)
  │     └── translateRequest(): source → OpenAI (intermediate) → target
  │     ├── Passthrough? → only swap model + Bearer
  │     └── Translation? → full format conversion
  │
  ├── 8. Tool deduplication (line 152-158)
  │     └── Dedupe built-in tools when MCP equivalents present (Claude only)
  │
  ├── 9. Caveman injection (line 171-174)
  │     └── injectCaveman(): terse output system prompt
  │
  ├── 10. RTK compression (line 177-179)
  │      └── compressMessages(): 21 filters auto-detect tool_result
  │
  ├── 11. Headroom proxy (line 182-184)
  │      └── compressWithHeadroom(): external /v1/compress (fail-open)
  │
  ├── 12. Caveman injection (second pass, line 187-190)
  │      └── injectCaveman(): post-RTK injection
  │
  ├── 13. PrivacyEngine (line 193-197)
  │      └── Mask API keys, passwords, tokens in final body
  │
  ├── 14. CMEM injection (line 200-214)
  │      └── CmemEngine.injectContext(): contextual memory từ FTS5
  │
  ├── 15. Ponytail injection (line 217-220)
  │      └── injectPonytail(): YAGNI-first system prompt
  │
  ├── 16. Response Cache check (line 223-245)
  │      └── getResponseCache().get(): LRU cache cho identical requests
  │
  ├── 17. Executor dispatch (line 247-324)
  │      └── getExecutor(provider).execute({ body, credentials, stream })
  │      ├── 401/403 → refreshWithRetry() → retry once
  │      └── Other errors → createErrorResult()
  │
  ├── 18. Response handling (line 370-438)
  │      ├── Forced SSE→JSON (client wants JSON, provider streams)
  │      ├── True non-streaming → handleNonStreamingResponse()
  │      └── Streaming → handleStreamingResponse()
  │
  ├── 19. CMEM capture (line 376-397)
  │      └── CmemEngine.captureObservation(): async post-response
  │
  └── 20. Usage tracking
        ├── extract tokens from response
        ├── calculate cost (pricing lookup)
        ├── save usageHistory record
        └── update usageDaily aggregation
```

**Business Rules**:
- Mọi preprocessing step đều **fail-open**: lỗi → skip step, tiếp tục pipeline
- Stream controller disconnect-aware: client ngắt → dừng upstream call
- 401/403 retry: refresh token + retry một lần
- Response cache: LRU cache cho identical requests (tùy chọn, responseCacheEnabled)
- Caveman inject TWICE: trước và sau RTK (RTK compress added text)
- CMEM: inject trước dispatch, capture async sau response (fire-and-forget)

---

### Quy trình 3: Combo & Account Fallback

**Files**: `open-sse/services/combo.js`, `open-sse/services/accountFallback.js`
**Mô tả**: Tự động fallback qua nhiều models/accounts khi provider lỗi hoặc hết quota.

```
Model String → "my-coding-stack"
  │
  ├── getComboModels() → lookup in combos table
  │     ├── Found → array of model strings (ordered)
  │     └── Not found → treat as single model
  │
  ├── Combo Strategy:
  │     ├── "fallback" → handleComboChat():
  │     │     ├── Try model[0] → success? → return
  │     │     ├── Fail → try model[1] → success? → return
  │     │     ├── Fail → try model[2] → ...
  │     │     └── All fail → "All models unavailable"
  │     │
  │     └── "fusion" → handleFusionChat():
  │           ├── Send same prompt to ALL models in parallel
  │           ├── Judge model evaluates responses
  │           └── Return best response
  │
  └── Within each model: Account Fallback Loop
        ├── getProviderCredentials() → round-robin active accounts
        ├── Account fails → markAccountUnavailable(cooldown)
        ├── Try next account for same provider
        └── All accounts fail → try next model in combo
```

**Cooldown Types**:
- Rate limit (429): `resetsAtMs` từ provider response
- Auth error (401/403): exponential backoff starting 5min
- Generic error: exponential backoff starting 1min
- All cooldowns: max 24h cap

---

### Quy trình 4: OAuth Connection

**Files**: `src/app/api/oauth/*`, `open-sse/services/tokenRefresh.js`
**Mô tả**: Kết nối provider qua OAuth, tự động refresh token.

```
Dashboard → Connect Provider
  │
  ├── OAuth 2.0 PKCE Flow:
  │     ├── GET /api/oauth/[provider]/authorize
  │     │   → redirect to provider auth server
  │     ├── User approves
  │     │   → callback to /api/oauth/[provider]/callback
  │     └── Exchange code → access/refresh tokens
  │
  ├── Device Code Flow (for providers without browser):
  │     ├── POST /api/oauth/[provider]/device-code
  │     │   → display code to user
  │     ├── User enters code at provider URL
  │     └── Poll /api/oauth/[provider]/poll → tokens
  │
  ├── Token Refresh (runtime):
  │     ├── checkAndRefreshToken() trước mỗi request
  │     ├── refreshWithRetry() khi 401/403
  │     └── updateProviderCredentials() → persist mới
  │
  └── Connection Test:
        ├── POST /api/providers/[id]/test
        └── executor.validate() hoặc execute() test call
```

---

### Quy trình 5: RTK Token Saver

**File**: `open-sse/rtk/index.js`, `open-sse/rtk/filters/`
**Mô tả**: Nén tool_result content để giảm 20-40% input tokens.

```
Translated Body (before dispatch)
  │
  ├── RTK Compress (21 filters):
  │     ├── git-diff: nén git diff output
  │     ├── git-status: nén git status output
  │     ├── grep: nén grep/ripgrep results
  │     ├── find: nén find results
  │     ├── ls: nén ls/dir listing
  │     ├── tree: nén tree output
  │     ├── dedup-log: nén duplicate log lines
  │     ├── smart-truncate: truncate dài + summary
  │     ├── read-numbered: nén file có line numbers
  │     ├── search-list: nén search results
  │     └── ... (11 more filters)
  │
  ├── Auto-detect: peek first 1KB of tool_result → pick filter
  │
  ├── Headroom (optional):
  │     └── POST /v1/compress → external compression proxy
  │
  ├── Caveman (optional):
  │     ├── lite: "say less" prompt
  │     ├── full: terse technical output
  │     └── ultra: extreme compression
  │
  └── Ponytail (optional):
        ├── lite: YAGNI reminder
        ├── full: lazy senior dev system prompt
        └── ultra: extreme minimalism
```

**Fail-open guarantee**: Nếu filter throw hoặc output lớn hơn original → giữ nguyên text.

---

### Quy trình 6-11: Summary

| # | Quy trình | Key Flow | Source |
|---|-----------|----------|--------|
| 6 | API Key Mgmt | CRUD API keys, HMAC-signed, machine ID tracking | `src/app/api/keys/*` |
| 7 | Provider CRUD | Add/edit/test/delete providers, OAuth connect, connection pool | `src/app/api/providers/*` |
| 8 | Usage Tracking | Per-request tokens → usageHistory → daily aggregate → dashboard charts | `src/lib/usageDb.js` |
| 9 | Cloud Sync | Periodic sync providers/combos/keys to 9router.com cloud | `src/shared/services/cloudSyncScheduler.js` |
| 10 | CMEM Engine | FTS5 search → inject context before dispatch → capture after response | `packages/cmem/` |
| 11 | Dashboard Login | Password → JWT cookie → middleware verify → admin access | `src/app/api/auth/*` |

---

## 7. PROVIDER SYSTEM

### 7.1 Provider Registry (97 files)

Provider definitions live in `open-sse/providers/registry/{id}.js`. Each file exports:

```js
{
  id: "provider-id",
  category: "oauth" | "api-key" | "free" | "compatible",
  display: { name, icon, color },
  models: [...],
  transport: { format, streamFormat },
  oauth: { type, authUrl, tokenUrl, scopes },
  pricing: { inputPer1M, outputPer1M },
  capabilities: { vision, tools, streaming, ... }
}
```

### 7.2 Executor System (22 adapters)

| Executor | Provider | Notable Features |
|----------|----------|-----------------|
| `AntigravityExecutor` | antigravity | Custom protobuf format, session-id |
| `AzureExecutor` | azure | Azure OpenAI endpoint, managed identity |
| `GeminiCLIExecutor` | gemini-cli | Google OAuth, project-id injection |
| `GithubExecutor` | github | OAuth device flow, token refresh |
| `KiroExecutor` | kiro | AWS EventStream binary format |
| `CodexExecutor` | codex | OpenAI Responses API, OAuth |
| `CursorExecutor` | cursor | ConnectRPC protobuf, checksum |
| `VertexExecutor` | vertex | GCP service account, region routing |
| `QwenExecutor` | qwen | Alibaba OAuth |
| `OpenCodeExecutor` | opencode | No-auth passthrough |
| `OllamaLocalExecutor` | ollama-local | Local model, no auth |
| `DefaultExecutor` | all others | OpenAI-compatible generic |

### 7.3 Format Translation (13 formats)

```
Source Formats:
  openai, openai-responses, claude, gemini, gemini-cli,
  antigravity, kiro, cursor, ollama, commandcode, vertex

Target Formats:
  openai (chat completions), openai-responses, claude,
  gemini, gemini-cli, antigravity, kiro, cursor,
  ollama, commandcode, vertex

Pipeline: source → OpenAI (intermediate) → target
Direct routes skip lossy double-hop (e.g., claude→kiro)
```

**OpenAI Bridge Pitfalls**: thinking/reasoning blocks, non-base64 images, tool IDs, is_error all lost when going through intermediate format.

---

## 8. TOKEN SAVER SYSTEM

### 8.1 RTK (Request Token Killer)

- **Input compression**: 21 content-aware filters for tool_result blocks
- **Auto-detection**: no config needed, peek first 1KB
- **Stats tracking**: saved tokens recorded in usageHistory
- **Default ON**: toggle in Dashboard → Endpoint

### 8.2 Headroom (External Proxy)

- Optional external `/v1/compress` proxy
- Runs separately from 9Router
- Fail-open: proxy down → send original

### 8.3 Caveman Mode

- Injects terse-output system prompt
- 6 levels: lite, full, ultra, etc.
- Reduces output tokens by up to 65%

### 8.4 Ponytail (Lazy Senior Dev)

- YAGNI-first system prompt injection
- 3 levels: Lite, Full, Ultra
- Fewer output tokens, less refactoring

---

## 9. CMEM ENGINE (Contextual Memory)

### 9.1 Architecture

```
packages/cmem/
  ├── CmemEngine.js       — Main orchestrator
  ├── MemoryStore.js       — FTS5 search + storage
  ├── Summarizer.js        — Response summarization
  ├── ContextBuilder.js    — Context assembly
  ├── TokenBudget.js       — Token counting
  ├── Observer.js          — Observation capture
  ├── Injector.js          — Context injection
  └── formatters/          — OpenAI, Claude, Gemini formatters
```

### 9.2 Lifecycle

```
Pre-dispatch:
  CmemEngine.injectContext(body, format)
    ├── FTS5 search: find relevant past observations
    ├── Token budget: fit within configured limit
    └── Format-aware injection into system messages

Post-response:
  CmemEngine.captureObservation({ model, messages, response, provider })
    ├── Summarize response
    ├── Store in cmem_observations
    └── Update cmem_context_cache (FTS5 indexed)
```

### 9.3 Opt-in / Privacy

- **Disabled by default** (opt-in via Dashboard → Endpoint → CMEM)
- Observations can be disabled per-config (`observationsEnabled: false`)
- Data stays in local SQLite (no external service)

---

## 10. DEPLOYMENT & ENVIRONMENT

### 10.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | Auto-generated | Dashboard auth signing |
| `INITIAL_PASSWORD` | `123456` | First login password |
| `DATA_DIR` | `~/.9router` | SQLite + password hash |
| `PORT` | 20128 | HTTP bind port |
| `NODE_ENV` | runtime | Set `production` for deploy |
| `BASE_URL` | `http://localhost:20128` | Internal sync URL |
| `CLOUD_URL` | `https://9router.com` | Cloud sync endpoint |
| `API_KEY_SECRET` | default | HMAC for API key gen |
| `MACHINE_ID_SALT` | default | Machine ID hashing |
| `ENABLE_REQUEST_LOGS` | `false` | Write logs to `logs/` |
| `AUTH_COOKIE_SECURE` | `false` | Force Secure cookie |
| `REQUIRE_API_KEY` | `false` | Enforce Bearer auth |
| `HTTP_PROXY`/`HTTPS_PROXY` | empty | Outbound proxy |

### 10.2 Deployment Options

```
Local:      npm run dev / npm run start
VPS:        pm2 start npm --name 9router -- start
Docker:     docker run -d -p 20128:20128 decolua/9router:latest
Docker Compose: docker-compose.yml provided
```

### 10.3 SQLite Driver Chain

```
bun:sqlite (Bun runtime)
  → better-sqlite3 (optional, if build tools available)
    → node:sqlite (Node >= 22.5)
      → sql.js (WASM fallback, always works)
```

---

## 11. FAILURE MODES & RESILIENCE

| Failure | Handling | Location |
|---------|----------|----------|
| Invalid JSON body | 400 Bad Request | `chat.js:44-50` |
| Missing model | 400 Bad Request | `chat.js:97-100` |
| Invalid API key | 401 Unauthorized | `chat.js:83-95` |
| No credentials for provider | 404 Not Found | `chat.js:232-234` |
| All accounts rate-limited | 503 + retry-after | `chat.js:225-230` |
| Translation failure | 400 Bad Request | `chatCore.js:142-144` |
| Executor network error | 502 Bad Gateway | `chatCore.js:305-324` |
| Provider 401/403 | Token refresh + retry | `chatCore.js:327-347` |
| Provider error response | Error forwarded to client | `chatCore.js:350-367` |
| RTK compression error | Fail-open, keep original | `open-sse/rtk/index.js` |
| CMEM injection error | Fail-open, skip injection | `chatCore.js:211-213` |
| PrivacyEngine error | Fail-open, pass through | `chatCore.js:197` |
| Headroom proxy down | Fail-open, skip compression | `open-sse/rtk/headroom.js` |
| Cloud sync error | Log + continue local | `cloudSyncScheduler.js` |
| DB migration missing | Auto-add columns/tables | `src/lib/db/migrate.js` |
| Token refresh failure | Forward 401/403 to client | `chatCore.js:343-346` |

---

## 12. SECURITY BOUNDARIES

| Boundary | Mechanism | Notes |
|----------|-----------|-------|
| Dashboard auth | JWT cookie (HMAC-signed) | `JWT_SECRET` env var |
| API key auth | HMAC verification | `API_KEY_SECRET` env var |
| Provider secrets | Stored in SQLite `providerConnections.data` | Filesystem-level protection |
| Cloud sync auth | API key + machine ID | `MACHINE_ID_SALT` env var |
| PrivacyEngine | Regex mask in request body | Before dispatch to any provider |
| Outbound proxy | Optional HTTP/SOCKS5 proxy | Per-provider or global config |

---

## 13. KEY FILE MAP

| Path | Lines | Purpose |
|------|-------|---------|
| `src/sse/handlers/chat.js` | 313 | Main entry, combo/account loop |
| `open-sse/handlers/chatCore.js` | 444 | Core pipeline orchestration |
| `open-sse/executors/index.js` | 82 | Executor registry (22 adapters) |
| `open-sse/translator/index.js` | - | Format translation registry |
| `open-sse/rtk/index.js` | - | RTK compression engine |
| `open-sse/privacy/PrivacyEngine.js` | - | Secret masking |
| `packages/cmem/` (16 files) | - | Contextual memory engine |
| `src/lib/db/schema.js` | 159 | SQLite schema (11 tables) |
| `src/lib/db/driver.js` | - | 4-driver adapter chain |
| `src/lib/db/repos/usageRepo.js` | 820 | Usage tracking (largest repo) |
| `src/dashboardGuard.js` | - | Auth middleware |
| `src/app/(dashboard)/dashboard/` | 17 pages | Dashboard UI |
| `open-sse/providers/registry/` | 97 files | Provider definitions |
| `next.config.mjs` | - | URL rewrites, standalone output |

---

## 14. GLOSSARY

| Term | Definition |
|------|------------|
| **Combo** | Ordered list of models for automatic fallback |
| **RTK** | Request Token Killer — tool_result compression engine |
| **Caveman** | Terse-output system prompt injector |
| **Ponytail** | YAGNI-first "lazy senior dev" prompt injector |
| **CMEM** | Contextual Memory engine (FTS5-based, opt-in) |
| **Headroom** | External compression proxy (optional) |
| **Executor** | Provider-specific HTTP adapter |
| **Translator** | Format conversion between provider APIs |
| **Passthrough** | Skip translation when CLI tool matches provider ecosystem |
| **Cooldown** | Account unavailability period after error |
| **Provider Node** | Custom OpenAI-compatible endpoint |
| **Fusion** | Parallel multi-model with judge evaluation |
