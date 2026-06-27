# Kế hoạch tích hợp SambaNova

## Thông tin Provider

- **Tên**: SambaNova Cloud
- **Base URL**: `https://api.sambanova.ai/v1`
- **API Key**: `https://cloud.sambanova.ai/apis`
- **Category**: `apikey` (free tier)
- **Format**: OpenAI-compatible (chat/completions)
- **Status**: `hasFree: true`

## Models

| Model ID | Display Name | Context | Output |
|----------|-------------|---------|--------|
| MiniMax-M2.7 | MiniMax M2.7 | 131K | 131K |
| DeepSeek-V3.2 | DeepSeek V3.2 | 131K | 32K |
| Meta-Llama-3.3-70B-Instruct | Llama 3.3 70B | 131K | 131K |
| gpt-oss-120b | GPT-OSS 120B | - | - |

## Files đã thay đổi

### 1. `packages/providers/registry/sambanova.js` (NEW)
Registry entry với đầy đủ transport, models, display config.

### 2. `packages/providers/registry/index.js` (MODIFIED)
Thêm import `pc03` cho sambanova.

### 3. `open-sse/config/providerModels.js`
`CORE_PROVIDER_MODELS.sambanova` còn models cũ (Llama 3.1) — không ảnh hưởng vì runtime `PROVIDER_MODELS` lấy từ registry.

## Kiến trúc

```
SambaNova API (api.sambanova.ai) 
  → DefaultExecutor (OpenAI-compat, không cần executor riêng)
  → Format: openai (passthrough, không cần translator)
```

Vì SambaNova dùng OpenAI-compatible format, `DefaultExecutor` xử lý được ngay. Không cần thêm executor hay translator.

## Usage

Sau khi `git pull`:
- Model key: `sambanova/MiniMax-M2.7`
- Alias: `sambanova` (id = alias)
- Thêm API key trong Dashboard → Providers → SambaNova
