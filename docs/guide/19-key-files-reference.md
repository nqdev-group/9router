# Key Files Reference

## Entry Points & Core

| File | Purpose |
|------|---------|
| `next.config.mjs` | Next.js config, rewrites `/v1/*` → `/api/v1/*`, standalone output |
| `src/sse/handlers/chat.js` | Main chat handler: combo resolution, account fallback, dispatch to chatCore |
| `open-sse/handlers/chatCore.js` | Core orchestration: translation, RTK, caveman, privacy, CMEM, executor dispatch, streaming |
| `open-sse/handlers/responsesHandler.js` | Responses API wrapper: converts Responses → Chat Completions format |
| `src/lib/db/driver.js` | DB adapter chain: bun:sqlite → better-sqlite3 → node:sqlite → sql.js |
| `src/lib/db/schema.js` | Declarative schema (11 tables), auto-sync |

## Provider System

| File | Purpose |
|------|---------|
| `open-sse/providers/index.js` | Builds PROVIDERS + PROVIDER_MODELS from registry |
| `open-sse/providers/registry/index.js` | Auto-generated barrel importing all 97 registry files |
| `open-sse/providers/registry/{id}.js` | Per-provider: transport config, OAuth config, model list, media capabilities |
| `open-sse/config/providers.js` | Re-exports PROVIDERS, defines shared headers, region resolvers |
| `open-sse/config/providerModels.js` | Model alias ↔ upstream mapping, targetFormat, strip lists |

## Translation

| File | Purpose |
|------|---------|
| `open-sse/translator/index.js` | Registry: `register()`, `translateRequest()`, `translateResponse()` |
| `open-sse/translator/formats.js` | FORMATS enum, `detectFormatByEndpoint()` |
| `open-sse/translator/request/*.js` | 12 request translators (source → target) |
| `open-sse/translator/response/*.js` | 10 response translators (target → source) |
| `open-sse/translator/concerns/` | Shared logic: toolCall, thinking, reasoning, image, finishReason, usage, chunk |
| `open-sse/translator/schema/` | Enums: roles, blocks, finishReasons, defaults |

## Executors

| File | Purpose |
|------|---------|
| `open-sse/executors/index.js` | Executor registry (21+ special executors) |
| `open-sse/executors/base.js` | BaseExecutor class |
| `open-sse/executors/default.js` | Default HTTP executor for OpenAI-compatible APIs |
| `open-sse/executors/{kiro,codex,cursor,github,...}.js` | Specialized per-provider executors |

## RTK (Token Saver)

| File | Purpose |
|------|---------|
| `open-sse/rtk/index.js` | `compressMessages()` — tool_result compression entry |
| `open-sse/rtk/filters/` | 21 content-aware filters (git-diff, grep, ls, tree, log, ...) |
| `open-sse/rtk/autodetect.js` | Auto-detect filter from first 1KB of content |
| `open-sse/rtk/headroom.js` | External Headroom proxy integration |
| `open-sse/rtk/caveman.js` | Caveman mode: terse-style system prompt injection |
| `open-sse/rtk/ponytail.js` | Ponytail: lazy senior dev prompt injection |
| `open-sse/rtk/constants.js` | Filter constants, presets, intensity levels |
| `open-sse/rtk/configResolver.js` | Backend config resolver for RTK settings |

## Database Layer

| File | Purpose |
|------|---------|
| `src/lib/db/schema.js` | 11 tables: settings, providerConnections, providerNodes, proxyPools, apiKeys, combos, kv, usageHistory, usageDaily, requestDetails |
| `src/lib/db/driver.js` | Adapter chain with fallback logic |
| `src/lib/db/migrate.js` | Migration runner |
| `src/lib/db/repos/usageRepo.js` | Usage persistence (820 lines, largest repo) |
| `src/lib/db/repos/cmemRepo.js` | CMEM migration + context tables |
| `src/lib/db/repos/connectionsRepo.js` | Provider connection CRUD |
| `src/lib/db/repos/settingsRepo.js` | Settings with defaults |

## Dashboard & API Routes

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/dashboard/page.js` | Dashboard root → EndpointPageClient |
| `src/app/(dashboard)/dashboard/endpoint/` | Endpoint config page (portal page) |
| `src/app/(dashboard)/dashboard/providers/` | Provider management |
| `src/app/(dashboard)/dashboard/combos/` | Combo system |
| `src/app/(dashboard)/dashboard/settings/` | Global settings |
| `src/app/(dashboard)/dashboard/usage/` | Usage analytics & costs |
| `src/app/(dashboard)/dashboard/token-saver/` | RTK configuration UI |
| `src/app/(dashboard)/dashboard/settings/cmem-engine/` | CMEM context memory UI |
| `src/app/api/providers*` | Provider CRUD APIs |
| `src/app/api/oauth/*` | OAuth flow APIs |
| `src/app/api/combos*` | Combo CRUD APIs |
| `src/app/api/usage/*` | Usage data APIs |
| `src/app/api/settings/*` | Settings APIs |
| `src/app/api/keys*` | API key lifecycle |

## Packages (`@9router/*`)

| Package | Purpose |
|---------|---------|
| `packages/cmem/` | Context Memory engine (FTS5, opt-in) |
| `packages/components/` | Shared UI components (caveman, cmem, cost, rtk, token-saver-report) |
| `packages/validation/` | Schema validation (cmemSchemas) |
| `packages/kira-ai/` | Kira AI integration |
| `packages/mcpServer/` | MCP server |
| `packages/providers/` | Provider helpers |
| `packages/utils/` | Shared utilities |
| `packages/revidapi/` | Revid API integration |

## Tests

| File | Purpose |
|------|---------|
| `tests/package.json` | Separate vitest package |
| `tests/vitest.config.js` | Vitest config with path aliases |
| `tests/translator/` | Translation layer tests |
| `tests/translator/registerAll.js` | Required import for translator tests |
| `tests/translator/matrix.js` | Provider-model test matrix builder |

## Infrastructure

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable contract (25+ vars) |
| `DOCKER.md` | Docker build/deploy guide |
| `cli/` | CLI package (npm-published 9router CLI) |
| `scripts/` | Build/publish scripts |
| `custom-server.js` | Production server wrapper (Next.js standalone) |
