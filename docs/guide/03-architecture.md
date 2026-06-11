# Kiến trúc hệ thống

## Kiến trúc 3 lớp

9Router được tổ chức theo kiến trúc 3 lớp:

```
Lớp 1: API Routes (src/app/api/*)
  → /v1/*   OpenAI-compatible endpoints
  → /api/*  Dashboard management APIs

Lớp 2: SSE + Routing Core (open-sse/ + src/sse/)
  → Request parsing, combo iteration, account fallback
  → Translation orchestration, executor dispatch

Lớp 3: Translation Registry (open-sse/translator/)
  → Request body conversion (source → OpenAI → target)
  → Response stream normalization (target → OpenAI → source)
```

## Thành phần chính

### 1. API và Routing Layer (Next.js App Routes)

**Đường dẫn**: `src/app/api/`

- `/v1/*` và `/v1beta/*` - Compatibility APIs cho CLI tools
- `/api/*` - Management APIs cho dashboard
- URL rewrites trong `next.config.mjs` map `/v1/*` → `/api/v1/*`

**Các route chính**:

| Route | File | Mô tả |
|-------|------|-------|
| `POST /v1/chat/completions` | `src/app/api/v1/chat/completions/route.js` | Chat completion (OpenAI format) |
| `POST /v1/messages` | `src/app/api/v1/messages/route.js` | Chat (Claude format) |
| `POST /v1/responses` | `src/app/api/v1/responses/route.js` | OpenAI Responses API |
| `GET /v1/models` | `src/app/api/v1/models/route.js` | Danh sách models |
| `POST /v1/embeddings` | `src/app/api/v1/embeddings/route.js` | Embeddings |
| `POST /v1/images/generations` | `src/app/api/v1/images/generations/route.js` | Image generation |
| `POST /v1/audio/speech` | `src/app/api/v1/audio/speech/route.js` | Text-to-Speech |
| `POST /v1/audio/transcriptions` | `src/app/api/v1/audio/transcriptions/route.js` | Speech-to-Text |
| `POST /v1/web/fetch` | `src/app/api/v1/web/fetch/route.js` | Web fetch |
| `POST /v1/search` | `src/app/api/v1/search/route.js` | Web search |

### 2. SSE Core

**Đường dẫn**: `open-sse/` (module độc lập, ~1000KB code)

| Thành phần | Mô tả |
|------------|-------|
| `handlers/chatCore.js` | Điều phối format detection → preprocessing → RTK → translation → executor dispatch |
| `handlers/chatCore/nonStreamingHandler.js` | Xử lý response non-streaming |
| `handlers/chatCore/streamingHandler.js` | Xử lý SSE streaming |
| `handlers/chatCore/sseToJsonHandler.js` | Chuyển SSE → JSON khi provider force streaming |
| `handlers/embeddingsCore.js` | Embeddings handling |
| `handlers/imageGenerationCore.js` | Image generation handling |
| `handlers/sttCore.js` | Speech-to-text handling |
| `handlers/ttsCore.js` | Text-to-speech handling |
| `handlers/responsesHandler.js` | OpenAI Responses API handling |
| `handlers/search/` | Web search (10 provider callers + response normalizers) |
| `handlers/fetch/` | Web fetch (firecrawl, jina-reader, tavily, exa) |

**src/sse/ (Next.js integration layer)**:

| File | Mô tả |
|------|-------|
| `handlers/chat.js` | Entry point chính: parse body, combo iteration, account fallback loop |
| `handlers/embeddings.js` | Embeddings handler |
| `handlers/imageGeneration.js` | Image generation handler |
| `handlers/tts.js` | TTS handler |
| `handlers/stt.js` | STT handler |
| `handlers/fetch.js` | Web fetch handler |
| `handlers/search.js` | Web search handler |
| `services/auth.js` | Credential management, account selection, fallback |
| `services/model.js` | Model parsing, alias resolution |
| `services/tokenRefresh.js` | Token refresh lifecycle (wrapper over open-sse) |
| `utils/logger.js` | Logging utility |

### 3. Provider Executors

**Đường dẫn**: `open-sse/executors/`

Mỗi executor là một adapter HTTP + auth cho từng provider (19 executors):

| Executor | Provider | Ghi chú |
|----------|----------|---------|
| `antigravity.js` | Antigravity | Google Cloud Code IDE |
| `azure.js` | Azure | Azure OpenAI |
| `gemini-cli.js` | Gemini CLI | Google Gemini CLI |
| `github.js` | GitHub | GitHub Copilot |
| `iflow.js` | iFlow | iFlow API |
| `qoder.js` | Qoder | Qoder API |
| `qwen.js` | Qwen | Qwen API |
| `kiro.js` | Kiro | Kiro AI (free Claude) |
| `codex.js` | Codex | OpenAI Codex CLI |
| `cursor.js` | Cursor | Cursor IDE (alias: `cu`) |
| `vertex.js` | Vertex | Google Vertex AI |
| `opencode.js` | OpenCode | OpenCode Free |
| `opencode-go.js` | OpenCode Go | OpenCode Go (minimax models → claude) |
| `grok-web.js` | Grok Web | xAI Grok (web) |
| `perplexity-web.js` | Perplexity Web | Perplexity (web) |
| `ollama-local.js` | Ollama Local | Local Ollama |
| `commandcode.js` | Command Code | Command Code |
| `xiaomi-tokenplan.js` | Xiaomi Token Plan | Xiaomi AI |
| `default.js` | All others | Standard OpenAI-compatible |

### 4. Translation Registry

**Đường dẫn**: `open-sse/translator/`

**Request translators** (source → OpenAI → target):

| Translator | Source → Target |
|------------|----------------|
| `claude-to-openai.js` | Claude → OpenAI |
| `openai-to-claude.js` | OpenAI → Claude |
| `gemini-to-openai.js` | Gemini → OpenAI |
| `openai-to-gemini.js` | OpenAI → Gemini |
| `openai-to-vertex.js` | OpenAI → Vertex |
| `antigravity-to-openai.js` | Antigravity → OpenAI |
| `openai-responses.js` | OpenAI Responses → OpenAI Chat |
| `openai-to-kiro.js` | OpenAI → Kiro |
| `openai-to-cursor.js` | OpenAI → Cursor |
| `openai-to-ollama.js` | OpenAI → Ollama |
| `openai-to-commandcode.js` | OpenAI → Command Code |

**Response translators** (target → OpenAI → source):

| Translator | Source → Target |
|------------|----------------|
| `claude-to-openai.js` | Claude → OpenAI |
| `openai-to-claude.js` | OpenAI → Claude |
| `gemini-to-openai.js` | Gemini → OpenAI |
| `openai-to-antigravity.js` | OpenAI → Antigravity |
| `openai-responses.js` | OpenAI Responses |
| `kiro-to-openai.js` | Kiro → OpenAI |
| `cursor-to-openai.js` | Cursor → OpenAI |
| `ollama-to-openai.js` | Ollama → OpenAI |
| `commandcode-to-openai.js` | Command Code → OpenAI |

### 5. Database Layer

**Đường dẫn**: `src/lib/db/`

Driver chain (tự động chọn driver khả dụng):
1. `bun:sqlite` (Bun built-in)
2. `better-sqlite3` (native)
3. `node:sqlite` (Node ≥22.5 built-in)
4. `sql.js` (WASM fallback)

**Tables (8 tables + usage tracking)**:

| Table | Mô tả |
|-------|-------|
| `_meta` | Key/value metadata (schema version, app version) |
| `settings` | Single-row settings blob |
| `providerConnections` | OAuth/API key connections |
| `providerNodes` | Generic provider node records |
| `proxyPools` | Proxy pool management |
| `apiKeys` | Client API keys |
| `combos` | Named model combos |
| `kv` | Generic key-value store (scoped) |
| `usageHistory` | Detailed usage tracking |
| `usageDaily` | Daily aggregate summaries |
| `requestDetails` | Request/response debug logs |

**Migrations**: Versioned (4 migrations) + additive schema sync + legacy JSON import

### 6. Auth & Security

**Route bảo vệ** (trong `src/dashboardGuard.js`):

- `/api/*` - Deny-by-default với public allowlist
- `/v1/*`, `/v1beta/*` - Public (API key check bên trong handler)
- Always protected: shutdown, database, update, auto-import
- Local-only: MCP, tailscale, tunnel, auto-import

**OAuth flows** (12+ providers trong `src/lib/oauth/providers.js`):

| Provider | Flow |
|----------|------|
| Claude | Authorization Code PKCE |
| Codex | Authorization Code PKCE |
| Gemini CLI | Authorization Code |
| Antigravity | Authorization Code |
| GitHub | Device Code |
| Kiro | Device Code (3-step AWS SSO) |
| Cursor | Token import from local SQLite |
| Qwen | Device Code + PKCE polling |
| iFlow | Authorization Code |
| Qoder | Authorization Code |
| Kimi Coding | Device Code |
| Kilo Code | Device Code |
| Cline | Authorization Code |

## Middleware

**File**: `src/proxy.js`

Next.js middleware sử dụng `dashboardGuard.proxy` áp dụng cho tất cả routes trừ static assets:

```js
export { proxy } from "./dashboardGuard";
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
```

## URL Rewrites (next.config.mjs)

```js
/v1/:path*     → /api/v1/:path*
/v1/v1/:path*  → /api/v1/:path*    // double-prefix fix
/codex/:path*  → /api/v1/responses
```

## Path Aliases (jsconfig.json)

```json
"@/*": ["./src/*"],
"open-sse/*": ["./open-sse/*"]
```
