# 9Router — Tài liệu Nghiệp vụ & Quy trình

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
      └── Ponytail mode (YAGNI prompt)
  └── Format detection + translation (source → OpenAI → target)
  └── Executor dispatch → upstream provider
  └── Response translation (target → OpenAI → source)
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
| **Dashboard** | `src/app/(dashboard)/dashboard/` | 17 management pages |
| **Auth Guard** | `src/dashboardGuard.js` | Middleware: JWT + API key + CLI token |
| **Local DB** | `src/lib/db/` | SQLite layer (4 adapters, schema, repos, migrations) |
| **Usage DB** | `src/lib/usageDb.js` | Usage tracking + request details |

---

## 3. DOMAIN MODEL

### 3.1 Database Schema (SQLite — 11 tables)

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
│  │  models:JSON │   │  provider, model │   │  data (JSON)     │    │
│  │  kind        │   │  tokens, cost    │   │                  │    │
│  └──────────────┘   │  rtkSaved, meta  │   └──────────────────┘    │
│                     └──────────────────┘                           │
│  ┌──────────────┐                                                  │
│  │  usageDaily  │                                                  │
│  │  dateKey PK  │                                                  │
│  │  data (JSON) │                                                  │
│  └──────────────┘                                                  │
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
| 2 | **Chat Completion — Core Pipeline** | Preprocessing → translation → executor → stream | `open-sse/handlers/chatCore.js:42-432` |
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

**File**: `open-sse/handlers/chatCore.js` (lines 42-432)
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
  ├── 3. PrivacyEngine (line ~90)
  │     └── Mask API keys, passwords, tokens in request
  │
  ├── 4. Provider thinking override (line 69-79)
  │     └── mode "on/off" → extended thinking; "low/med/high" → reasoning_effort
  │
  ├── 5. RTK compression (line ~100-120)
  │     ├── compressMessages(): 21 filters auto-detect
  │     └── compressWithHeadroom(): external /v1/compress proxy (optional)
  │
  ├── 6. Caveman mode (line ~130)
  │     └── injectCaveman(): terse output system prompt
  │
  ├── 7. Ponytail mode (line ~140)
  │     └── injectPonytail(): YAGNI-first system prompt
  │
  ├── 8. CMEM injection (line ~155-170)
  │     └── CmemEngine.injectContext(): contextual memory từ FTS5
  │
  ├── 9. Format translation (line ~180-200)
  │     └── translateRequest(): source → OpenAI (intermediate) → target
  │
  ├── 10. Executor dispatch (line ~200-250)
  │      └── getExecutor(provider).execute({ body, credentials, stream })
  │      └── Upstream API call + SSE/JSON response
  │
  ├── 11. Response translation (line ~280-290)
  │      └── translateResponse(): provider chunks → client format
  │
  ├── 12. CMEM capture (line ~295-330)
  │      └── CmemEngine.captureObservation(): lưu observations
  │
  └── 13. Usage tracking (line ~350-400)
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

---

### Quy trình 3: Combo & Account Fallback

**Files**: `open-sse/services/combo.js`, `open-sse/services/accountFallback.js`
**Mô tả**: Tự động fallback qua nhiều models/accounts khi provider lỗi hoặc hết quota.

```
Model String → "my-coding-stack"
  │
  ├── Combo resolution: getComboModels("my-coding-stack")
  │   └── Returns: ["cc/claude-opus-4-7", "glm/glm-5.1", "kr/claude-sonnet-4.5"]
  │
  └── handleComboChat():
        ├── Try model 1: cc/claude-opus-4-7
        │     ├── Get credentials for "cc" (filter available)
        │     ├── Loop accounts:
        │     │     ├── Account A → handleSingleModelChat()
        │     │     │     ├── Success → done
        │     │     │     └── 429/401/403/5xx → markAccountUnavailable()
        │     │     └── Hết accounts → fallback model
        │     └── Error eligible → fallback
        │
        ├── Try model 2: glm/glm-5.1
        │     └── (same pattern)
        │
        └── Try model 3: kr/claude-sonnet-4.5
              └── (same pattern, hết → all unavailable)
```

**Fallback-eligible HTTP statuses**: 401, 402, 403, 429, 5xx
**Business Rules**:
- Account cooldown: `retryAfterMs` (nếu provider trả về) hoặc exponential backoff
- Combo strategy: "fallback" (từng model) hoặc "fusion" (song song + judge model)
- Fusion mode: gửi request đến nhiều models đồng thời, judge chọn response tốt nhất
- Combo sticky limit: optional sticky round-robin per combo

---

### Quy trình 4: OAuth Connection & Token Refresh

**Files**: `src/app/api/oauth/[provider]/[action]/route.js`, `open-sse/services/tokenRefresh.js`
**Mô tả**: Kết nối provider qua OAuth 2.0 PKCE hoặc device-code flow.

```
Dashboard UI → /api/oauth/{provider}/authorize
  │
  ├── 1. Generate PKCE challenge + state
  │
  ├── 2. Redirect user to provider OAuth page
  │
  ├── 3. User authorizes → callback → /api/oauth/{provider}/exchange
  │     └── Exchange authorization code for access_token + refresh_token
  │
  └── 4. Save providerConnection to DB
        └── data: { accessToken, refreshToken, expiresAt, ... }

In-request token refresh (chat.js:243):
  checkAndRefreshToken(provider, credentials)
    ├── accessToken còn hạn (buffer 5 phút)? → dùng tiếp
    └── sắp hết hạn? → refreshAccessToken():
          ├── Gọi provider refresh endpoint
          ├── Lưu new tokens vào DB
          └── Return updated credentials
```

**Business Rules**:
- Token expiry buffer: `TOKEN_EXPIRY_BUFFER_MS` = 5 phút trước hạn
- Provider-specific refresh: Claude, Codex, GitHub, Google, Qwen, iFlow, Copilot — mỗi provider có refresh logic riêng
- Có provider dùng device-code flow (Claude Code, Codex, Cursor) thay vì redirect
- Refresh token fail → đánh dấu account unavailable + `refreshError` tracking

---

### Quy trình 5: RTK Token Saver

**Files**: `open-sse/rtk/index.js`, `open-sse/rtk/filters/`
**Mô tả**: Nén tool_result content trong request messages trước khi gửi lên LLM. Mặc định ON.

```
compressMessages(body)
  │
  ├── 1. Scan tất cả messages
  │     └── Tìm tool_result blocks (content có type="tool_result")
  │
  ├── 2. Với mỗi tool_result:
  │     ├── autodetect(content):
  │     │     └── Đọc first 1KB → chọn filter
  │     │           ├── "git-diff" → gitDiffFilter
  │     │           ├── "grep" → grepFilter
  │     │           ├── "ls" → lsFilter (short/detail variants)
  │     │           ├── "tree" → treeFilter (depth-limited)
  │     │           ├── "dedup-log" → dedupLogFilter (loại dòng trùng)
  │     │           ├── "smart-truncate" → smartTruncateFilter
  │     │           └── + 15 filters khác
  │     └── applyFilter(content, filter):
  │           ├── Thành công + output < original → replace
  │           └── Lỗi/output >= original → keep nguyên bản
  │
  └── 3. Trả về body đã compress (mutated in-place)
```

**21 Filters**: git-diff, git-status, dedup-log, grep, find, ls-long, ls, smart-truncate, read-numbered, search-list, log-repeat, file-list, tree, code-block, whitespace-clean, duplicate-line, json-compact, yaml-compact, csv-compact, xml-compact, url-params

**Business Rules**:
- Auto-detect filter từ first 1KB content (fail-safe)
- Output > original → keep original (không làm lớn hơn)
- Skip `is_error` / `status: "error"` tool results (bảo toàn error trace)
- RTK chạy **trước** format translation (nên universal, không cần per-format adapters)
- Default ON, toggle qua Dashboard → Endpoint → Token Saver

---

### Quy trình 6: API Key Management

**Files**: `src/app/api/keys/*`, `src/shared/utils/apiKey.js`
**Mô tả**: Quản lý vòng đời API keys cho CLI tools truy cập 9Router.

```
Dashboard Admin → POST /api/keys
  │
  ├── 1. Generate API key
  │     └── HMAC(secret: API_KEY******** data: UUID + machineId + timestamp)
  │
  ├── 2. Save to apiKeys table
  │     └── id, key (hash), name, machineId, isActive, createdAt
  │
  └── 3. Return key plaintext (chỉ hiện 1 lần)

CLI Tool → Request /v1/* with Authorization: Bearer <key>
  └── isValidApiKey(key):
        ├── HMAC verify signature
        ├── Tìm key hash trong DB
        └── isActive=true → valid / invalid
```

---

### Quy trình 7: Provider CRUD

**Files**: `src/app/api/providers/`
**Mô tả**: CRUD provider connections, test kết nối, validate credentials.

```
Dashboard Admin → /api/providers
  │
  ├── GET /api/providers → list all connections
  │     └── Return: [{ id, provider, authType, name, testStatus, ... }]
  │
  ├── POST /api/providers → create connection
  │     └── Body: { provider, authType, data: { apiKey/token }, name }
  │     └── Save to providerConnections DB
  │
  ├── PUT /api/providers/{id} → update connection
  │
  ├── DELETE /api/providers/{id} → delete connection
  │
  ├── POST /api/providers/{id}/test → test connectivity
  │     └── Gửi request test → provider → update testStatus/lastError
  │
  └── POST /api/providers/validate → validate without save (dry-run)
```

---

### Quy trình 8: Usage & Cost Tracking

**Files**: `src/lib/usageDb.js`, `src/lib/db/repos/usageRepo.js`
**Mô tả**: Ghi log mọi request, tính cost, aggregate daily.

```
Sau mỗi request (chatCore.js post-stream)
  │
  ├── 1. Extract tokens từ upstream response
  │     └── prompt_tokens, completion_tokens (hoặc estimate fallback)
  │
  ├── 2. Calculate cost
  │     └── Pricing lookup: providerModels + user pricing overrides
  │
  ├── 3. Save usageHistory record
  │     └── { timestamp, provider, model, connectionId, apiKey,
  │            endpoint, promptTokens, completionTokens, cost,
  │            status, rtkSaved, meta }
  │
  └── 4. Upsert usageDaily aggregate
        └── Cộng dồn tokens/cost theo dateKey

Dashboard → /api/usage/*
  ├── GET /api/usage → monthly/weekly stats + breakdown
  ├── GET /api/usage/requests → paginated request log
  └── GET /api/usage/export → CSV export
```

---

### Quy trình 9: Cloud Sync

**Files**: `src/shared/services/cloudSyncScheduler.js`, `src/app/api/sync/cloud/route.js`
**Mô tả**: Đồng bộ cấu hình (providers, combos, keys, aliases) giữa nhiều thiết bị.

```
Enable (Dashboard → POST /api/sync/cloud?action=enable):
  ├── 1. Set cloudEnabled=true trong settings
  ├── 2. Ensure API key tồn tại (cho cloud auth)
  ├── 3. POST /sync/{machineId} → upload config lên cloud
  └── 4. GET /{machineId}/v1/verify → verify kết nối

Auto-sync (scheduler, mỗi 30 phút):
  CloudSyncScheduler
    └── POST /api/sync/cloud?action=sync
          ├── GET remote data từ cloud
          └── Update local tokens/status nếu mới hơn

Disable (Dashboard → POST /api/sync/cloud?action=disable):
  ├── cloudEnabled=false
  ├── DELETE /sync/{machineId}
  └── Reset ANTHROPIC_BASE_URL về local (nếu cần)
```

---

### Quy trình 10: CMEM Engine (Contextual Memory)

**Files**: `packages/cmem/`
**Mô tả**: Bộ nhớ ngữ cảnh — ghi nhớ observations từ conversation history để inject context vào request sau. Opt-in, disabled by default.

```
Pipeline hooks trong chatCore.js:

Pre-dispatch → injectContext():
  ├── Nhận: { messages, systemPrompt, cmemConfig }
  ├── Token budget check (cmemConfig.maxContextTokens)
  ├── FTS5 search: Match context với session ID
  ├── Format: OpenAI/Claude/Gemini-specific formatter
  └── Inject relevant observations vào system message

Post-response → captureObservation():
  ├── Extract observations từ response
  ├── Save to cmem_observations (FTS5 indexed)
  ├── Update cmem_sessions metadata
  └── Budget management: evict oldest nếu vượt threshold
```

**Engine components**: `CmemEngine` (entry), `MemoryStore` (DB ops), `Summarizer` (extract key info), `ContextBuilder` (build injection), `TokenBudget` (budget mgmt), `Observer` (trigger rules), `Injector` (format-specific injection)
**Storage**: SQLite FTS5 (`cmem_observations`, `cmem_sessions`, `cmem_context_cache`)

---

### Quy trình 11: Dashboard Login

**Files**: `src/app/api/auth/*`
**Mô tả**: Xác thực admin vào dashboard quản lý.

```
Browser → GET /login → render login form
  │
  └── Browser → POST /api/auth/login
        ├── First login: password =*= INITIAL_PASSWORD
        │     └── Hash + save to DB password_hash
        ├── Subsequent: bcrypt.compare(password, savedHash)
        └── Success → JWT.sign() → Set-Cookie (httpOnly, path=/)
```

---

## 7. API & INTEGRATION

### 7.1 API Endpoint Map

| Method | Path | Module | Mô tả |
|--------|------|--------|-------|
| POST | /v1/chat/completions | `src/app/api/v1/chat/completions/route.js` | Chat completions (OpenAI format) |
| POST | /v1/messages | `src/app/api/v1/messages/route.js` | Chat (Claude format) |
| POST | /v1/responses | `src/app/api/v1/responses/route.js` | OpenAI Responses API |
| GET | /v1/models | `src/app/api/v1/models/route.js` | Danh sách models |
| POST | /v1/embeddings | `src/app/api/v1/embeddings/route.js` | Embeddings |
| POST | /v1/images/generations | `src/app/api/v1/images/generations/route.js` | Image generation |
| POST | /v1/audio/speech | `src/app/api/v1/audio/speech/route.js` | Text-to-Speech |
| POST | /v1/audio/transcriptions | `src/app/api/v1/audio/transcriptions/route.js` | Speech-to-Text |
| POST | /v1/web/fetch | `src/app/api/v1/web/fetch/route.js` | Web fetch |
| POST | /v1/search | `src/app/api/v1/search/route.js` | Web search |
| POST | /api/auth/login | `src/app/api/auth/login/route.js` | Login |
| GET/POST/PUT/DELETE | /api/providers/* | `src/app/api/providers/` | Provider CRUD |
| GET/POST/PUT/DELETE | /api/keys/* | `src/app/api/keys/` | API key management |
| GET/POST/PUT/DELETE | /api/combos/* | `src/app/api/combos/` | Combo management |
| GET | /api/usage/* | `src/app/api/usage/` | Usage stats |
| GET/POST | /api/oauth/* | `src/app/api/oauth/` | OAuth flows |
| GET/POST | /api/settings/* | `src/app/api/settings/` | Settings management |
| POST | /api/sync/cloud | `src/app/api/sync/cloud/route.js` | Cloud sync control |

### 7.2 External Integrations

| Integration | Type | Provider Examples |
|-------------|------|------------------|
| Chat completions | HTTP/SSE | Claude, Codex, Kiro, GLM, Gemini, OpenAI |
| OAuth 2.0 PKCE | Auth flow | Claude Code, Codex, GitHub, Cursor, Kiro |
| Device-code flow | Auth flow | Claude Code, Codex, Cursor |
| API Key | Auth header | OpenAI, Anthropic, DeepSeek, Groq, 30+ providers |
| SSE streaming | Response | Tất cả providers |
| Web search | HTTP | Firecrawl, Jina Reader, Tavily, Exa, Serper |
| Cloud sync | HTTP/JSON | 9router.com (external service) |
| Web fetching | HTTP | Firecrawl, Jina, Tavily |

---

## 8. CẤU HÌNH & TRIỂN KHAI

### 8.1 Environment Variables

| Biến | Mặc định | Chức năng |
|------|---------|-----------|
| `JWT_SECRET` | auto-generated | HMAC secret for JWT (dashboard auth cookie) |
| `INITIAL_PASSWORD` | 123456 | Password first login |
| `DATA_DIR` | ~/.9router | SQLite DB location |
| `PORT` | 20128 | HTTP bind port |
| `HOSTNAME` | 0.0.0.0 | Bind host |
| `BASE_URL` | http://localhost:20128 | Server-side callback URL (cloud sync) |
| `CLOUD_URL` | https://9router.com | Cloud sync endpoint |
| `API_KEY_SECRET` | endpoint-proxy-api-key-secret | HMAC for API keys |
| `MACHINE_ID_SALT` | endpoint-proxy-salt | Machine ID hash salt |
| `ENABLE_REQUEST_LOGS` | false | Write request/response logs |
| `REQUIRE_API_KEY` | false | Enforce Bearer key on /v1/* |
| `OBSERVABILITY_ENABLED` | true | Telemetry |
| `AUTH_COOKIE_SECURE` | false | Secure cookie flag (set true behind HTTPS) |
| `NODE_ENV` | — | production/development |

### 8.2 Deployment Options

| Method | Command | Port |
|--------|---------|------|
| **Local dev** | `npm run dev` | 20127 |
| **Production** | `npm run build && npm run start` | 20128 |
| **Bun dev** | `npm run dev:bun` | 20127 |
| **Bun prod** | `npm run build:bun && npm run start:bun` | 20128 |
| **Docker** | `docker build -t 9router . && docker run -p 20128:20128 9router` | 20128 |
| **CLI** | `npm install -g 9router && 9router` | 20128 |

### 8.3 Database Layer

```
Storage: $DATA_DIR/db/data.sqlite
Backups: $DATA_DIR/db/backups/ (auto)

Driver chain (first available wins):
  bun:sqlite → better-sqlite3 → node:sqlite (Node 22.5+) → sql.js (WASM fallback)

Schema:
  11 tables: _meta, settings, providerConnections, providerNodes,
             proxyPools, apiKeys, combos, kv, usageHistory,
             usageDaily, requestDetails
  + CMEM: cmem_observations, cmem_sessions, cmem_context_cache (FTS5)
  Versioned migrations (current: v1)
```

---

## 9. PHỤ LỤC

### 9.1 Codebase Statistics

| Metric | Value |
|--------|-------|
| Provider registry files | 97 |
| Executors | 22 (+ DefaultExecutor) |
| Dashboard pages | 17 routes |
| DB tables | 11 + 3 CMEM |
| RTK filters | 21 |
| Format translators | 13 formats |
| Test suite | Vitest in `tests/` |
| Runtime | Node.js 18+ / Bun + Next.js 16 standalone |

### 9.2 Key Files Reference

| File | Lines | Vai trò |
|------|-------|---------|
| `src/sse/handlers/chat.js` | 313 | Entry — combo/account loop |
| `open-sse/handlers/chatCore.js` | 432 | Core pipeline orchestrator |
| `src/dashboardGuard.js` | 255 | Auth middleware (JWT + API key + CLI) |
| `src/lib/db/schema.js` | 159 | DB table definitions |
| `src/lib/db/repos/usageRepo.js` | ~820 | Usage tracking (largest repo) |
| `open-sse/config/providerModels.js` | ~920 | Model catalog |
| `open-sse/config/providers.js` | 68 | Provider barrel (from registry) |
| `next.config.mjs` | 81 | URL rewrites + standalone config |
| `src/app/api/v1/chat/completions/route.js` | 35 | Chat completions route |
| `custom-server.js` | — | Production HTTP server (IP extraction) |

### 9.3 Tech Debt & Known Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Stale `.orig` backup files | Low | `chat.js.orig`, `chatCore.js.orig`, `settingsRepo.js.orig` |
| OpenAI bridge lossy (thinking, images, tool ids, is_error) | Medium | `open-sse/translator/` |
| Duplicate exports lint errors | Low | `open-sse/config/providers.js`, `providerModels.js` |
| `registry/index.js` auto-generated, must regenerate manually | Low | `open-sse/providers/registry/index.js` |
| Build EPERM on Windows | Medium | Build pipeline |
| Tests fail on Windows (NODE_PATH syntax) | Medium | `tests/` |
| Merge conflict marker in page.js | Low | `src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/page.js` |

### 9.4 Glossary

| Thuật ngữ | Định nghĩa |
|-----------|-----------|
| **Combo** | Chuỗi models fallback theo thứ tự ưu tiên (subscription → cheap → free) |
| **Fusion** | Chiến lược combo chạy request song song đến nhiều models + judge |
| **RTK** | Token compression engine (21 content-aware filters, auto-detect) |
| **CMEM** | Contextual memory engine (FTS5 full-text search, opt-in) |
| **SSE** | Server-Sent Events — streaming response format |
| **Caveman** | Terse output mode — inject caveman-speak system prompt |
| **Ponytail** | YAGNI-first lazy senior dev system prompt (Lite/Full/Ultra) |
| **Headroom** | External `/v1/compress` proxy (optional, fail-open) |
| **PrivacyEngine** | Request sanitizer — mask API keys, passwords, tokens |
| **Executor** | Provider-specific HTTP + auth adapter |
| **Format Translation** | Source → OpenAI (intermediate) → target format |
| **Provider Node** | Custom OpenAI-compatible endpoint (self-hosted or third-party) |
| **OAuth PKCE** | Proof Key for Code Exchange — secure OAuth 2.0 flow |
| **Direct Route** | Skip OpenAI intermediate format (source → target directly) |

---

*Tài liệu được tạo từ phân tích codebase 9Router — Version 0.5.8*
*Nguồn: github.com/decolua/9router*
