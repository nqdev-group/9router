# RTK Token Saver

## Giới thiệu

RTK (Runtime Token Kit) là cơ chế nén tool_result content trong request body trước khi gửi lên LLM. Giảm 20-40% input tokens bằng cách nén output phổ biến như git diff, grep, ls, tree, build log, stack trace.

RTK port từ [RTK Rust library](https://github.com/rtk-ai/rtk) (⭐40K).

## Cách hoạt động

RTK inject vào `translateRequest()` trong `open-sse/translator/index.js`, trước format translation:

```js
// Content cleaning & pruning preprocessor
preprocessBody(body);
pruneBody(body);

// RTK: compress tool_result content
const rtkStats = compressMessages(translatedBody, rtkEnabled, rtkConfig);
```

Preprocessing chạy trước RTK compression:
- **contentCleaner.js**: Xoá BOM, trailing whitespace, collapse multi-blank lines
- **contextPruner.js**: Dedup code blocks trùng lặp qua các turn hội thoại

Support tất cả message shapes:

```
OpenAI tool:       { role: "tool", content: "string" }
OpenAI tool arr:   { role: "tool", content: [{ type: "text", text: "..." }] }
Claude string:     { type: "tool_result", content: "string" }
Claude array:      { type: "tool_result", content: [{ type: "text", text: "..." }] }
OpenAI Responses:  { type: "function_call_output", output: "string" | [...] }
Kiro:              conversationState.history[].toolResults[].content[].text
```

## Cấu trúc

```
open-sse/rtk/
├── index.js              # Entry: compressMessages(), formatRtkLog()
├── batchCompress.js      # Batch compression cho nhiều text segments nhỏ
├── configResolver.js     # Config resolution + intensity presets
├── autodetect.js         # Auto-detect filter từ content (peek đầu 4KB)
├── applyFilter.js        # Safe filter apply (try/catch, never break request)
├── caveman.js            # Caveman mode injector (dispatch theo format)
├── cavemanPrompts.js     # 6 caveman prompt templates
├── constants.js          # Thresholds, filter name constants
├── registry.js           # Filter registry (20 filters + metadata)
├── preprocessors/
│   ├── contentCleaner.js # Whitespace normalization, BOM removal
│   └── contextPruner.js  # Duplicate code block detection qua conversation
└── filters/              # 21 filters
    ├── gitDiff.js        # Git diff compression
    ├── gitStatus.js      # Git status compression
    ├── gitLog.js         # Git log collapse
    ├── gitShow.js        # Git show: diff + first line message
    ├── grep.js           # Grep output collapse
    ├── find.js           # Find output collapse
    ├── ls.js             # Ls output summary
    ├── tree.js           # Tree output collapse
    ├── dedupLog.js       # Deduplicate consecutive log lines
    ├── smartTruncate.js  # Keep head/tail, replace middle
    ├── readNumbered.js   # Compact numbered file lists (Cursor read_file)
    ├── searchList.js     # Collapse search results (Cursor glob search)
    ├── eslint.js         # Group ESLint errors by file
    ├── tscBuild.js       # Group TypeScript errors by file
    ├── jestTest.js       # Summarize Jest results
    ├── npmInstall.js     # Collapse npm install output
    ├── pipInstall.js     # Collapse pip install output
    ├── dockerLogs.js     # Docker logs: collapse timestamps, dedup
    ├── errorStacktrace.js# Stack traces: keep top/bottom frames
    ├── jsonLog.js        # JSON logs: extract timestamp/level/message
    └── buildOutput.js    # Build output (npm, cargo, pip, maven, gradle)
```

## Compression Flow

```
compressText(text, stats, shape):
1. Check minCompressSize và maxCompressSize thresholds
2. autoDetectFilter() → peek first 4KB → chọn filter phù hợp
3. Nếu có config, kiểm tra filter có được enabled không
4. safeApply() → apply filter
5. Safety checks:
   - Never return empty
   - Never grow input
   - Nếu filter fail/throw → keep original
```

## Batch Compression

Gom nhiều system/user text segments nhỏ (<500B) thành một blob, apply auto-detect + compress một lần, sau đó split kết quả về từng segment bằng separator hoặc proportional ratio.

Kích hoạt khi có ≥3 segments nhỏ trong cùng request.

## RTK Stats Log

```log
[RTK] saved 24576B / 65536B (37.5%) via [git-diff,grep] hits=12
```

## Configuration

### Dashboard Settings

| Setting | Default | Mô tả |
|---------|---------|-------|
| `rtkEnabled` | `true` | Bật/tắt RTK compression |
| `rtkConfig.intensity` | `"moderate"` | Preset intensity level |
| `rtkConfig.minCompressSize` | `500` | Ngưỡng tối thiểu (bytes) |
| `rtkConfig.maxCompressSize` | `10485760` | Ngưỡng tối đa (10MB) |

### Intensity Presets

| Preset | Filters | Dedup | Code Stripping | Truncation |
|--------|---------|-------|----------------|------------|
| **minimal** | git-diff, git-status, grep, ls, tree | off | off | >500 lines |
| **moderate** | Tất cả filters | ≥2 lần | off | >250 lines |
| **aggressive** | Tất cả filters | ≥1 lần | JS/TS/PY/RS/GO | >150 lines |
| **maximal** | Tất cả filters | ≥1 lần | Tất cả ngôn ngữ | >100 lines |

```js
settings.rtkEnabled: true,
settings.rtkConfig: {
  intensity: "moderate",           // "minimal" | "moderate" | "aggressive" | "maximal"
  minCompressSize: 500,
  maxCompressSize: 10485760,
  enabledFilters: null,            // null = all, hoặc object { "git-diff": true, ... }
  autoDetectEnabled: true,
  dedupEnabled: true,
  dedupThreshold: 2,
  codeStrippingEnabled: false,
  codeStrippingLanguages: ["js", "ts", "py", "rs", "go"],
  rawOutputRetention: "none",
  providerOverrides: {},
}
```

## Caveman Mode

Inject system prompt "caveman-speak" để LLM trả lời ngắn gọn, giảm output tokens. Dispatch tự động theo format (Claude, Gemini, OpenAI, Vertex, v.v.).

### 6 Intensity Levels

| Level | Mô tả | Tiết kiệm |
|-------|-------|-----------|
| **lite** | Drop filler/hedging, giữ grammar | ~30% |
| **full** | Caveman speak: drop articles, fragments | ~50% |
| **ultra** | Ultra-terse: abbreviate, telegraphic | ~65% |
| **wenyan-lite** | Semi-classical Chinese, giữ tech terms | ~40% |
| **wenyan** | Classical Chinese (文言文), 80-90% char reduction | ~80% |
| **wenyan-ultra** | Extreme classical compression | ~85% |

Tính năng tự động clear (auto-clarity): tạm dừng caveman khi cần security warnings, irreversible actions, multi-step sequences. Resume sau.

```js
settings.cavemanEnabled: true,
settings.cavemanLevel: "full"   // "lite" | "full" | "ultra" | "wenyan-lite" | "wenyan" | "wenyan-ultra"
```

## Response Cache

LRU cache cho identical LLM responses. Cache key: MD5 hash của (model, messages, temperature, max_tokens, top_p).

| Setting | Default | Mô tả |
|---------|---------|-------|
| `maxSize` | 100 | Số entries tối đa |
| `ttlMs` | 300000 | TTL (5 phút) |

```js
settings.responseCacheEnabled: true
```

File: `open-sse/services/responseCache.js`

## Auto-Detect Priority

Thứ tự detect filter từ content (peek 4KB đầu):

```
git-diff → git-show → git-log → git-status → build-output
→ eslint → tsc → jest → npm-install → pip-install
→ docker-logs → grep → find → tree → ls → search-list
→ error-stacktrace → json-log → read-numbered
→ dedup-log (generic fallback)
→ smart-truncate (last resort)
```
