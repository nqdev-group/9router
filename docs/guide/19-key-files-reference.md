# Key Files Reference

## API Routes

| File | Mô tả |
|------|-------|
| `src/app/api/v1/chat/completions/route.js` | Entry point chat completions |
| `src/app/api/v1/messages/route.js` | Claude-format messages |
| `src/app/api/v1/responses/route.js` | OpenAI Responses API |
| `src/app/api/v1/models/route.js` | Model listing engine (402 lines) |
| `src/app/api/v1/embeddings/route.js` | Embeddings |
| `src/app/api/v1/images/generations/route.js` | Image generation |
| `src/app/api/v1/audio/speech/route.js` | TTS |
| `src/app/api/v1/audio/transcriptions/route.js` | STT |
| `src/app/api/v1beta/models/[...path]/route.js` | Gemini API translation (328 lines) |
| `src/app/api/oauth/[provider]/[action]/route.js` | Dynamic OAuth route (233 lines) |
| `src/app/api/auth/login/route.js` | Password login |
| `src/app/api/providers/route.js` | Provider connections CRUD |
| `src/app/api/combos/route.js` | Combos CRUD |
| `src/app/api/keys/route.js` | API keys CRUD |
| `src/app/api/pricing/route.js` | Pricing CRUD (134 lines) |

## Core Engine (open-sse/)

| File | Mô tả |
|------|-------|
| `open-sse/index.js` | Public API barrel (72 lines) |
| `open-sse/config/providers.js` | Provider definitions (435 lines) |
| `open-sse/config/providerModels.js` | Model catalog |
| `open-sse/translator/index.js` | Translator registry + orchestration (222 lines) |
| `open-sse/translator/formats.js` | Format constants |
| `open-sse/handlers/chatCore.js` | Core chat orchestration (257 lines) |
| `open-sse/services/provider.js` | Format detection, URL/header building (320 lines) |
| `open-sse/services/combo.js` | Combo handler (174 lines) |
| `open-sse/services/accountFallback.js` | Account fallback logic (194 lines) |
| `open-sse/services/responseCache.js` | LRU response cache (78 lines) |
| `open-sse/executors/index.js` | Executor registry (19 executors, 70 lines) |
| `open-sse/executors/default.js` | Default OpenAI-compatible executor |
| `open-sse/rtk/index.js` | RTK token compression entry (218 lines) |
| `open-sse/rtk/configResolver.js` | RTK config + intensity presets (131 lines) |
| `open-sse/rtk/autodetect.js` | Auto-detect filter from content (127 lines) |
| `open-sse/rtk/batchCompress.js` | Batch compression for small segments |
| `open-sse/rtk/caveman.js` | Caveman mode injector (dispatch by format) |
| `open-sse/rtk/cavemanPrompts.js` | 6-level caveman prompt templates |
| `open-sse/rtk/preprocessors/contentCleaner.js` | Whitespace normalization preprocessor |
| `open-sse/rtk/preprocessors/contextPruner.js` | Duplicate code block pruner |

## SSE Layer (src/sse/)

| File | Mô tả |
|------|-------|
| `src/sse/handlers/chat.js` | Main chat entry (249 lines) |
| `src/sse/services/auth.js` | Credential management (334 lines) |
| `src/sse/services/model.js` | Model parsing (83 lines) |
| `src/sse/services/tokenRefresh.js` | Token refresh lifecycle (292 lines) |
| `src/sse/utils/logger.js` | Logging utility (75 lines) |

## Database (src/lib/db/)

| File | Mô tả |
|------|-------|
| `src/lib/db/index.js` | Public API barrel + export/import (178 lines) |
| `src/lib/db/driver.js` | Adapter chain loader |
| `src/lib/db/schema.js` | Schema definitions |
| `src/lib/db/migrate.js` | Migration runner |
| `src/lib/db/repos/usageRepo.js` | Largest repo (873 lines) |

## Auth & Middleware

| File | Mô tả |
|------|-------|
| `src/dashboardGuard.js` | Route guard middleware (201 lines) |
| `src/proxy.js` | Next.js middleware entry |
| `src/lib/oauth/providers.js` | OAuth implementations (1323 lines) |
| `src/lib/oauth/constants/oauth.js` | OAuth constants (276 lines) |
| `src/shared/utils/apiKey.js` | API key generation/verification |

## UI Components

| File | Mô tả |
|------|-------|
| `src/app/layout.js` | Root layout (50 lines) |
| `src/app/login/page.js` | Login page (174 lines) |
| `src/app/callback/page.js` | OAuth callback page (148 lines) |
| `src/shared/constants/providers.js` | UI provider definitions (1664+ lines) |
| `src/shared/constants/cliTools.js` | CLI tool definitions |
| `src/shared/constants/pricing.js` | Pricing model definitions |

## Configuration

| File | Mô tả |
|------|-------|
| `next.config.mjs` | Next.js config (66 lines) |
| `jsconfig.json` | Path aliases |
| `.env.example` | Environment variables |
| `package.json` | Dependencies & scripts |
