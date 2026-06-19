# 9Router Agent Guide

## Essential Commands
- Dev: `PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev`
- Build: `npm run build`
- Start: `PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start`
- Bun: `dev:bun`, `build:bun`, `start:bun`
- Full test suite: `cd tests && npm test` (requires NODE_PATH=/tmp/node_modules)
- Single unit test: `cd tests && NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/<name>.test.js`
- Single translator test: `cd tests && npx vitest run --config tests/vitest.config.js "tests/translator/<name>.test.js"`
- Lint: `npx eslint .` (flat config in `eslint.config.mjs`)

## Key Architecture
- ESM in `src/` & `open-sse/`; CommonJS in `cli/` (npm-published). Node >=18.
- Next.js 16 with Webpack (turbopack disabled), standalone output. TS is JSdoc-only (no tsconfig.json).
- URL rewrites: `/v1/*` → `/api/v1/*`, `/codex/*` → `/api/v1/responses`
- Routes: `src/app/api/v1/*` = 17 API route handlers; `/(dashboard)/dashboard/`, `/login` = pages
- SSE layers: `src/sse/` (Next.js route handlers) → `open-sse/` (standalone SSE core, reusable outside Next.js)
- Request flow: `route.js` → `src/sse/handlers/chat.js` (combo/account loop) → `open-sse/handlers/chatCore.js` (translate + dispatch) → executor → upstream
- Pipeline order (chatCore.js): PrivacyEngine → RTK compress (default ON) → Caveman inject → CMEM inject → format translation → dispatch → capture CMEM observation
- Import aliases: `@/*` → `./src/*`, `open-sse/*` → `./open-sse/*`, `@9router/*` → `./packages/*`
- SQLite at `$DATA_DIR/db/data.sqlite`; 4 driver adapters: better-sqlite3 (optional), sql.js (fallback), node:sqlite, bun:sqlite
- `packages/components/` barrel export: `export { default as X } from "./X.js"` (NOT `export { X } from "./X.js"`)

## Pipeline Components
- **PrivacyEngine** (`open-sse/privacy/`): masks API keys, passwords, tokens before any processing
- **RTK Token Saver** (`open-sse/rtk/`): 21 content-aware compression filters auto-detected per tool_result. ON by default. Caveman mode for terse output (`open-sse/rtk/caveman.js`).
- **CMEM** (`packages/cmem/`): contextual memory engine (SQLite FTS5). Opt-in, disabled by default. Hooks: pre-dispatch inject + post-response capture in chatCore.js.
- **Format translation** (`open-sse/translator/`): source → openai → target (OpenAI bridge). 13 FORMATS: openai, openai-responses, openai-response, claude, gemini, gemini-cli, vertex, codex, antigravity, kiro, cursor, ollama, commandcode.
- **MITM layer** (`src/mitm/`): separate server process (antigravity local proxy)

## Handlers & Executors
- Core handlers in `open-sse/handlers/`: chatCore.js (main), embeddingsCore.js, imageGenerationCore.js, sttCore.js, ttsCore.js, responsesHandler.js, plus sub-folders (chatCore/, imageProviders/, ttsProviders/, embeddingProviders/, search/, fetch/)
- 18 specialized executors in `open-sse/executors/` (+ DefaultExecutor for generic OpenAI-compat): antigravity, azure, gemini-cli, github, iflow, qoder, kiro, codex, cursor, vertex, qwen, opencode, opencode-go, grok-web, perplexity-web, ollama-local, commandcode, xiaomi-tokenplan, mimo-free. `getExecutor(provider)` falls back to DefaultExecutor when absent.

## Provider Registry
- `open-sse/providers/registry/` is the single source of truth (~100 files, one per provider). Each file exports an object with id, category, display, transport, oauth, models, etc.
- `open-sse/providers/registry/index.js` is auto-generated static imports — do NOT hand-edit.
- `open-sse/providers/REGISTRY_TEMPLATE.js` is the canonical template for adding a new provider.
- `open-sse/config/providers.js` is a barrel re-export from `../providers/index.js` (not primary source).
- `open-sse/config/providerModels.js` (925 lines) is still the model catalog.

## Environment Variables (Runtime)
All from `.env.example`. Notable:
- `JWT_SECRET` — Dashboard auth (auto-gen to `~/.9router/jwt-secret` if unset)
- `INITIAL_PASSWORD` — First login (default: 123456)
- `DATA_DIR` — SQLite + password hash location (default: `~/.9router`)
- `PORT`/`HOSTNAME` — HTTP bind (default: 20128/0.0.0.0)
- `BASE_URL`/`CLOUD_URL` — Server-side URLs (preferred over `NEXT_PUBLIC_*` variants)
- `REQUIRE_API_KEY` — Enforce Bearer auth on `/v1/*` (default: false)
- `ENABLE_REQUEST_LOGS` — Write request/response logs to `logs/` (default: false)
- `AUTH_COOKIE_SECURE` — Force Secure on auth cookie (set true behind HTTPS)
- `OBSERVABILITY_ENABLED` — Observability telemetry (default: true)
- `API_KEY_SECRET`/`MACHINE_ID_SALT` — HMAC secrets for key generation
- `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY` — Outbound proxy (lowercase variants supported)

## Testing Specifics
- Vitest in `tests/vitest.config.js` with `open-sse/` + `@/` aliases
- Tests require `NODE_PATH=/tmp/node_modules` due to workspace hoisting (`cd tests && npm test` handles this)
- 56 unit test files + 9 translator test files + 1 real test = 66 total
- Translator tests MUST `import "./registerAll.js"` at top (require() in translator/index.js silently no-ops under vitest/ESM → false pass)
- Real provider tests: `RUN_REAL=1` (reads credentials from local sqlite DB)
- `it.concurrent` used extensively; `maxConcurrency: 60` for parallel provider tests
- `it.fails(...)` for known unfixed bugs (turns red when fixed → switch to `it`)
- Bug catalog: `tests/translator/AGENTS.md`

## Packages (`packages/`)
- `cmem/` — Contextual memory engine (SQLite FTS5, opt-in)
- `components/` — Dashboard UI components (caveman/, cmem/, cost/, rtk/, token-saver/)
- `kira-ai/` — Kiro AI integration
- `mcpServer/` — MCP server
- `validation/` — Validation schemas (e.g. cmemSchemas.js)
- `utils/` — Shared utilities

## Gotchas
- `open-sse/handlers/chatCore.js.orig` exists — stale backup, delete when seen.
- Provider config lives in `open-sse/providers/registry/`, NOT `config/providers.js` (which is just a barrel).
- `open-sse/providers/registry/index.js` is auto-generated — add new files to the `registry/` dir then regenerate the index (not by hand).
- RTK runs before format translation — affects what the translator sees.
- `skills/` contains end-user agent skills (URLs for Claude/Cursor/etc.) — not dev tooling.
- Docker: multi-arch (linux/amd64 + linux/arm64); auto-published to GHCR + Docker Hub on `v*` tags.
