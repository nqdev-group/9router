# Translator System

## Giới thiệu

Hệ thống translator chịu trách nhiệm chuyển đổi request/response giữa các format khác nhau. Nó hoạt động theo nguyên tắc **hai bước**: source → OpenAI → target.

Điều này có nghĩa là để support N formats, chỉ cần N×2 translators (mỗi format ↔ OpenAI), thay vì N×(N-1).

## Registry

**File**: `open-sse/translator/index.js`

```js
const requestRegistry = new Map();   // { "source:target": translateFn }
const responseRegistry = new Map();  // { "source:target": translateFn }
```

## Translation Flow

### Request Translation

```
translateRequest(sourceFormat, targetFormat, model, body, ...):

1. stripContentTypes() — Xoá image/audio content theo strip list
2. strip reasoning_content — Xoá non-standard field
3. normalizeThinkingConfig — Xoá thinking config nếu last message không phải user
4. ensureToolCallIds — Đảm bảo tool_calls có id
5. fixMissingToolResponses — Thêm empty tool_result nếu thiếu

6. Nếu source !== target:
   a. source → openai (từ requestRegistry)
   b. openai → target (từ requestRegistry)

7. Nếu target === openai: filterToOpenAIFormat()
8. Nếu target === claude: prepareClaudeRequest()
9. Claude cloaking: rename tool names với _cc suffix
```

### Response Translation

```
translateResponse(targetFormat, sourceFormat, chunk, state):

1. Nếu source === target → return as-is
2. target → openai (từ responseRegistry)
3. openai → source (từ responseRegistry)
4. Attach OpenAI intermediate results cho logging
```

## Format Detection

**File**: `open-sse/services/provider.js` → `detectFormat(body)`

```js
function detectFormat(body) {
  // 1. OpenAI Responses: input array/string, no messages
  if (body.input && !body.messages) return "openai-responses";

  // 2. Antigravity: body.request.contents + userAgent
  if (body.request?.contents && body.userAgent === "antigravity") return "antigravity";

  // 3. Gemini: contents array
  if (body.contents) return "gemini";

  // 4. OpenAI-specific indicators (stream_options, response_format, logprobs, ...)
  if (body.stream_options || body.response_format || ...) return "openai";

  // 5. Claude: messages + content array với type "text"/"image"/"tool_use"
  if (body.messages) {
    // Check Claude-specific: system field, anthropic_version
    // Check image format: Claude (source.type) vs OpenAI (image_url.url)
    // Check tool format: tool_use/tool_result
  }

  // 6. Default: openai
  return "openai";
}
```

## Format Constants

**File**: `open-sse/translator/formats.js`

```js
export const FORMATS = {
  OPENAI: "openai",
  OPENAI_RESPONSES: "openai-responses",
  CLAUDE: "claude",
  GEMINI: "gemini",
  GEMINI_CLI: "gemini-cli",
  ANTIGRAVITY: "antigravity",
  KIRO: "kiro",
  CURSOR: "cursor",
  OLLAMA: "ollama",
  COMMANDCODE: "commandcode",
  GROK_WEB: "grok-web",
  PERPLEXITY_WEB: "perplexity-web",
  VERTEX: "vertex",
};
```

## Request Translators

| Translator | Mô tả |
|------------|-------|
| `claude-to-openai.js` | Claude messages → OpenAI messages. Map content blocks, tool_use → tool_calls |
| `openai-to-claude.js` | OpenAI → Claude. Chuyển system message, tool_calls → tool_use |
| `gemini-to-openai.js` | Gemini contents → OpenAI messages |
| `openai-to-gemini.js` | OpenAI → Gemini contents |
| `openai-to-vertex.js` | OpenAI → Vertex AI format |
| `antigravity-to-openai.js` | Antigravity → OpenAI |
| `openai-responses.js` | OpenAI Responses → OpenAI Chat |
| `openai-to-kiro.js` | OpenAI → Kiro format |
| `openai-to-cursor.js` | OpenAI → Cursor format |
| `openai-to-ollama.js` | OpenAI → Ollama format |
| `openai-to-commandcode.js` | OpenAI → Command Code format |

## Response Translators

| Translator | Mô tả |
|------------|-------|
| `claude-to-openai.js` | Claude SSE → OpenAI SSE chunks |
| `openai-to-claude.js` | OpenAI SSE → Claude SSE chunks |
| `gemini-to-openai.js` | Gemini SSE → OpenAI SSE chunks |
| `openai-to-antigravity.js` | OpenAI SSE → Antigravity format |
| `openai-responses.js` | OpenAI Responses SSE → client format |
| `kiro-to-openai.js` | Kiro SSE → OpenAI SSE |
| `cursor-to-openai.js` | Cursor SSE → OpenAI SSE |
| `ollama-to-openai.js` | Ollama SSE → OpenAI SSE |
| `commandcode-to-openai.js` | Command Code SSE → OpenAI SSE |

## Streaming State

Response translation cần duy trì state cho streaming:

```js
initState(sourceFormat) → state object

Base state:
{
  messageId, model,
  textBlockStarted, thinkingBlockStarted,
  inThinkingBlock, currentBlockIndex,
  toolCalls: Map(),
  finishReason, finishReasonSent,
  usage, contentBlockIndex
}

OpenAI Responses state (bổ sung):
{
  seq, responseId, created,
  msgTextBuf, msgItemAdded,
  reasoningBuf, funcArgsBuf, ...
}
```

## Native Passthrough

Khi CLI tool và provider cùng ecosystem (VD: Claude CLI → Claude provider), request được pass qua mà không cần translation:

```js
const passthrough = isNativePassthrough(clientTool, provider);
if (passthrough) {
  translatedBody = { ...body, model };
} else {
  translatedBody = translateRequest(...);
}
```
