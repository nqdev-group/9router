# RevidAPI Text-to-Speech — Tích hợp vào 9Router

## Tài liệu tham khảo

- **API Docs**: https://docs.revidapi.com/endpoints/tts/text_to_speech/
- **Voice Library**: https://revidapi.com/text-to-speech/voice-library
- **Base URL (POST)**: `https://api.revidapi.com/paid/text-to-speech`
- **Status URL (GET)**: `https://tts.revidapi.com/api/get/{task_id}`
- **Auth**: `x-api-key` header
- **Pricing**: 10 credits / 1,000 chars

---

## Phần 1: Phân tích API RevidAPI TTS

### 1.1 Endpoints

| Endpoint | Method | URL | Mục đích |
|---|---|---|---|
| Text to Speech | POST | `https://api.revidapi.com/paid/text-to-speech` | Chuyển text → audio |
| SRT to Speech | POST | `https://api.revidapi.com/paid/srt-to-speech/merge` | SRT subtitle → audio đồng bộ |
| Get Task Status | GET | `https://tts.revidapi.com/api/get/{task_id}` | Kiểm tra trạng thái task |

### 1.2 Request Body — POST /paid/text-to-speech

```json
{
  "text": "Xin chào, đây là giọng nói từ RevidAPI.",
  "engine": "edge",
  "voice_id": 1001,
  "voice": "vi-VN-HoaiMyNeural",
  "speed": 1.0,
  "pitch": 0,
  "webhook_url": "https://example.com/webhook",
  "id": "tts-request-123"
}
```

| Param | Type | Required | Default | Ghi chú |
|---|---|---|---|---|
| `text` | string | **YES** | — | Text cần convert |
| `engine` | string | No | `edge` | `edge`, `capcut`, `google` |
| `voice_id` | integer | No | — | Voice ID (numeric) |
| `voice` | string | No | — | Voice name (thay voice_id) |
| `speed` | number | No | `1.0` | 0.5–2.0 |
| `pitch` | number | No | `0` | -20 to 20 |
| `webhook_url` | string | No | — | Callback URL |
| `id` | string | No | — | Custom request ID |

### 1.3 Response

**Immediate (202 Accepted)** — khi có webhook:
```json
{
  "code": 202,
  "id": "tts-request-123",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "processing"
}
```

**Success (200)** — khi hoàn thành:
```json
{
  "code": 200,
  "id": "tts-request-123",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "response": {
    "audio_url": "https://storage.example.com/audio/output.mp3",
    "duration": 3.5
  },
  "message": "success"
}
```

### 1.4 Task Status — GET /api/get/{task_id}

| Status | Ý nghĩa |
|---|---|
| `processing` | Đang xử lý (202) |
| `completed` | Thành công — có `audio_url` (200) |
| `failed` | Lỗi (500) |
| `not_found` | Không tìm thấy task (404) |

### 1.5 Challenge chính

**RevidAPI là async task-based**, trong khi tất cả TTS adapter hiện tại của 9Router đều **sync** (trả `{base64, format}` trực tiếp). Adapter phải tự xử lý polling bên trong.

---

## Phần 2: Phân tích TTS Architecture 9Router hiện tại

### 2.1 Request Flow hiện tại

```
Client → POST /v1/audio/speech
       → src/sse/handlers/tts.js (auth, combo, credential fallback)
       → open-sse/handlers/ttsCore.js (orchestrator)
       → open-sse/handlers/ttsProviders/{adapter}.js (provider-specific)
       → createTtsResponse() → audio
```

### 2.2 Hai tầng dispatch trong ttsCore.js

1. **Special Adapters** (`SPECIAL_ADAPTERS` map): google-tts, edge-tts, local-device, elevenlabs, openai, openrouter, gemini, kira, **revidapi**
   - complex auth, scraping, streaming, async polling → cần adapter riêng
   - `{ synthesize(text, model, credentials, responseFormat, opts) }` → `{ base64, format }`

2. **Generic Format Handlers** (`FORMAT_HANDLERS` map): hyperbolic, deepgram, nvidia-tts, huggingface-tts, inworld, cartesia, playht, coqui, tortoise, openai, minimax-tts
   - REST API đơn giản → dùng config-driven dispatch
   - `{ baseUrl, apiKey, text, modelId, voiceId }` → `{ base64, format }`

### 2.3 Tại sao RevidAPI cần Special Adapter

| Lý do | Chi tiết |
|---|---|
| Async task-based | Phải poll status, không sync |
| Auth header đặc biệt | `x-api-key` (không phải `Bearer`) |
| Response là `audio_url` | Phải fetch file audio từ URL |
| Có thể dùng webhook | Cần xử lý cả 2 mode |

---

## Phần 3: Kế hoạch Tích hợp

### 3.1 Tổng quan — Library Package Pattern

Code RevidAPI TTS được tổ chức theo **library package pattern** (giống `packages/cmem/`, `packages/kira-ai/`):

```
packages/revidapi/                      ← Thư viện chính (all logic)
  config.js                             ← Registry entry, models config, voices, constants
  adapter.js                            ← Async polling synthesize + fetchAudioAsBase64
  index.js                              ← Barrel export

open-sse/providers/registry/revidapi.js ← thin re-export REVIDAPI_REGISTRY_ENTRY
open-sse/handlers/ttsProviders/revidapi.js ← thin re-export revidapiAdapter
src/.../revidapi/voices/route.js        ← import REVIDAPI_VOICES
```

Import alias: `@9router/revidapi` → `./packages/revidapi`

### 3.2 Effort Estimate

| Bước | Files | Thời gian |
|---|---|---|
| Library package (`packages/revidapi/`) | 3 new | 30 min |
| Thin re-export wrappers (`open-sse/`) | 2 new | 5 min |
| TTS model config edit | 1 edit | 5 min |
| Handler index wiring | 1 edit | 2 min |
| Voice list API | 1 new + 1 edit | 15 min |
| Registry index edit | 1 edit | 2 min |
| Lint + verify | — | 10 min |
| **Total** | **5 new + 4 edit** | **~70 min** |

---

## Phần 4: Chi tiết Implement

### Bước 1: Library Package — `packages/revidapi/`

#### `packages/revidapi/config.js`

Registry entry, models config, voices library, API constants.

```js
export const REVIDAPI_REGISTRY_ENTRY = {
  id: "revidapi",
  alias: "rv",
  display: {
    name: "RevidAPI",
    icon: "record_voice_over",
    color: "#15803d",
    textIcon: "RV",
    website: "https://revidapi.com",
    notice: { apiKeyUrl: "https://revidapi.com" },
  },
  category: "apikey",
  authType: "apikey",
  serviceKinds: ["tts"],
  ttsConfig: {
    baseUrl: "https://api.revidapi.com/paid/text-to-speech",
    authType: "apikey",
    authHeader: "x-api-key",
    format: "revidapi",
    engines: ["edge", "capcut", "google"],
    defaultEngine: "edge",
    defaultModel: "edge/vi-VN-HoaiMyNeural",
    models: [
      { id: "edge", name: "Edge TTS (Free Engine)" },
      { id: "capcut", name: "CapCut TTS" },
      { id: "google", name: "Google TTS" },
    ],
  },
};

export const REVIDAPI_TTS_MODELS = {
  models: [
    { id: "edge", name: "Edge TTS (Free)", type: "tts" },
    { id: "capcut", name: "CapCut TTS", type: "tts" },
    { id: "google", name: "Google TTS", type: "tts" },
  ],
  voices: {
    edge: [
      { id: "vi-VN-HoaiMyNeural", name: "Vietnamese Female", type: "tts" },
      { id: "vi-VN-NamMinhNeural", name: "Vietnamese Male", type: "tts" },
      { id: "en-US-JennyNeural", name: "English Female", type: "tts" },
      { id: "en-US-GuyNeural", name: "English Male", type: "tts" },
      { id: "ja-JP-NanamiNeural", name: "Japanese Female", type: "tts" },
      { id: "ko-KR-SunHiNeural", name: "Korean Female", type: "tts" },
      { id: "zh-CN-XiaoxiaoNeural", name: "Chinese Female", type: "tts" },
    ],
  },
  allVoices: [
    { id: "vi-VN-HoaiMyNeural", name: "Vietnamese Female", type: "tts" },
    { id: "vi-VN-NamMinhNeural", name: "Vietnamese Male", type: "tts" },
    { id: "en-US-JennyNeural", name: "English Female", type: "tts" },
    { id: "en-US-GuyNeural", name: "English Male", type: "tts" },
    { id: "ja-JP-NanamiNeural", name: "Japanese Female", type: "tts" },
    { id: "ko-KR-SunHiNeural", name: "Korean Female", type: "tts" },
    { id: "zh-CN-XiaoxiaoNeural", name: "Chinese Female", type: "tts" },
  ],
};

export const REVIDAPI_VOICES = [
  { id: "vi-VN-HoaiMyNeural", name: "Hoai My", lang: "vi", gender: "female", engine: "edge" },
  { id: "vi-VN-NamMinhNeural", name: "Nam Minh", lang: "vi", gender: "male", engine: "edge" },
  { id: "en-US-JennyNeural", name: "Jenny", lang: "en", gender: "female", engine: "edge" },
  { id: "en-US-GuyNeural", name: "Guy", lang: "en", gender: "male", engine: "edge" },
  { id: "ja-JP-NanamiNeural", name: "Nanami", lang: "ja", gender: "female", engine: "edge" },
  { id: "ko-KR-SunHiNeural", name: "Sun Hi", lang: "ko", gender: "female", engine: "edge" },
  { id: "zh-CN-XiaoxiaoNeural", name: "Xiaoxiao", lang: "zh", gender: "female", engine: "edge" },
];

export const REVIDAPI_API = {
  POST_URL: "https://api.revidapi.com/paid/text-to-speech",
  STATUS_BASE: "https://tts.revidapi.com/api/get",
  POLL_INTERVAL_MS: 5000,
  MAX_POLL_ATTEMPTS: 30,
  UA: "9router-tts/1.0",
  AUTH_HEADER: "x-api-key",
  CREDITS_PER_1K_CHARS: 10,
};
```

#### `packages/revidapi/adapter.js`

Async polling adapter: POST → poll status → fetch audio → base64.

```js
import { REVIDAPI_API } from "./config.js";

export const revidapiAdapter = {
  async synthesize(text, model, credentials, responseFormat, opts) {
    // ... parsing model → engine + voice/voiceId ...
    // ... POST create task ...
    // ... if code 200 → fetchAudioAsBase64 ...
    // ... if code 202 → poll STATUS_BASE ...
    // ... return { base64, format } ...
  },
};

async function fetchAudioAsBase64(audioUrl) { /* fetch + Buffer.from */ }
function sleep(ms) { /* setTimeout */ }
```

Key points:
- Dùng dynamic `import("node:buffer")` thay vì `require("buffer")` — tránh lỗi `Buffer is not defined` trong môi trường browser/webpack
- Poll mỗi 5s, tối đa 30 lần (150s timeout)
- Kiểm tra `buf.byteLength < 100` để tránh audio rỗng

#### `packages/revidapi/index.js`

```js
export { REVIDAPI_REGISTRY_ENTRY, REVIDAPI_TTS_MODELS, REVIDAPI_VOICES, REVIDAPI_API } from "./config.js";
export { revidapiAdapter } from "./adapter.js";
```

### Bước 2: Thin Re-export Wrappers

#### `open-sse/providers/registry/revidapi.js`

```js
export { REVIDAPI_REGISTRY_ENTRY as default } from "@9router/revidapi";
```

#### `open-sse/handlers/ttsProviders/revidapi.js`

```js
export { revidapiAdapter as default } from "@9router/revidapi";
```

### Bước 3: TTS Model Config — `open-sse/config/ttsModels.js`

Import và gán vào `TTS_MODELS_CONFIG.revidapi` từ `@9router/revidapi` (hoặc copy inline config — hiện tại copy inline để giữ consistent với các provider khác).

### Bước 4: Wire into Handler Index — `open-sse/handlers/ttsProviders/index.js`

```diff
+ import revidapi from "./revidapi.js";

  const SPECIAL_ADAPTERS = {
    ...,
+   revidapi,
  };
```

### Bước 5: Voice List API

**File voice data:** `src/app/api/media-providers/tts/revidapi/voices/route.js`
- Import `REVIDAPI_VOICES` từ `@9router/revidapi`
- GET handler: lọc theo `?lang=`, trả về `{ object: "list", data }`

### Bước 6: Voices Route Map — `src/app/api/v1/audio/voices/route.js`

```js
case "revidapi":
  internalUrl = `${origin}/api/media-providers/tts/revidapi/voices`;
  break;
```

### Bước 7: Registry Index — `open-sse/providers/registry/index.js`

Thêm import line + array entry cho `revidapi`.

```diff
+ import p95 from "./revidapi.js";
  export default [..., p95];
```

---

## Phần 5: Model String Format

```
{provider}/{engine}/{voice}

Ví dụ:
  rv/edge/vi-VN-HoaiMyNeural    → engine=edge, voice=vi-VN-HoaiMyNeural
  rv/capcut/standard-A           → engine=capcut, voice=standard-A
  rv/google/en-US-Wavenet-D      → engine=google, voice=en-US-Wavenet-D
  rv/1001                        → engine=edge (default), voice_id=1001
```

Phân tích model string trong adapter:
```js
const parts = model.split("/");
engine = parts[0];
const voicePart = parts.slice(1).join("/");
if (/^\d+$/.test(voicePart)) voiceId = parseInt(voicePart);
else voice = voicePart;
```

---

## Phần 6: Request Flow Chi tiết

```
Client
  POST /v1/audio/speech
  { model: "rv/edge/vi-VN-HoaiMyNeural", input: "Xin chào" }
    │
    ▼
src/sse/handlers/tts.js
  ├── Auth check (requireApiKey)
  ├── Combo expansion (getComboModels)
  └── handleSingleModelTts()
        │
        ▼
open-sse/handlers/ttsCore.js
  └── getTtsAdapter("revidapi") → revidapi adapter (từ SPECIAL_ADAPTERS)
        │
        ▼
packages/revidapi/adapter.js  ← Logic thật (thin re-export từ open-sse/)
  ├── Parse model → engine="edge", voice="vi-VN-HoaiMyNeural"
  ├── POST api.revidapi.com/paid/text-to-speech
  │   { text, engine, voice }
  │
  ├── [If 202] Poll GET tts.revidapi.com/api/get/{task_id}
  │   every 5s, max 30 attempts
  │
  ├── [When completed] Fetch audio from audio_url
  └── Return { base64, format: "mp3" }
        │
        ▼
ttsCore.js → createTtsResponse()
  └── Response: audio/mpeg (binary) or JSON { audio: base64 }
```

---

## Phần 7: Edge Cases & Error Handling

| Edge Case | Xử lý |
|---|---|
| Task timeout (150s) | Throw error `"RevidAPI TTS timeout"` |
| Task failed | Throw error từ `statusData.message` |
| Empty audio (< 100 bytes) | Throw error `"RevidAPI returned empty audio"` |
| Invalid API key (401) | Throw error từ upstream |
| Text quá dài | Để upstream xử lý (credit-based) |
| Network error | Catch + propagate qua ttsCore error handler |

---

## Phần 8: Testing

### Manual Test

```bash
curl -X POST http://localhost:20128/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{
    "model": "rv/edge/vi-VN-HoaiMyNeural",
    "input": "Xin chào, đây là giọng nói từ RevidAPI."
  }' \
  --output test.mp3
```

### Verify

1. `test.mp3` exists and is valid audio (> 1KB)
2. `GET /v1/audio/voices?provider=revidapi` returns voice list
3. Combo fallback works: `rv/edge/vi-VN-HoaiMyNeural → rv/capcut/standard-A`
4. Error handling: invalid API key returns 401

---

## Phần 9: Credits Cost Awareness

RevidAPI tính credit theo số ký tự: **10 credits / 1,000 chars**.

| Text Length | Credits Used |
|---|---|
| 100 chars | 1 credit |
| 1,000 chars | 10 credits |
| 5,000 chars | 50 credits |
| 10,000 chars | 100 credits |

Dashboard có thể hiển thị credit cost ước tính trong Usage Analytics nếu cần.

---

## Phần 10: Checklist

- [x] Tạo `packages/revidapi/config.js` — registry entry, models, voices, constants
- [x] Tạo `packages/revidapi/adapter.js` — async polling synthesize + fetchAudioAsBase64
- [x] Tạo `packages/revidapi/index.js` — barrel export
- [x] Tạo `open-sse/providers/registry/revidapi.js` — thin re-export (import từ @9router/revidapi)
- [x] Tạo `open-sse/handlers/ttsProviders/revidapi.js` — thin re-export (import từ @9router/revidapi)
- [x] Edit `open-sse/handlers/ttsProviders/index.js` — add import + SPECIAL_ADAPTERS
- [x] Edit `open-sse/config/ttsModels.js` — add revidapi models/voices config
- [x] Tạo `src/app/api/media-providers/tts/revidapi/voices/route.js` — voice list API (import REVIDAPI_VOICES)
- [x] Edit `src/app/api/v1/audio/voices/route.js` — add revidapi case
- [x] Edit `open-sse/providers/registry/index.js` — add import p95 + array entry
- [ ] Test: POST /v1/audio/speech với model rv/edge/vi-VN-HoaiMyNeural
- [ ] Test: GET /v1/audio/voices?provider=revidapi
- [ ] Test: Combo fallback
- [ ] Test: Error handling (invalid key, timeout)
- [x] Lint check: 0 errors, 0 new warnings
