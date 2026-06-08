# Executor System

## Giới thiệu

Executors là các HTTP + auth adapters, mỗi provider có một executor riêng. Executor chịu trách nhiệm:
- Xây dựng HTTP request đến upstream provider
- Xử lý auth headers đặc thù
- Refresh tokens khi cần
- Parse response

## Base Executor

Mỗi executor extends `BaseExecutor` từ `open-sse/executors/base.js`:

```js
class BaseExecutor {
  async execute({ model, body, stream, credentials, signal, log, proxyOptions }) {
    // Build URL → Build headers → Execute HTTP call
    // Returns { response, url, headers, transformedBody }
  }

  async refreshCredentials(credentials, log) {
    // Refresh OAuth tokens
    // Returns updated credentials
  }
}
```

## Executor Registry

**File**: `open-sse/executors/index.js`

```js
const executors = {
  antigravity: new AntigravityExecutor(),
  azure: new AzureExecutor(),
  "gemini-cli": new GeminiCLIExecutor(),
  github: new GithubExecutor(),
  iflow: new IFlowExecutor(),
  qoder: new QoderExecutor(),
  kiro: new KiroExecutor(),
  codex: new CodexExecutor(),
  cursor: new CursorExecutor(),
  cu: new CursorExecutor(),  // Alias
  vertex: new VertexExecutor("vertex"),
  "vertex-partner": new VertexExecutor("vertex-partner"),
  qwen: new QwenExecutor(),
  opencode: new OpenCodeExecutor(),
  "opencode-go": new OpenCodeGoExecutor(),
  "grok-web": new GrokWebExecutor(),
  "perplexity-web": new PerplexityWebExecutor(),
  "ollama-local": new OllamaLocalExecutor(),
  commandcode: new CommandCodeExecutor(),
};
```

Providers không có specialized executor sẽ dùng `DefaultExecutor(provider)`.

## Specialized Executors

### DefaultExecutor
Cho providers OpenAI-compatible tiêu chuẩn. Dùng `buildProviderUrl()` và `buildProviderHeaders()` từ `open-sse/services/provider.js`.

### CodexExecutor
- OpenAI Codex CLI adapter
- Xử lý Responses API format
- Auth token refresh (Codex OAuth)

### GithubExecutor
- GitHub Copilot adapter
- Headers mimic VSCode (`copilot-integration-id`, `editor-version`, `user-agent`)
- Dual token: GitHub access token + Copilot token

### KiroExecutor
- Kiro AI (free Claude) adapter
- AWS SSO OIDC auth flow
- Session management

### VertexExecutor
- Google Vertex AI adapter
- Async token minting từ service account JSON
- `_buildHeadersAsync()` for Vertex auth

### AntigravityExecutor
- Google Cloud Code IDE adapter
- Google OAuth + project management
- Base URL rotation (multiple endpoints)

### GeminiCLIExecutor
- Gemini CLI adapter
- Google OAuth
- Project ID management

### IFlowExecutor
- iFlow API adapter
- API key extraction từ user info

### CursorExecutor
- Cursor IDE adapter
- Token import từ local Cursor DB

## Adding a New Executor

1. Tạo file `open-sse/executors/my-provider.js`
2. Export class extending `BaseExecutor` (hoặc implement `execute()`, `refreshCredentials()`)
3. Register trong `open-sse/executors/index.js`
4. Set `noAuth` flag nếu provider không cần auth

```js
export class MyExecutor {
  noAuth = false;

  async execute({ model, body, stream, credentials, signal, log, proxyOptions }) {
    const url = "https://api.example.com/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${credentials.apiKey}`
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal
    });
    return { response, url, headers };
  }

  async refreshCredentials(credentials, log) {
    // Optional: implement token refresh
    return credentials;
  }
}
```
