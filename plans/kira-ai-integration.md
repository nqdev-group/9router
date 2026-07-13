# Kế hoạch tích hợp Provider Kira AI — Cập nhật 2026-07-09

## 1. Mục tiêu
Tích hợp Kira AI (https://kiraai.vn) vào 9Router: Chat Completions, Image Generation, Text-to-Speech.

## 2. Thông số kỹ thuật
- **Base URL:** `https://kiraai.vn/api/v1`
- **Format:** OpenAI Compatible (100%)
- **Models:** kira-mini-1.0 (free), kira-3.5-flash, kira-2.5-pro, kira-2.5-flash, kira-3-pro-image-preview, kira-3.1-flash-image-preview, kira-3.1-generate-001

## 3. Hiện trạng (đã hoàn thành)

| Thành phần | File | Trạng thái |
|-----------|------|-----------|
| Provider registry | `packages/providers/registry/kira.js` | ✅ Khai báo đầy đủ (transport, models, auth, ttsConfig, imageConfig) |
| Chat completions | DefaultExecutor (qua `transport.format: "openai"`) | ✅ Tự động xử lý |
| Image adapter | `open-sse/handlers/imageProviders/kira.js` | ✅ Đã tạo + đăng ký |
| TTS adapter | `open-sse/handlers/ttsProviders/kira.js` | ✅ Đã tạo + đăng ký |
| Model alias (explicit `kira/`) | `open-sse/services/model.js` (`kira: "kira"`) | ✅ |
| Model prefix inference (bare `kira-mini-1.0`) | `open-sse/services/model.js` — `inferProviderFromModelName()` nhúng `@9router/services/model.js` | ✅ |
| Provider logo | `public/providers/kira.png` | ✅ |
| Service kinds | Registry: `["llm", "image", "video", "tts"]` | ✅ |

### 3.1. Registry (`packages/providers/registry/kira.js`)
Dùng cấu trúc LiteLLM-style registry mới (không phải config cũ ở `open-sse/config/`):
- `transport.baseUrl`: chat completions endpoint
- `transport.format: "openai"` → tự động dùng DefaultExecutor
- `models[]`: định nghĩa models với `type:` field (llm/image/video)
- `serviceKinds`: `["llm", "image", "video", "tts"]`
- `ttsConfig`: baseUrl, authType, voices list
- `imageConfig`: baseUrl

### 3.2. Image Generation
- Adapter: `open-sse/handlers/imageProviders/kira.js`
- Endpoint: `POST /v1/images/generations` → `https://kiraai.vn/api/v1/images/generations`
- Map OpenAI `size` → Kira `aspect_ratio` (1:1, 16:9, 9:16, 4:3, 3:4)
- Response: OpenAI-compatible, passthrough normalize

### 3.3. Text-to-Speech
- Adapter: `open-sse/handlers/ttsProviders/kira.js`
- Endpoint: `POST /v1/audio/speech` → `https://kiraai.vn/api/v1/audio/speech`
- 5 voices: Kore, Fenrir, Puck, Charon, Aoede
- Mapping OpenAI voices → Kira voices (alloy→Kore, echo→Fenrir, etc.)
- Model format: `kira/kira-2.5-flash/VoiceName`

### 3.4. Model Resolution Chain

Khi user gửi model string, thứ tự resolve:

1. **Explicit `kira/xxx`** → `parseModel` tách prefix → `resolveProviderAlias("kira")` → `"kira"`
2. **DB alias** → check model alias trong DB → nếu có map `"kira-mini": "kira/kira-mini-1.0"` → route đúng
3. **Core prefix inference** → `open-sse/services/model.js` — check `claude-`, `gemini-`, `gpt-`, `deepseek-`, `o[134]-`
4. **Extra prefix inference** → `open-sse/services/model.js` — gọi `require("@9router/services/model.js").getProviderFromExtraPrefixes()` → check `kira-` → `"kira"`

Với `kira-mini-1.0` không có alias DB:
- Step 3 không match → chuyển step 4
- Step 4 match `kira-` prefix → `kira/kira-mini-1.0` ✅

## 4. Kiến trúc (so với plan cũ)

Plan cũ đề xuất `packages/kira-ai/` standalone package + sửa `open-sse/config/`. Thực tế triển khai khác:

| Plan cũ | Thực tế |
|---------|---------|
| `packages/kira-ai/config.js` | ❌ Không tồn tại — dùng registry entry |
| `packages/kira-ai/index.js` | ❌ Không tồn tại — registry tự export |
| Sửa `open-sse/config/providers.js` | ❌ Không cần — registry-driven |
| Sửa `open-sse/config/providerModels.js` | ❌ Không cần — models trong registry |
| Tạo image adapter riêng | ✅ `open-sse/handlers/imageProviders/kira.js` |
| Tạo TTS adapter riêng | ✅ `open-sse/handlers/ttsProviders/kira.js` |
| Sửa `src/shared/constants/providers.js` | ❌ Không cần — registry field `serviceKinds` thay thế |

## 5. Bảo trì

- **Thêm model mới**: Sửa `models[]` trong `packages/providers/registry/kira.js`
- **Sửa voice list**: Sửa `ttsConfig.voices` trong registry
- **Thêm image aspect ratio**: Sửa `sizeMap` trong `open-sse/handlers/imageProviders/kira.js`
- Video generation (`kira-3.1-generate-001`): Chưa có video pipeline trong codebase — bỏ qua

## 6. Files tham chiếu

- `packages/providers/registry/kira.js` — Định nghĩa provider chính
- `packages/providers/registry/index.js` — Auto-generated import list
- `open-sse/handlers/imageProviders/kira.js` — Image generation adapter
- `open-sse/handlers/ttsProviders/kira.js` — TTS adapter
- `open-sse/services/model.js` — Alias `kira: "kira"`, nhúng extra prefix inference từ package
- `packages/services/model.js` — Extra model prefix inference (`kira-` prefix), được `open-sse/services/model.js` require
- `public/providers/kira.png` — Logo
- `plans/kira-ai-media-integration.md` — Plan chi tiết cho image + TTS
