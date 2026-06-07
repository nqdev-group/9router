# RTK Token Saver

## Giới thiệu

RTK (Runtime Token Kit) là cơ chế nén tool_result content trong request body trước khi gửi lên LLM. Nó giúp giảm 20-40% input tokens bằng cách nén các output phổ biến như git diff, grep, ls, tree, v.v.

RTK được port từ [RTK Rust library](https://github.com/rtk-ai/rtk) (⭐40K).

## Cách hoạt động

RTK inject vào `translateRequest()` trong `open-sse/translator/index.js`, trước khi format translation:

```js
// RTK: compress tool_result content
const rtkStats = compressMessages(translatedBody, rtkEnabled, rtkConfig);
```

Nó support tất cả message shapes:

```
OpenAI tool:     { role: "tool", content: "string" }
OpenAI tool arr: { role: "tool", content: [{ type: "text", text: "..." }] }
Claude string:   { type: "tool_result", content: "string" }
Claude array:    { type: "tool_result", content: [{ type: "text", text: "..." }] }
OpenAI Responses: { type: "function_call_output", output: "string" | [...] }
```

## Cấu trúc

```
open-sse/rtk/
├── index.js           # Entry: compressMessages(), formatRtkLog()
├── engine.js          # Compression engine
├── configResolver.js  # Config resolution
├── autodetect.js      # Auto-detect filter from content
├── applyFilter.js     # Safe filter application
├── caveman.js         # Caveman mode injection
├── cavemanPrompts.js  # Caveman prompt templates
├── claudeMem.js       # Claude memory context injection
├── constants.js       # Constants
├── registry.js        # Filter registry
└── filters/           # 20 filter implementations
    ├── git-diff.js    # git diff compression
    ├── git-status.js  # git status compression
    ├── grep.js        # grep output compression
    ├── find.js        # find output compression
    ├── ls.js          # ls output compression
    ├── tree.js        # tree output compression
    ├── dedup-log.js   # Deduplicate log lines
    ├── smart-truncate.js
    ├── read-numbered.js
    ├── search-list.js
    └── ...
```

## Compression Flow

```
compressText(text, stats, shape):
1. Check MIN_COMPRESS_SIZE và RAW_CAP thresholds
2. autoDetectFilter() → peek first 1KB → chọn filter phù hợp
3. safeApply() → apply filter
4. Safety checks:
   - Never return empty
   - Never grow input
   - Nếu filter fail/throw → keep original
```

## RTK Stats Log

```log
[RTK] saved 24576B / 65536B (37.5%) via [git-diff,grep] hits=12
```

## Configuration

```js
settings.rtkEnabled: true,    // Bật/tắt RTK
settings.rtkConfig: {
  // Cấu hình nâng cao
}
```

## Caveman Mode

Caveman là tính năng inject system prompt "caveman-speak" để LLM trả lời ngắn gọn hơn, giảm output tokens.

```js
settings.cavemanEnabled: true,
settings.cavemanLevel: "full"   // "full" | "medium" | "light"
```

### Caveman Prompt Levels

- **full**: "You are caveman. Use few word. No explain. No apologize. Just answer."
- **medium**: "Be concise. Use minimal words. Answer directly."
- **light**: "Prefer brief answers when possible."

## Claude Memory (Claude Mem)

Inject persistent memory context từ previous sessions:

```js
settings.claudeMemEnabled: true
```

Hoạt động bằng cách query memory context và inject vào system prompt.
