# 9Router — Tài liệu Nghiệp vụ & Quy trình

> **Phiên bản**: 0.5.8 | **Cập nhật**: 2026-06-23  
> **Mục đích**: Tài liệu quy trình nghiệp vụ chuẩn từ phân tích codebase

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Hệ thống này làm gì?

9Router là **local AI routing gateway** — một proxy trung gian chạy trên máy người dùng, cung cấp endpoint OpenAI-compatible duy nhất (`/v1/*`) để:

- **Nhận request** từ các CLI tool AI (Claude Code, Codex, Cursor, Cline, OpenClaw...)
- **Dịch format** request (OpenAI ↔ Claude ↔ Gemini ↔ Kiro ↔ Cursor...)
- **Chọn provider** theo combo fallback 3-tier (Subscription → Cheap → Free)
- **Nén token** qua RTK (21 bộ lọc, tiết kiệm 20-40% input tokens)
- **Quản lý tài khoản** (OAuth tokens, API keys, multi-account round-robin)

### 1.2. Vấn đề kinh doanh giải quyết

| Vấn đề | Giải pháp |
|--------|-----------|
| Hết quota subscription giữa chừng | Auto fallback sang cheap/free providers |
| Tool outputs (git diff, grep) tốn tokens | RTK compression — 21 filters auto-detect |
| Phải chuyển đổi format thủ công | Format translation pipeline (13 formats) |
| Quản lý nhiều API keys rời rạc | Dashboard centralized credential management |
| OAuth tokens hết hạn | Auto refresh lifecycle |

### 1.3. Ai sử dụng?

- **Developer** — dùng CLI tools (Claude Code, Codex, OpenClaw, Cursor, Cline...)
- **Admin/Self-host** — quản lý providers, keys, usage qua Dashboard
- **Hệ thống** — cloud sync service đồng bộ cấu hình giữa các instance

### 1.4. Luồng nghiệp vụ cốt lõi

```
Developer Tool → POST /v1/chat/completions
  → 9Router route handler
    → Chọn provider theo combo fallback
    → Chọn account (round-robin)
    → Refresh token nếu cần
    → Nén tool_result (RTK)
    → Dịch format request
    → Gọi upstream provider
    → Dịch format response
    → Ghi usage history
  → SSE stream trả về cho tool
```

---

## 2. KIẾN TRÚC KỸ THUẬT

### 2.1. Kiến trúc 3 lớp

```
┌──────────────────────────────────────────────────────────────────┐
│  LỚP 1: API ROUTES (src/app/api/)                              │
│  ├── /api/v1/*       OpenAI/Claude/Gemini-compatible endpoints │
│  ├── /api/v1beta/*   Beta API endpoints                        │
│  ├── /api/*          Dashboard management APIs                 │
│  └── URL rewrites:  /v1/* → /api/v1/*  (next.config.mjs)      │
├──────────────────────────────────────────────────────────────────┤
│  LỚP 2: SSE + ROUTING CORE (open-sse/ + src/sse/)              │
│  ├── src/sse/handlers/chat.js         Entry: combo/account loop│
│  ├── open-sse/handlers/chatCore.js    Translation + executor   │
│  ├── open-sse/executors/              22 provider adapters     │
│  └── open-sse/services/               model, auth, fallback    │
├──────────────────────────────────────────────────────────────────┤
│  LỚP 3: TRANSLATION REGISTRY (open-sse/translator/)            │
│  ├── request/{from}-to-{to}.js  Source → OpenAI → Target      │
│  ├── response/{from}-to-{to}.js Target → OpenAI → Source      │
│  └── 13 formats: openai, claude, gemini, kiro, cursor, ...    │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2. Công nghệ

| Layer | Công nghệ |
|---|---|
| **Runtime** | Node.js 18+ / Bun |
| **Framework** | Next.js 16 (App Router, Webpack standalone output) |
| **UI** | React 19 + Tailwind CSS 4 |
| **State** | Zustand 5 |
| **Charts** | Recharts 3, @xyflow/react 12 |
| **DB** | SQLite (4-driver chain: bun → better-sqlite3 → node:sqlite → sql.js) |
| **Auth** | JWT cookie + HMAC API key + OAuth 2.0 (PKCE) |
| **Streaming** | Server-Sent Events (SSE) |

### 2.3. Module map (decision-critical)

```
src/
├── app/                     # Next.js pages + API routes
├── dashboardGuard.js        # Auth middleware (JWT/API key/CLI token)
├── lib/
│   ├── db/                  # SQLite layer
│   │   ├── driver.js        # Chain adapter (4 drivers)
│   │   ├── schema.js        # 11 tables + buildCreateTableSql
│   │   ├── migrations/      # Versioned schema migrations
│   │   ├── repos/           # 14 entity repos
│   │   └── migrate.js       # Migration runner
│   ├── localDb.js           # Barrel export for DB ops
│   ├── usageDb.js           # Usage/request logging
│   ├── oauth/               # OAuth credential manager
│   └── auth/                # Dashboard session
├── sse/
│   ├── handlers/chat.js     # Main entry: combo/account loop
│   ├── handlers/embeddings.js, imageGeneration.js, tts.js, stt.js, search.js, fetch.js
│   ├── services/auth.js     # Credential management
│   ├── services/model.js    # Model resolution + aliases
│   └── utils/logger.js      # Logging
├── shared/
│   ├── components/          # 47 shared UI components
│   ├── hooks/               # React hooks
│   ├── constants/           # Constants
│   └── services/            # API service wrappers
└── store/                   # 7 Zustand stores

open-sse/
├── config/                  # 14 config files
├── providers/registry/      # 97 provider definitions
├── handlers/chatCore.js     # Central dispatcher (432 lines)
├── executors/               # 22 provider executors
├── translator/              # Format conversion (request/, response/, schema/, concerns/, formats/)
├── rtk/                     # RTK token saver (21 filters, caveman, ponytail, headroom)
├── privacy/                 # PrivacyEngine (mask secrets)
├── services/                # model, provider, accountFallback, combo, tokenRefresh, responseCache
├── transformer/             # responsesTransformer, streamToJsonConverter
└── utils/                   # stream, sse, error, proxyFetch, bypassHandler

packages/
├── cmem/                    # Contextual memory engine (FTS5, opt-in)
├── components/              # Isolated UI packages
├── validation/              # Validation schemas
├── kira-ai/                 # Kiro AI integration
├── mcpServer/               # MCP server
├── provider-alert/          # Provider alert notifications
├── revidapi/                # RevID API integration
└── utils/                   # Shared utilities

cli/                         # CLI package (CommonJS, esbuild)
├── src/cli/                 # CLI source
├── hooks/postinstall.js     # Runtime deps installation
└── scripts/build-cli.js     # Build script

tests/                       # Vitest test suite
├── unit/                    # Unit tests
├── translator/              # Translation coverage
├── real/                    # Real provider tests (RUN_REAL=1)
└── vitest.config.js         # Config with path aliases
```

### 2.4. Path aliases (jsconfig.json)

| Alias | Resolved to |
|---|---|
| `@/*` | `./src/*` |
| `open-sse/` | `./open-sse` |
| `open-sse/*` | `./open-sse/*` |
| `@9router/*` | `./packages/*` |

---

## 3. DOMAIN MODEL (Mô hình nghiệp vụ)

### 3.1. Entities

Dựa trên SQLite schema (`src/lib/db/schema.js` + `open-sse/providers/registry/`):

| Entity | Table/File | Mô tả |
|--------|-----------|-------|
| **Settings** | `settings` | Cấu hình toàn cục (1 row, JSON blob) |
| **Provider** | `providers/registry/{id}.js` | Định nghĩa provider (transport, oauth, models, capabilities) |
| **ProviderConnection** | `providerConnections` | Tài khoản provider (API keys, OAuth tokens, priority, status) |
| **ProviderNode** | `providerNodes` | Custom compatible node (baseUrl, apiType) |
| **ApiKey** | `apiKeys` | API key sinh ra để auth cho CLI tools |
| **Combo** | `combos` | Fallback chain (sequence of models) |
| **ModelAlias** | `kv` (scope="alias") | Model alias mapping |
| **ProxyPool** | `proxyPools` | Proxy pool configs |
| **UsageEntry** | `usageHistory` | Usage log (tokens, cost, status, provider) |
| **UsageDaily** | `usageDaily` | Daily aggregated usage |
| **RequestDetail** | `requestDetails` | Full request/response log |

### 3.2. Entity Relationships

```
Settings (1) ── controls ──→ ProviderConnection
ProviderNode ── backs ──→ ProviderConnection
ProviderConnection ── emits ──→ UsageEntry
Provider (registry) ── instantiated_by ──→ ProviderConnection
Combo ── contains ──→ Model list (references ProviderConnection)
ApiKey ── authenticates ──→ CLI Tools
```

### 3.3. Provider categories

| Category | Ví dụ | Auth type |
|---|---|---|
| **OAuth Subscription** | Claude Code, Codex, GitHub Copilot, Cursor, Antigravity | OAuth 2.0 PKCE + device code |
| **API Key Pay-per-use** | OpenAI, Anthropic, DeepSeek, Groq, xAI, GLM, MiniMax | Static API key |
| **Free** | Kiro AI, OpenCode Free, Vertex ($300 credits) | OAuth / No auth |
| **Self-hosted** | Ollama Local, Custom OpenAI-compatible | Custom base URL + optional key |

---

## 4. ACTORS & PERMISSIONS

### 4.1. Actors

| Actor | Vai trò | Mô tả |
|-------|---------|-------|
| **Developer (CLI User)** | Người dùng cuối | Gửi request từ CLI tool, nhận response SSE |
| **Dashboard Admin** | Quản trị viên | Quản lý providers, keys, usage, settings |
| **Cloud Sync Service** | Hệ thống bên ngoài | Đồng bộ config giữa các instances |
| **OAuth Provider** | Bên thứ ba | Auth server (Claude, GitHub, Google, AWS) |

### 4.2. Permission model

Xem `src/dashboardGuard.js`:

| Route | Auth required | Ghi chú |
|---|---|---|
| `/api/health`, `/api/init`, `/api/version` | Public | No auth |
| `/v1/*`, `/v1beta/*` | Optional API key | Key enforcement via `requireApiKey` setting |
| `/api/settings`, `/api/providers*` | JWT required | Dashboard auth cookie |
| `/api/shutdown` | Always JWT | Always protected |

### 4.3. Auth mechanisms

| Mechanism | Implementation | File |
|---|---|---|
| **JWT cookie** | Verify `token` cookie, HS256 signing | `src/lib/auth/dashboardSession.js` |
| **API key (Bearer)** | HMAC-SHA256 verification | `src/shared/utils/apiKey.js` |
| **CLI token** | Machine-ID based (header `x-9r-cli-token`) | `src/dashboardGuard.js:6-19` |
| **OAuth 2.0** | PKCE + device code per provider | `src/app/api/oauth/[provider]/` |

---

## 5. DANH SÁCH QUY TRÌNH NGHIỆP VỤ

| ID | Quy trình | Modality | Mô tả |
|----|-----------|----------|-------|
| **BP-01** | Chat Completion Request | Chat | Luồng chính: tool gửi prompt → fallback → translate → execute → stream |
| **BP-02** | Combo Fallback | Chat | Multi-model fallback chain (subscription → cheap → free) |
| **BP-03** | Account Fallback | Chat | Multi-account round-robin per provider |
| **BP-04** | OAuth Token Refresh | Auth | Refresh credentials trước khi expire |
| **BP-05** | RTK Token Compression | Pre-process | 21 filters nén tool_result tự động |
| **BP-06** | Format Translation | Translation | Source → OpenAI → Target (lossy bridge) |
| **BP-07** | Provider Connection | Provisioning | Thêm/xóa/sửa provider credentials |
| **BP-08** | Cloud Sync | Sync | Đồng bộ config giữa các instances |
| **BP-09** | Usage Tracking | Observability | Ghi log token, cost, status |
| **BP-10** | Image Generation | Generation | Text-to-image qua providers |
| **BP-11** | Embeddings | Embedding | Text vectorization |
| **BP-12** | TTS / STT | Audio | Text-to-speech / Speech-to-text |
| **BP-13** | Web Search / Fetch | Search | Web search + fetch từ providers |
| **BP-14** | CMEM Contextual Memory | Memory | Lưu context + inject vào request |

---

## 6. CHI TIẾT TỪNG QUY TRÌNH

---

### BP-01: Chat Completion Request

**File**: `src/sse/handlers/chat.js`, `open-sse/handlers/chatCore.js`

**Trigger**: `POST /v1/chat/completions` từ CLI tool

**Workflow**:

```
1. Route nhận request (src/app/api/v1/chat/completions/route.js)
2. Parse JSON body + headers
3. Auth: check API key nếu requireApiKey=true
4. Model resolution:
   a. Nếu là combo name    → BP-02 (Combo Fallback)
   b. Nếu là single model  → parseModel → { provider, model }
5. Account selection (BP-03):
   a. getProviderCredentials(provider, excludeConnectionIds, model)
   b. Check rate limit + cooldown
   c. checkAndRefreshToken() (BP-04)
6. HandleChatCore:
   a. Detect source format (detectFormat)
   b. PrivacyEngine: mask secrets
   c. Preprocess: contentCleaner + contextPruner
   d. Provider thinking config injection
   e. RTK compress (BP-05)
   f. Headroom proxy (optional)
   g. Caveman/Ponytail injection
   h. translateRequest() (BP-06)
   i. getExecutor().execute() → upstream API call
   j. translateResponse()
   k. Usage tracking (BP-09)
   l. CMEM capture (BP-14)
7. Return SSE stream / JSON response
```

**Business rules**:
- `bypassRequest` — warmup/naming requests được bypass (không tốn account rotation)
- `responseCacheEnabled` — cache identical responses (LRU)
- `stripUnsupportedModalities` — loại bỏ modalities provider không hỗ trợ
- `prefetchRemoteImages` — prefetch images trước khi gửi lên upstream

**Error handling**:
| Error | Hành động |
|---|---|
| 401/403 | refreshCredentials() + retry |
| 402/429 | Mark account unavailable + fallback |
| Other | Return error response |

---

### BP-02: Combo Fallback

**File**: `open-sse/services/combo.js`

**Trigger**: Model string là combo name (e.g., "premium-coding")

**Workflow**:

```
1. getComboModels(modelStr) → đọc từ DB combos table
2. Kiểm tra strategy:
   a. "fallback" (default) → handleComboChat
   b. "fusion"            → handleFusionChat
3. Fallback strategy:
   a. Duyệt models theo thứ tự
   b. Mỗi model → handleSingleModelChat()
   c. Nếu fallback-eligible error → thử model tiếp theo
   d. Hết models → return error
4. Fusion strategy:
   a. Gửi request đến tất cả models đồng thời
   b. Judge model chọn response tốt nhất
```

**Business rules**:
- `comboStickyRoundRobinLimit` — sticky connection per combo
- Fallback-eligible codes: 401, 402, 403, 429, 5xx, network errors
- Cooldown with exponential backoff per account
- Combo có thể có strategy riêng (override global)

---

### BP-03: Account Fallback

**File**: `src/sse/services/auth.js`, `open-sse/services/accountFallback.js`

**Trigger**: Account bị lỗi (quota, rate limit, auth)

**Workflow**:

```
1. getProviderCredentials(provider, excludeConnectionIds, model)
   → Chọn account active với lowest priority
   → Skip accounts trong exclude set
   → Kiểm tra rateLimitedUntil
   → Nếu tất cả rate limited → return allRateLimited
2. Nếu request thành công:
   → clearAccountError(connectionId)
3. Nếu request thất bại:
   → markAccountUnavailable(connectionId, status, error, provider, model, resetsAtMs)
   → Tính cooldown: exponential backoff hoặc precise resetsAtMs
   → Nếu shouldFallback=true → thử account tiếp theo
   → Hết accounts → thử combo model tiếp theo (BP-02)
```

**Business rules**:
- Provider config: maxRetries per account
- Cooldown min: 5s, max: 300s (exponential backoff)
- Quota reset có thể provider-specified (e.g., 5-hour rolling, daily)
- `allRateLimited` → `retryAfterHuman` message cho user

---

### BP-04: OAuth Token Refresh

**File**: `open-sse/services/tokenRefresh.js`, `src/sse/services/tokenRefresh.js`

**Trigger**: Pre-request check hoặc 401 response

**Workflow**:

```
1. checkAndRefreshToken(provider, credentials)
2. Tính expiry buffer: TOKEN_EXPIRY_BUFFER_MS (5 min trước hạn)
3. Nếu token sắp hết hạn:
   a. refreshAccessToken(provider, refreshToken)
   b. Lưu credentials mới vào DB
   c. Cập nhật providerSpecificData
4. Nếu 401 khi execute:
   a. refreshWithRetry() (trong chatCore.js)
   b. Retry request với token mới
```

**Supported providers**:
| Provider | Refresh method |
|---|---|
| Claude Code | refreshClaudeOAuthToken |
| Google (Gemini) | refreshGoogleToken |
| Codex | refreshCodexToken |
| iFlow | refreshIflowToken |
| GitHub | refreshGitHubToken |
| Qwen | refreshQwenToken |
| Generic | refreshTokenByProvider |

---

### BP-05: RTK Token Compression

**File**: `open-sse/rtk/index.js`

**Trigger**: Trong chatCore.js, trước translateRequest()

**Workflow**:

```
1. Duyệt từng message.content (array items)
2. Với mỗi tool_result block:
   a. Đọc content (string hoặc JSON)
   b. autoDetect(content) từ first 1KB
   c. Áp dụng filter phù hợp:

   Filters (21 cái):
   ├── git-diff          Nén diff hunks
   ├── git-status        Nén status output
   ├── grep              Nén grep results
   ├── find              Nén find results
   ├── ls                Nén directory listings
   ├── tree              Nén tree output
   ├── dedup-log         Dedup log lines
   ├── smart-truncate    Thông minh truncate
   ├── read-numbered     Nén numbered lines
   ├── search-list       Nén search results
   ├── json-compact      Compact JSON
   ├── ...               (21 total)

   d. Nếu filter không áp dụng / throw / lỗi → giữ nguyên
4. Caveman mode (6 levels):
   ├── level-0: Off
   ├── level-1: Light one-liners
   ├── level-2: Medium
   ├── level-3: High
   ├── level-4: Ultra (max compression)
   └── cave: Caveman-speak (reduce output tokens up to 65%)
5. Ponytail mode (3 levels):
   ├── Lite: suggest lazier alternatives
   ├── Full: YAGNI ladder enforcement
   └── Ultra: deletion-first, extremist YAGNI
6. Headroom (optional): external /v1/compress proxy
```

**Business rules**:
- `fail-open`: mọi lỗi trong RTK không được break request
- RTK skip `is_error` tool results (preserve error traces)
- Default ON (Dashboard → Endpoint settings)
- Chạy trước format translation → universal across all formats

---

### BP-06: Format Translation

**File**: `open-sse/translator/index.js`

**Trigger**: Trong chatCore.js, giữa RTK và executor dispatch

**Workflow**:

```
1. detectFormat(body) → source format
   ├── Dựa trên body shape (messages[], input[], system, ...)
   ├── Hoặc sourceFormatOverride từ endpoint path
2. getTargetFormat(provider) → target format
   ├── Từ provider registry
   ├── Hoặc modelTargetFormat (model-specific)
3. translateRequest(body, sourceFormat, targetFormat):
   a. Nếu source === target → passthrough
   b. Nếu có direct route (e.g., claude→kiro) → dùng ngay
   c. Nếu không → source→openai→target (OpenAI bridge)
4. executor.execute(transformedBody)
5. translateResponse(chunk, sourceFormat, targetFormat):
   a. target→openai→source
   b. SSE chunk transformation
```

**Supported formats (13)**:
| Format | Sử dụng bởi |
|---|---|
| `openai` | OpenAI, OpenRouter, vô số API key providers |
| `claude` | Claude Code, Anthropic API |
| `gemini` | Google Gemini API |
| `gemini-cli` | Gemini CLI (OAuth) |
| `openai-responses` | OpenAI Responses API, Codex CLI |
| `antigravity` | Antigravity IDE |
| `kiro` | Kiro AI (binary AWS EventStream) |
| `cursor` | Cursor IDE (protobuf ConnectRPC) |
| `ollama` | Ollama local |
| `vertex` | Google Vertex AI |
| `commandcode` | Codebuddy commandcode (NDJSON) |
| `codex` | Codex CLI |
| `mmf` | Mimo Free |

**Known bridge limitations**:
- OpenAI bridge loses: thinking blocks, non-base64 images, tool ids, is_error
- Direct routes (e.g., claude→kiro, claude→opencode-go) skip double-hop

---

### BP-07: Provider Connection

**File**: `src/app/api/providers/`, `src/app/api/oauth/[provider]/`

**Trigger**: Người dùng thêm provider mới qua Dashboard

**Workflow**:

```
OAuth provider:
1. User click "Connect" → /api/oauth/[provider]/authorize
2. Tạo OAuth flow (PKCE / device code)
3. User authorize ở provider website
4. Callback → /api/oauth/[provider]/exchange
5. Lưu tokens vào DB (providerConnections)
6. Test connection → /api/providers/[id]/test

API key provider:
1. User nhập API key
2. Lưu vào DB (providerConnections)
3. Test connection

Custom node:
1. User nhập baseUrl + apiType
2. Lưu vào providerNodes
3. Registry vào provider list
```

---

### BP-08: Cloud Sync

**File**: `src/app/api/sync/cloud/route.js`, `src/shared/services/cloudSyncScheduler.js`

**Trigger**: User enable cloud sync trong Dashboard

**Workflow**:

```
Enable sync:
1. set cloudEnabled=true
2. Đảm bảo API key tồn tại
3. POST /sync/{machineId} → push providers, aliases, combos, keys
4. GET /verify → verify endpoint
5. Bắt đầu scheduler (periodic sync)

Periodic sync:
1. POST /sync/{machineId} (từ scheduler)
2. Sync remote → local (newer tokens/status)
3. Update local DB

Disable sync:
1. set cloudEnabled=false
2. DELETE /sync/{machineId}
3. Switch ANTHROPIC_BASE_URL về local (nếu cần)
```

---

### BP-09: Usage Tracking

**File**: `src/lib/usageDb.js`, `src/lib/db/repos/usageRepo.js`

**Trigger**: Sau mỗi request hoàn thành

**Workflow**:

```
1. trackPendingRequest() → tạo pending record
2. appendRequestLog(response, modelInfo):
   a. Extract prompt_tokens, completion_tokens từ response
   b. Tính cost từ pricing data
   c. Ghi vào usageHistory table
   d. Tính RTK saved tokens
3. saveRequestDetail(request, response):
   a. Ghi full request + response vào requestDetails table
   b. Chỉ khi ENABLE_REQUEST_LOGS=true
4. Cập nhật usageDaily:
   a. Aggregate theo ngày
   b. Usage analytics cho Dashboard
```

---

## 7. API & INTEGRATION

### 7.1. External API Endpoints

#### Compatibility APIs (OpenAI-compatible)

| Method | Path | Mô tả |
|--------|------|-------|
| `POST` | `/v1/chat/completions` | Chat completions |
| `POST` | `/v1/messages` | Claude-format messages |
| `POST` | `/v1/responses` | OpenAI Responses API |
| `GET` | `/v1/models` | List models |
| `POST` | `/v1/embeddings` | Text embeddings |
| `POST` | `/v1/images/generations` | Image generation |
| `POST` | `/v1/audio/speech` | Text-to-speech |
| `POST` | `/v1/audio/transcriptions` | Speech-to-text |
| `POST` | `/v1/web/fetch` | Web fetch |
| `POST` | `/v1/search` | Web search |
| `POST` | `/v1beta/models` | Beta models listing |

#### Management APIs (Dashboard)

| Domain | Path prefix | Mô tả |
|--------|-------------|-------|
| Auth | `/api/auth/*` | Login, logout, status, OIDC |
| Providers | `/api/providers*` | CRUD + test + validate |
| OAuth | `/api/oauth/*` | Authorize, exchange, poll |
| Keys | `/api/keys*` | API key lifecycle |
| Combos | `/api/combos*` | Fallback combo management |
| Settings | `/api/settings/*` | App settings, cmem, rtk, privacy |
| Usage | `/api/usage/*` | Usage stats + details |
| Sync | `/api/sync/*` | Cloud sync lifecycle |
| CLI Tools | `/api/cli-tools/*` | CLI config generators |
| Models | `/api/models/*` | Model management + aliases |
| Pricing | `/api/pricing` | Pricing overrides |
| Tags | `/api/tags/*` | Provider tagging |
| Proxy Pools | `/api/proxy-pools*` | Proxy management |

### 7.2. Internal integrations

| Integration | Cơ chế | File |
|---|---|---|
| **SQLite** | In-process driver chain | `src/lib/db/driver.js` |
| **Upstream providers** | HTTP (fetch + proxyFetch) | `open-sse/executors/*` |
| **Headroom** | External HTTP proxy (optional) | `open-sse/rtk/headroom.js` |
| **Cloud sync** | REST API calls | `src/shared/services/cloudSyncScheduler.js` |
| **Response cache** | In-memory LRU | `open-sse/services/responseCache.js` |

### 7.3. Provider executors (22)

| Executor | Provider | Transport |
|---|---|---|
| `antigravity.js` | Antigravity | HTTP |
| `azure.js` | Azure OpenAI | HTTP |
| `codebuddy-cn.js` | Codebuddy CN | HTTP |
| `codex.js` | Codex CLI | HTTP |
| `commandcode.js` | CommandCode | HTTP (NDJSON) |
| `cursor.js` | Cursor IDE | HTTP (protobuf) |
| `default.js` | Generic OpenAI-compatible | HTTP |
| `gemini-cli.js` | Gemini CLI | HTTP |
| `github.js` | GitHub Copilot | HTTP |
| `grok-web.js` | Grok Web | HTTP |
| `iflow.js` | iFlow | HTTP |
| `kiro.js` | Kiro AI | HTTP (AWS EventStream) |
| `mimo-free.js` | Mimo Free | HTTP |
| `ollama-local.js` | Ollama | HTTP |
| `opencode.js` | OpenCode Free | HTTP |
| `opencode-go.js` | OpenCode Go | HTTP |
| `perplexity-web.js` | Perplexity Web | HTTP |
| `qoder.js` | Qoder | HTTP |
| `qwen.js` | Qwen | HTTP |
| `vertex.js` | Vertex AI | HTTP |
| `xiaomi-tokenplan.js` | Xiaomi Tokenplan | HTTP |

---

## 8. CẤU HÌNH & TRIỂN KHAI

### 8.1. Dev setup

```bash
cp .env.example .env
npm install
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev
```

### 8.2. Build & Start

```bash
npm run build
PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start
```

**Output**: Next.js standalone (`./.next/standalone`)

### 8.3. Docker

```bash
docker run -d \
  --name 9router \
  -p 20128:20128 \
  -v "$HOME/.9router:/app/data" \
  -e DATA_DIR=/app/data \
  decolua/9router:latest
```

Multi-arch: `linux/amd64` + `linux/arm64`

### 8.4. Environment variables

| Variable | Default | Purpose | Required |
|---|---|---|---|
| `JWT_SECRET` | auto-gen `~/.9router/jwt-secret` | JWT signing | ✓ |
| `INITIAL_PASSWORD` | `123456` | First login | |
| `DATA_DIR` | `~/.9router` | DB location | |
| `PORT` | 20128 | HTTP port | |
| `HOSTNAME` | `0.0.0.0` | Bind host | |
| `BASE_URL` | `http://localhost:20128` | Internal base URL | |
| `CLOUD_URL` | `https://9router.com` | Cloud sync endpoint | |
| `API_KEY_SECRET` | HMAC key | API key signing | |
| `MACHINE_ID_SALT` | Hash salt | Machine ID | |
| `ENABLE_REQUEST_LOGS` | `false` | Request logging | |
| `REQUIRE_API_KEY` | `false` | Enforce API key on /v1/* | |
| `AUTH_COOKIE_SECURE` | `false` | Secure cookie | |

### 8.5. Auth setup

1. Dashboard: `INITIAL_PASSWORD` (default `123456`)
2. JWT auto-generated tại `~/.9router/jwt-secret`
3. API key: sinh từ Dashboard → API Keys
4. Providers: OAuth login hoặc API key

### 8.6. CLI setup

```bash
# Install 9router CLI (npm published package)
npm install -g 9router
9router

# Then point CLI tools to localhost:20128

# Claude Code
echo '{"anthropic_api_base":"http://localhost:20128/v1","anthropic_api_key":"your-key"}' > ~/.claude/config.json

# Codex CLI
export OPENAI_BASE_URL="http://localhost:20128"
export OPENAI_API_KEY="your-key"

# Cursor IDE
# Settings → Models → OpenAI API Base URL: http://localhost:20128/v1
```

### 8.7. Database

- **Driver chain**: bun:sqlite → better-sqlite3 → node:sqlite → sql.js
- **Location**: `${DATA_DIR}/db/data.sqlite`
- **Backups**: `${DATA_DIR}/db/backups/`
- **Migrations**: versioned, additive (không destructive)
- **Tables**: 11 (settings, providerConnections, apiKeys, combos, usageHistory, usageDaily, requestDetails, providerNodes, proxyPools, kv, _meta)

---

## 9. PHỤ LỤC

### 9.1. File index

| Khu vực | Số file | Mô tả |
|---|---|---|
| `src/app/` | ~60+ | Pages + API routes |
| `open-sse/` | ~150+ | SSE engine, executors, translator, RTK |
| `src/lib/` | ~30 | DB, auth, oauth, utils |
| `packages/` | ~40 | cmem, components, validation, etc. |
| `src/shared/` | ~60 | Components, hooks, services |
| `cli/` | ~10 | CLI package |
| `tests/` | ~50 | Test files |

### 9.2. Known technical debt

| Issue | Location |
|---|---|
| `chat.js.orig` stale backup | `src/sse/handlers/chat.js.orig` |
| `chatCore.js.orig` stale backup | `open-sse/handlers/chatCore.js.orig` |
| `settingsRepo.js.orig` stale backup | `src/lib/db/repos/settingsRepo.js.orig` |
| OpenAI bridge lossy | `open-sse/translator/` — thinking, images, tool ids, is_error lost |
| Duplicate exports | `open-sse/config/providers.js`, `providerModels.js` (lint issues) |
| `registry/index.js` auto-generated | Must regenerate after adding new provider files |

### 9.3. Known bugs (translator)

| Bug | Source | Format |
|---|---|---|
| Claude image `source.type="url"` dropped | `request/claude-to-openai.js:133-141` | Claude |
| `tool_result.is_error` lost | `request/claude-to-openai.js:155-173` | Claude |
| `thinking` blocks dropped | `request/claude-to-openai.js:128` | Claude |
| Always injects "You are Claude Code" | `request/openai-to-claude.js:124-134` | OpenAI→Claude |
| `tool_choice:"none"` → `auto` | `request/openai-to-claude.js:298` | OpenAI→Claude |
| Only last system message kept | `request/openai-to-gemini.js:92-96` | Gemini |
| `max_tokens` hardcoded to 32000 | `request/openai-to-kiro.js:309` | Kiro |

### 9.4. Security considerations

- Provider secrets persisted in SQLite (filesystem protection needed)
- JWT secret auto-generated: override for multi-instance sharing
- API key HMAC secret: protect from unauthorized key generation
- Cloud sync: API key + machine ID authentication
- Dashboard cookie: Secure flag when behind HTTPS reverse proxy
- Logs (`logs/`) contain full request/response when enabled

### 9.5. Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| **Provider** | AI service provider (OpenAI, Anthropic, Kiro, etc.) |
| **Executor** | HTTP adapter for a specific provider |
| **Combo** | Ordered list of models for fallback |
| **RTK** | Real-Time Token killer — tool_result compression |
| **Caveman** | System prompt injection for terse output |
| **Ponytail** | Lazy senior developer prompt (YAGNI enforcement) |
| **CMEM** | Contextual Memory — FTS5-based memory engine |
| **Headroom** | External compression proxy |
| **Format translation** | Convert request/response between provider formats |
| **SSE** | Server-Sent Events — streaming response |
| **OAuth** | Open Authorization — provider login via 3rd party |
| **Standalone** | Next.js output mode — single server bundle |
| **jsconfig.json** | Path aliases config (ESM bundler resolution) |
