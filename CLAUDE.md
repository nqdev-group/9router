# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

9Router is a local AI routing gateway and OpenAI-compatible proxy. Routes CLI traffic across 40+ AI providers with format translation, 3-tier fallback chains (combos), account round-robin, OAuth token refresh, and RTK token compression.

**Private npm package**: `9router-app` (not published). Use source/Docker execution for local dev.

## Development Commands

```bash
# Install dependencies (from repo root)
npm install

# Run dev server (hot reload, port 20128)
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev

# Alternative with bun runtime
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev:bun

# Build for production
npm run build

# Run production build
PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start

# Run all tests (separate package in tests/)
cd tests && npm install && npm test

# Run a single test file
cd tests && npx vitest run --reporter=verbose path/to/file.test.js

# Run tests matching a pattern
cd tests && npx vitest run --reporter=verbose -t "combo-routing"

# Docker build
docker build -t 9router .

# Docker run (from repo root with .env file)
docker run -d --name 9router -p 20128:20128 --env-file ./.env \
  -v "$HOME/.9router:/app/data" 9router
```

## Architecture

### Three-Layer Architecture

```
CLI Tools → /v1/* API Routes  →  SSE + Routing Core  →  Executors  →  Upstream Providers
         → /api/* Dash Routes →  localDb/usageDb persistence
         → Dashboard UI       →  React components via Next.js App Router
```

**Layer 1 — API Routes** (`src/app/api/*`):
- `/api/v1/*` — OpenAI-compatible endpoints (chat/completions, models, messages, responses, embeddings, images/generations, audio, search)
- `/api/*` — Dashboard CRUD APIs (auth, providers, combos, keys, usage, sync, OAuth flows, settings, CLI tools)

**Layer 2 — SSE + Routing Core** (`open-sse/` + `src/sse/`):
- `src/sse/handlers/chat.js` — Request parsing, combo iteration, account fallback loop
- `open-sse/handlers/chatCore.js` — Translation orchestration, executor dispatch, retry on 401/403
- `open-sse/executors/` — Provider-specific HTTP + auth adapters (one file per provider, or use `default.js` for standard OpenAI-compatible)

**Layer 3 — Translation Registry** (`open-sse/translator/`):
- `index.js` — Selects translator pair by source format + target provider
- `request/*` — Request body conversion (openai-to-claude, claude-to-openai, openai-to-kiro, etc.)
- `response/*` — Response stream normalization back to client format

### Dashboard / UI Layer

Uses Next.js App Router with React 19, Tailwind CSS 4, recharts for charts, @xyflow/react for flow graphs:

- `src/app/(dashboard)/dashboard/*` — All dashboard page routes (providers, combos, usage, settings, token-saver, etc.)
- `src/shared/components/` — Shared UI components (buttons, cards, modals, forms, tables)
- `src/shared/hooks/` — Shared React hooks
- `src/shared/constants/` — App-wide constants, provider labels, model definitions
- `src/shared/services/` — Client-side service wrappers (API calls)
- `src/store/` — Zustand stores (providerStore, settingsStore, themeStore, etc.)
- `packages/components/` — Isolated feature component packages (token-saver, caveman, cost, rtk) — imported via `@9router/components/*` path alias

**Path aliases** (from `jsconfig.json`):
- `@/` → `./src/*` (all source imports)
- `@9router/*` → `./packages/*` (component packages, MCP server, validation, utils)
- `open-sse/` → `./open-sse/*` (SSE core and executors)

### Persistence

- **Main state** (`src/lib/localDb.js`): `${DATA_DIR}/db/data.sqlite` — providers, combos, aliases, API keys, settings, usage history. SQLite via better-sqlite3 (native) or sql.js (fallback)
- **Usage history** (`src/lib/usageDb.js`): Same SQLite DB, separate tables for request logs and token counts
- Optional request/translator logs: `logs/` when `ENABLE_REQUEST_LOGS=true`

### Dashboard Guard & Proxy

- **Middleware** (`src/dashboardGuard.js`): Protects dashboard routes behind JWT auth cookie, served through `src/proxy.js` via Next.js middleware matcher pattern
- **Express proxy** (`src/proxy.js` only re-exports): The actual Express integration is in `src/dashboardGuard.js` — handles `/api/`, `/oauth/`, `/v1/`, and `/v1beta/` paths with JWT, API key, or CORS auth depending on route

### Server-Sent Events (SSE) Core

- `open-sse/` — Standalone module containing the SSE streaming logic
- `open-sse/handlers/chatCore.js` — Central dispatcher: detects source format, selects translator pair, dispatches to executor, handles retries
- `open-sse/executors/` — Each provider gets an executor file if it needs special auth/logic. Standard OpenAI-compatible APIs use `default.js`. Specialized executors exist for: antigravity, azure, codex, cursor, gemini-cli, github, grok-web, iflow, kiro, opencode, perplexity-web, qoder, qwen, vertex
- `open-sse/config/providers.js` — Provider metadata (auth types, base URLs, model prefixes)
- `open-sse/config/models.js` — Full model catalog organized by provider prefix
- `open-sse/rtk/` — RTK token compression filters ported to JS

### RTK Token Saver

Built-in token compression that runs before requests are sent upstream. Cuts 20-40% input tokens by compressing `tool_result` content (git diffs, grep, ls, tree, etc.). Filters auto-detect content type from first 1KB. Default ON in endpoint settings.

### Database Layer

- **Dual-driver**: `better-sqlite3` (native, optional dependency) with automatic fallback to `sql.js` (WASM-based, guaranteed to work)
- Chain of responsibility pattern in `src/lib/db/` for driver selection, migrations, and operations
- Migration chain for schema updates
- Backups auto-created in `${DATA_DIR}/db/backups/`

## Request Flow

```
POST /v1/chat/completions
  → src/app/api/v1/chat/completions/route.js
  → src/sse/handlers/chat.js (parse model/combo, iterate accounts)
    → open-sse/handlers/chatCore.js (detect format, translate, dispatch)
      → open-sse/executors/[provider].js (HTTP call + auth)
        → Upstream provider (SSE/JSON response)
      ← open-sse/translator/response/*.js (normalize back to client format)
    ← src/lib/usageDb.js (log request + token counts)
  → Client receives SSE stream
```

## Key File Reference

| Path | Role |
|------|------|
| `src/sse/handlers/chat.js` | Main chat entry, combo/account loop |
| `open-sse/handlers/chatCore.js` | Translation + executor dispatch |
| `open-sse/executors/index.js` | Executor registry |
| `open-sse/translator/index.js` | Translator pair selector |
| `src/lib/localDb.js` | Persistent config (providers, combos, keys, settings) |
| `src/lib/usageDb.js` | Usage/request tracking tables |
| `src/dashboardGuard.js` | JWT/API-key auth middleware + Express routes |
| `src/app/api/oauth/[provider]/[action]/route.js` | OAuth + device-code flows |
| `open-sse/config/providers.js` | Provider definitions (auth types, endpoints) |
| `open-sse/config/models.js` | Model catalog with prefixes |
| `open-sse/rtk/` | RTK filter integration |
| `src/shared/components/` | Shared React UI components |
| `src/store/` | Zustand state stores |

## Environment Variables

| Variable | Default | Role |
|----------|---------|------|
| `JWT_SECRET` | auto-generated (`~/.9router/jwt-secret`) | JWT signing for dashboard auth cookie |
| `INITIAL_PASSWORD` | `123456` | First-login password when no hash exists |
| `DATA_DIR` | `~/.9router` | SQLite DB location at `$DATA_DIR/db/data.sqlite` |
| `PORT` | framework default | Service port (20128 in examples) |
| `HOSTNAME` | framework default | Bind host |
| `BASE_URL` | `http://localhost:20128` | Server-side base URL (preferred over NEXT_PUBLIC_) |
| `CLOUD_URL` | `https://9router.com` | Cloud sync endpoint base |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Backward-compatible public base URL |
| `NEXT_PUBLIC_CLOUD_URL` | `https://9router.com` | Backward-compatible public cloud URL |
| `API_KEY_SECRET` | `endpoint-proxy-api-key-secret` | HMAC secret for generated API keys |
| `MACHINE_ID_SALT` | `endpoint-proxy-salt` | Salt for stable machine ID hashing |
| `ENABLE_REQUEST_LOGS` | `false` | Write request/response logs under `logs/` |
| `REQUIRE_API_KEY` | `false` | Enforce Bearer API key on `/v1/*` routes |
| `AUTH_COOKIE_SECURE` | `false` | Force Secure flag on auth cookie (set true behind HTTPS) |
| `HTTP_PROXY` / `HTTPS_PROXY` | — | Outbound proxy for upstream provider calls |

Lowercase proxy variants (`http_proxy`, `https_proxy`) also supported.

## Tests

Located in `tests/` directory — separate package with vitest:

- **Unit tests** (`tests/unit/`): Translator tests for format conversions
- **Real provider tests** (`tests/real/`): Smoke tests against live providers (require provider config)
- **Integration tests**: Coverage across all model formats, combo routing, DB drivers, OAuth flows, embeddings
- **Config**: `vitest.config.js` with path aliases for `open-sse/` and `@/`
- Test files use `it.concurrent` extensively for parallel provider testing (`maxConcurrency: 60`)

Run: `cd tests && npm test` or single file with `npx vitest run path/to/file.test.js`

## Adding a New Provider

1. Add provider config in `open-sse/config/providers.js` and `open-sse/config/models.js`
2. Create executor in `open-sse/executors/` (or use `default.js` for standard OpenAI-compatible)
3. Add request/response translators in `open-sse/translator/request/` and `open-sse/translator/response/` if format differs from OpenAI
4. Register translator pair in `open-sse/translator/index.js`
5. Add OAuth/device-code handlers in `src/app/api/oauth/[provider]/` if applicable
6. Wire CLI config writer in `src/app/api/cli-tools/` if needed

## Barrel Export Gotcha

All component packages in `packages/components/` use `export default function`. When re-exporting through a barrel `index.js`, use:
```js
export { default as ComponentName } from "./ComponentName.js"; // correct
// NOT:
export { ComponentName } from "./ComponentName.js"; // undefined at runtime
```
