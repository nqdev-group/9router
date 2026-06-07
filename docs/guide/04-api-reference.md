# API Reference

## Format Detection

9Router tự động phát hiện format request dựa trên cấu trúc body và URL path:

| Format | Cách phát hiện |
|--------|----------------|
| **OpenAI Chat** | `messages[]` array, có `stream_options` / `response_format` / `logprobs` / `n` / `presence_penalty` |
| **OpenAI Responses** | `input` array/string (không có `messages`) |
| **Claude** | `messages[]` với `content` dạng array + `type: "text"`, có `system` hoặc `anthropic_version` |
| **Gemini** | `contents` array |
| **Antigravity** | `body.request.contents` + `userAgent === "antigravity"` |

Override format bằng URL path:
- `/v1/messages` → Claude format
- `/v1/responses` → OpenAI Responses format

## Chat Completions

```http
POST /v1/chat/completions
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "model": "cc/claude-opus-4-6",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true
}
```

### Endpoints chat

| Endpoint | Format mặc định |
|----------|----------------|
| `POST /v1/chat/completions` | OpenAI / Cursor CLI |
| `POST /v1/messages` | Claude |
| `POST /v1/responses` | OpenAI Responses |
| `POST /v1/responses/compact` | OpenAI Responses + `_compact: true` |
| `POST /v1/api/chat` | Ollama-compatible |
| `POST /v1beta/models/{model}:generateContent` | Gemini |
| `POST /v1beta/models/{model}:streamGenerateContent` | Gemini (SSE) |

## Models

```http
GET /v1/models
Authorization: Bearer <api-key>
```

Trả về danh sách models + combos ở định dạng OpenAI.

```http
GET /v1/models/:kind
```

Filter theo kind: `image`, `tts`, `stt`, `embedding`, `image-to-text`, `web`.

```http
GET /v1/models/info?id={modelId}
```

Thông tin chi tiết một model: endpoint, capabilities, context window, params.

## Messages (Claude-format)

```http
POST /v1/messages/count_tokens
Content-Type: application/json

{
  "messages": [{"role": "user", "content": "Hello"}]
}
```

Trả về `{ input_tokens: N }` (estimate ~4 chars/token).

## Embeddings

```http
POST /v1/embeddings
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "model": "openai/text-embedding-3-small",
  "input": "Hello world"
}
```

## Image Generation

```http
POST /v1/images/generations
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "model": "openai/dall-e-3",
  "prompt": "A cat",
  "n": 1,
  "size": "1024x1024"
}
```

Hỗ trợ 14 image providers: OpenAI, Gemini, Codex, Stability AI, Fal AI, Black Forest Labs, Cloudflare AI, RunwayML, Hugging Face, NanoBanana, SD WebUI, ComfyUI.

## Audio

### Text-to-Speech

```http
POST /v1/audio/speech
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "model": "openai/tts-1",
  "input": "Hello world",
  "voice": "alloy"
}
```

Hỗ trợ 7 special adapters + 10 config-driven formats (Hyperbolic, Deepgram, NVIDIA, Hugging Face, Cartesia, PlayHT, Coqui, Tortoise, OpenAI, MiniMax).

### Speech-to-Text

```http
POST /v1/audio/transcriptions
Authorization: Bearer <api-key>
Content-Type: multipart/form-data

{
  "model": "openai/whisper-1",
  "file": <audio_file>
}
```

### List Voices

```http
GET /v1/audio/voices
```

## Web Fetch

```http
POST /v1/web/fetch
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "url": "https://example.com"
}
```

Hỗ trợ: Firecrawl, Jina Reader, Tavily, Exa.

## Web Search

```http
POST /v1/search
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "query": "latest AI news"
}
```

10 dedicated API callers (Serper, Brave, Perplexity, Exa, Tavily, Google PSE, Linkup, SearchAPI, You.com, SearXNG)
+ 7 chat-based search providers (Gemini, OpenAI, xAI, Kimi, MiniMax, Perplexity).

## Settings

```http
GET /v1/settings/oneproxy
```

Proxy marketplace management (list, sync, delete proxies).

## Health Check

```http
GET /api/health
→ { "ok": true }
```

## Model Naming Convention

```
<provider-alias>/<model-name>
```

| Prefix | Provider |
|--------|----------|
| `cc/` | Claude Code (subscription) |
| `cx/` | Codex (subscription) |
| `gh/` | GitHub Copilot |
| `cu/` | Cursor IDE |
| `glm/` | GLM (Zhipu AI) |
| `kr/` | Kiro AI (free) |
| `oc/` | OpenCode Free |
| `vertex/` | Vertex AI |
| `kimi/` | Kimi |
| `minimax/` | MiniMax |
| `openai/` | OpenAI |
| `anthropic/` | Anthropic |

## Combo Names

Combo names là tên do người dùng đặt (VD: `my-coding-combo`), resolve thành danh sách models với fallback tự động.
