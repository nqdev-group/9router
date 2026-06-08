# Provider System

## Provider Config

Cấu hình provider tập trung tại `open-sse/config/providers.js` (435 lines).

Mỗi provider có các thuộc tính:

```js
{
  baseUrl: "https://api.anthropic.com/v1/messages",
  format: "claude",         // openai | claude | gemini | antigravity | kiro | cursor | ...
  headers: {                // Static headers
    "User-Agent": "claude-cli/2.1.92 ..."
  },
  clientId: "...",          // OAuth client ID
  clientSecret: "...",      // OAuth client secret
  tokenUrl: "...",          // OAuth token endpoint
  authUrl: "...",           // OAuth auth endpoint
  refreshUrl: "...",        // Token refresh endpoint
  noAuth: true              // Skip auth (passthrough)
}
```

### Danh sách providers

**OAuth + Claude-format**: `claude` (cc), `glm`, `kimi`, `minimax`, `minimax-cn`, `agentrouter`

**OAuth + custom format**: `codex` (openai-responses), `antigravity` (antigravity), `kiro` (kiro), `cursor` (cursor)

**OAuth + OpenAI-format**: `qwen`, `iflow`, `qoder`, `github`, `kimi-coding`, `kilocode`, `cline`, `gitlab`, `codebuddy`

**OAuth + Gemini-format**: `gemini`, `gemini-cli`

**API Key + OpenAI-format**: `openai`, `openrouter`, `deepseek`, `groq`, `xai`, `mistral`, `perplexity`, `together`, `fireworks`, `cerebras`, `cohere`, `nebius`, `siliconflow`, `hyperbolic`, `nvidia`, `opencode`, `opencode-go`, `azure`, và nhiều hơn

**API Key + Claude-format**: `anthropic`

**Cookie-based**: `grok-web`, `perplexity-web`

**Local**: `ollama-local`

## Compatible Providers

9Router hỗ trợ compatible providers động:

### OpenAI-compatible (`openai-compatible-*`)

Provider bắt đầu với prefix `openai-compatible-` sẽ sử dụng config mặc định của OpenAI:
- Format: `openai` (hoặc `openai-responses` nếu có "responses" trong tên)
- URL: `{baseUrl}/chat/completions`
- Auth: `Authorization: Bearer {token}`

### Anthropic-compatible (`anthropic-compatible-*`)

Provider bắt đầu với prefix `anthropic-compatible-` sẽ sử dụng config của Anthropic:
- Format: `claude`
- URL: `{baseUrl}/messages`
- Auth: `x-api-key` header
- Tự động thêm `anthropic-version: 2023-06-01`

## Provider Connections

Lưu trong database table `providerConnections`:

```js
{
  id: "uuid",
  provider: "claude",         // Provider ID
  authType: "oauth",          // oauth | apikey
  name: "My Claude Account",
  email: "user@example.com",
  priority: 1,                // Thứ tự ưu tiên
  isActive: true,
  data: {
    accessToken: "...",
    refreshToken: "...",
    expiresAt: "2026-06-01T...",
    apiKey: "...",
    providerSpecificData: { ... },
    testStatus: "active",
    lastError: null,
    rateLimitedUntil: null
  }
}
```

### Account Selection Strategy

Trong `src/sse/services/auth.js`:

- **fill-first** (mặc định): Chọn account theo priority
- **round-robin**: Phân phối đều với sticky limit

Khi một account fail, nó được đánh dấu unavailable với cooldown:
- Rate limit: reset chính xác (`resetsAtMs`)
- Lỗi khác: exponential backoff

## Adding a New Provider

1. **Provider config**: Thêm vào `open-sse/config/providers.js`
2. **Models**: Thêm vào `open-sse/config/providerModels.js`
3. **Executor**: Tạo file trong `open-sse/executors/` hoặc dùng `default.js`
4. **Translator**: Thêm request/response translator nếu format khác OpenAI
5. **Register**: Đăng ký translator pair trong `open-sse/translator/index.js`
6. **OAuth**: Thêm handler trong `src/lib/oauth/providers.js` nếu cần
7. **UI**: Thêm định nghĩa trong `src/shared/constants/providers.js`
