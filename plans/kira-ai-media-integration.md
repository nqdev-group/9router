# Kira AI — Media Providers Integration Plan

## Tài liệu tham khảo
- https://kiraai.vn/documents
- Base URL: `https://kiraai.vn/api/v1`
- Format: OpenAI-compatible (100%)

---

## Phần 1: Rà soát Chat Completions (Kira AI — API Key Provider)

### Trạng thái hiện tại
Kira AI chat completions **đã tích hợp đầy đủ**:
- Provider config: `open-sse/config/providers.js:458` → `kira: { baseUrl: ".../chat/completions", format: "openai" }`
- Models: `open-sse/config/providerModels.js:370-377` → 6 models (3 LLM + 2 image + 1 video)
- Dashboard UI: `src/shared/constants/providers.js:118` → `APIKEY_PROVIDERS.kira` với `serviceKinds: ["llm", "image", "video"]`
- Executor: Dùng `DefaultExecutor` (OpenAI-compatible, không cần executor riêng)
- Model resolution: `open-sse/services/model.js:145` → `kira: "kira"`
- Package: `packages/kira-ai/config.js` + `index.js`

### So sánh với tài liệu Kira AI mới

| Mục | Tài liệu Kira AI | Codebase hiện tại | Cần bổ sung? |
|-----|------------------|-------------------|-------------|
| Base URL | `https://kiraai.vn/api/v1` | ✅ Đúng | Không |
| Chat endpoint | `/chat/completions` | ✅ Đúng | Không |
| Model `kira-3.5-flash` | ✅ Có | ✅ Có | Không |
| Model `kira-2.5-pro` | ✅ Có | ✅ Có | Không |
| Model `kira-2.5-flash` | ✅ Có | ✅ Có | Không |
| Streaming | Hỗ trợ | ✅ DefaultExecutor xử lý | Không |
| Authorization | `Bearer API_KEY` | ✅ DefaultExecutor xử lý | Không |

### Kết luận Chat Completions
**Không cần thay đổi.** Tất cả đã tương thích.

---

## Phần 2: Tích hợp Image Generation → Media Providers → Text to Image

### Trạng thái hiện tại
- 2 image models đã define trong `providerModels.js:374-375` với `type: "image"`
- `serviceKinds` trong providers.js:118 đã include `"image"`
- **THIẾU**: Image adapter trong `open-sse/handlers/imageProviders/` → sẽ lỗi `"Provider 'kira' does not support image generation"`

### Tài liệu Kira AI Image Generation
- **Endpoint**: `POST https://kiraai.vn/api/v1/images/generations`
- **Models**: `kira-3-pro-image-preview` (chất lượng cao), `kira-3.1-flash-image-preview` (tốc độ cao)
- **Parameters**: `model`, `prompt`, `aspect_ratio` (`"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`)
- **Response**: OpenAI-compatible format (data[].url hoặc data[].b64_json)

### Kế hoạch thực hiện

#### Bước 1: Tạo Image Adapter — `open-sse/handlers/imageProviders/kira.js`

```js
// Kira AI image generation adapter (OpenAI-compatible)
// Endpoint: https://kiraai.vn/api/v1/images/generations
// Supports: aspect_ratio parameter (1:1, 16:9, 9:16, 4:3, 3:4)

const KIRA_IMAGE_URL = "https://kiraai.vn/api/v1/images/generations";

export default {
  buildUrl: () => KIRA_IMAGE_URL,
  buildHeaders: (creds) => {
    const headers = { "Content-Type": "application/json" };
    const key = creds?.apiKey || creds?.accessToken;
    if (key) headers["Authorization"] = `Bearer ${key}`;
    return headers;
  },
  buildBody: (model, body) => {
    const { prompt, n = 1, size = "1024x1024" } = body;
    // Map OpenAI size → Kira aspect_ratio
    const sizeMap = {
      "1024x1024": "1:1", "1792x1024": "16:9", "1024x1792": "9:16",
      "1536x1024": "4:3", "1024x1536": "3:4",
    };
    return { model, prompt, n, aspect_ratio: sizeMap[size] || "1:1" };
  },
  normalize: (responseBody) => responseBody,
};
```

#### Bước 2: Đăng ký adapter — `open-sse/handlers/imageProviders/index.js`

Thêm vào `ADAPTERS`:
```js
import kira from "./kira.js";
// ...
kira,
```

#### Bước 3: Thêm TTS models vào providerModels.js (nếu cần)

Không cần — image models đã có sẵn.

#### Bước 4: Cập nhật packages/kira-ai/config.js

Thêm `type: "image"` cho image models nếu chưa có (đã có sẵn).

### Files cần tạo/sửa

| File | Hành động |
|------|-----------|
| `open-sse/handlers/imageProviders/kira.js` | **TẠO MỚI** — Image adapter |
| `open-sse/handlers/imageProviders/index.js` | **SỬA** — Import + đăng ký `kira` |

### Xác minh
- Dashboard → Media Providers → Text to Image → Hiển thị Kira AI
- Gọi `POST /v1/images/generations` với model `kira/kira-3-pro-image-preview` → trả về ảnh
- Test với các aspect_ratio khác nhau

---

## Phần 3: Tích hợp Text to Speech (TTS) → Media Providers → Text To Speech

### Trạng thái hiện tại
- `serviceKinds` cho kira **CHƯA include `"tts"`** (chỉ có `["llm", "image", "video"]`)
- **KHÔNG CÓ** `ttsConfig` trong providers.js
- **KHÔNG CÓ** TTS adapter trong `open-sse/handlers/ttsProviders/`
- Kira AI **HỖ TRỢ TTS** theo tài liệu mới

### Tài liệu Kira AI TTS
- **Endpoint**: `POST https://kiraai.vn/api/v1/audio/speech`
- **Model**: `kira-2.5-flash` (dùng cho TTS)
- **Voices**: `Kore`, `Fenrir`, `Puck`, `Charon`, `Aoede`
- **OpenAI voice mapping**: `alloy`→Kore, `echo`→Fenrir, `fable`→Puck, `onyx`→Charon, `nova`→Aoede
- **Response**: Binary audio (mp3)
- **Tương thích OpenAI SDK**: Có thể dùng `openai.audio.speech.create()`

### Kế hoạch thực hiện

#### Bước 1: Thêm TTS vào serviceKinds + ttsConfig — `src/shared/constants/providers.js`

Sửa dòng 118:
```js
// Trước:
kira: { ..., serviceKinds: ["llm", "image", "video"] }

// Sau:
kira: {
  ...,
  serviceKinds: ["llm", "image", "video", "tts"],
  ttsConfig: {
    baseUrl: "https://kiraai.vn/api/v1/audio/speech",
    authType: "apikey",
    authHeader: "bearer",
    format: "openai",  // Tương thích OpenAI TTS format
    models: [
      { id: "kira-2.5-flash", name: "Kira 2.5 Flash (TTS)" },
    ],
    voices: [
      { id: "Kore", name: "Kore" },
      { id: "Fenrir", name: "Fenrir" },
      { id: "Puck", name: "Puck" },
      { id: "Charon", name: "Charon" },
      { id: "Aoede", name: "Aoede" },
    ],
  },
}
```

#### Bước 2: Tạo TTS Adapter — `open-sse/handlers/ttsProviders/kira.js`

Kira AI TTS tương thích OpenAI format → có thể dùng lại logic của OpenAI TTS adapter:

```js
// Kira AI TTS adapter (OpenAI-compatible)
// Endpoint: https://kiraai.vn/api/v1/audio/speech
// Voices: Kore, Fenrir, Puck, Charon, Aoede
// OpenAI mapping: alloy→Kore, echo→Fenrir, fable→Puck, onyx→Charon, nova→Aoede

import { Buffer } from "node:buffer";

const KIRA_TTS_URL = "https://kiraai.vn/api/v1/audio/speech";

const VOICE_MAP = { alloy: "Kore", echo: "Fenrir", fable: "Puck", onyx: "Charon", nova: "Aoede" };

export default {
  async synthesize(text, model, credentials) {
    if (!credentials?.apiKey) throw new Error("No Kira AI API key configured");

    let ttsModel = "kira-2.5-flash";
    let voice = "Kore";
    if (model && model.includes("/")) {
      const parts = model.split("/");
      if (parts.length === 2) [ttsModel, voice] = parts;
    } else if (model) {
      voice = VOICE_MAP[model] || model;
    }

    const res = await fetch(KIRA_TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${credentials.apiKey}` },
      body: JSON.stringify({ model: ttsModel, voice, input: text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Kira TTS failed: ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    return { base64: Buffer.from(buf).toString("base64"), format: "mp3" };
  },
};
```

#### Bước 3: Đăng ký adapter — `open-sse/handlers/ttsProviders/index.js`

Thêm vào `SPECIAL_ADAPTERS`:
```js
import kira from "./kira.js";
// ...
kira,
```

#### Bước 4: Cập nhật packages/kira-ai/config.js

Thêm TTS config vào package config để đồng bộ.

### Files cần tạo/sửa

| File | Hành động |
|------|-----------|
| `src/shared/constants/providers.js` | **SỬA** — Thêm `"tts"` vào serviceKinds + `ttsConfig` |
| `open-sse/handlers/ttsProviders/kira.js` | **TẠO MỚI** — TTS adapter |
| `open-sse/handlers/ttsProviders/index.js` | **SỬA** — Import + đăng ký `kira` |
| `packages/kira-ai/config.js` | **SỬA** — Thêm TTS models config |

### Xác minh
- Dashboard → Media Providers → Text to Speech → Hiển thị Kira AI
- Dashboard → Media Providers → Text to Speech → Kira AI → Hiển thị danh sách voices
- Gọi TTS API với model `kira/kira-2.5-flash/Kore` → trả về file mp3
- Test với các voices khác nhau (Kore, Fenrir, Puck, Charon, Aoede)
- Test voice mapping OpenAI (`alloy` → `Kore`)

---

## Tổng kết

| Phần | Trạng thái | Files thay đổi |
|------|-----------|----------------|
| Chat Completions | ✅ Đã hoàn thành | Không |
| Image Generation | ❌ Cần tích hợp | 2 files (1 tạo mới, 1 sửa) |
| TTS | ❌ Cần tích hợp | 4 files (2 tạo mới, 2 sửa) |

### Thứ tự thực hiện
1. Image Generation (đơn giản, chỉ cần adapter mới)
2. TTS (cần sửa providers.js + adapter mới + voice list)

### Lưu ý
- Cả Image và TTS của Kira AI đều tương thích OpenAI format → adapter đơn giản
- Không cần executor riêng (dùng DefaultExecutor cho chat)
- Không cần translator riêng (format=openai → passthrough)
- Video Generation (`kira-3.1-generate-001`) **KHÔNG tích hợp** trong plan này vì codebase chưa có video pipeline
