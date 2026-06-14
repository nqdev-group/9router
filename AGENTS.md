# 9Router Agent Guide

## Essential Commands
- Dev: `PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev`
- Build: `npm run build`
- Start: `PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start`
- Bun variants: `dev:bun`, `build:bun`, `start:bun`
- Full test suite: `cd tests && npm test` (requires NODE_PATH=/tmp/node_modules)
- Single unit test: `cd tests && NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/<name>.test.js`
- Single translator test: `cd tests && npx vitest run --config tests/vitest.config.js "tests/translator/<name>.test.js"`
- Lint: `npx eslint .`
- TypeScript check: handled by Next.js build (no tsconfig.json; TS is JSdoc-only)

## Key Architecture
- ESM in `src/` & `open-sse/`; CommonJS in `cli/` (npm-published package). Node >=18 required.
- Next.js 16 with Webpack (turbopack disabled), standalone output. ESLint flat config.
- URL rewrites: `/v1/*` → `/api/v1/*`, `/codex/*` → `/api/v1/responses`
- Routes: `/api/*` = API routes; `/(dashboard)/dashboard/`, `/login` = pages
- Request flow: `route.js` → `src/sse/handlers/chat.js` (combo/account loop) → `open-sse/handlers/chatCore.js` (translate + dispatch) → executor → upstream
- Two SSE layers: `src/sse/` (Next.js route handlers) → `open-sse/` (standalone SSE core, re-usable outside Next.js)
- Import aliases: `@/*` → `./src/*`, `open-sse/*` → `./open-sse/*`, `@9router/*` → `./packages/*`
- SQLite at `$DATA_DIR/db/data.sqlite` via repos in `src/lib/db/`; 4 driver adapters: better-sqlite3 (optional), sql.js (fallback), node:sqlite, bun:sqlite
- Pipeline order (chatCore.js): PrivacyEngine → RTK compress (default ON) → Caveman inject → CMEM inject → format translation → dispatch → capture CMEM observation
- `packages/components/` barrel export: use `export { default as X } from "./X.js"` NOT `export { X } from "./X.js"`

## Pipeline Components
- **PrivacyEngine** (`open-sse/privacy/`): masks API keys, passwords, tokens in request body before any processing
- **RTK Token Saver** (`open-sse/rtk/`): 21 content-aware compression filters (git-diff, grep, ls, tree, build output…). Auto-detects tool_result type. ON by default. Supports Caveman mode (`open-sse/rtk/caveman.js`) for terse output responses.
- **CMEM** (`packages/cmem/`): contextual memory engine. Captures → stores (SQLite FTS5) → injects relevant context. Opt-in, disabled by default. Hooks in chatCore.js pre-dispatch (inject) + post-response (capture).
- **Format translation** (`open-sse/translator/`): source → openai → target (OpenAI bridge). 11 FORMATS (openai, claude, gemini, gemini-cli, openai-responses, antigravity, kiro, cursor, commandcode, ollama, vertex).
- **MITM layer** (`src/mitm/`): separate server process (antigravity local proxy)

## Handlers & Executors
- Core handlers in `open-sse/handlers/`: chatCore.js (main), embeddingsCore.js, imageGenerationCore.js, sttCore.js, ttsCore.js, responsesHandler.js
- 22 executors in `open-sse/executors/`: default.js (OpenAI-compat) + specialized per non-standard provider (antigravity, codex, cursor, kiro, vertex, gemini-cli, github, qwen, qoder, iflow, commandcode, ollama-local, opencode, opencode-go, grok-web, perplexity-web, azure, xiaomi-tokenplan, mimo-free)

## Environment Variables (Runtime)
All from `.env.example`. Notable:
- `JWT_SECRET` - Dashboard auth (auto-gen to `~/.9router/jwt-secret` if unset)
- `INITIAL_PASSWORD` - First login (default: 123456)
- `DATA_DIR` - SQLite + password hash location (default: `~/.9router`)
- `PORT`/`HOSTNAME` - HTTP bind (default: 20128/0.0.0.0)
- `BASE_URL`/`CLOUD_URL` - Server-side URLs (preferred over `NEXT_PUBLIC_*` variants)
- `REQUIRE_API_KEY` - Enforce Bearer auth on `/v1/*` (default: false)
- `ENABLE_REQUEST_LOGS` - Write request/response logs to `logs/` (default: false)
- `AUTH_COOKIE_SECURE` - Force Secure flag on auth cookie (set true behind HTTPS)
- `OBSERVABILITY_ENABLED` - Observability telemetry (default: true)
- `API_KEY_SECRET`/`MACHINE_ID_SALT` - HMAC secrets for key generation
- `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY` - Outbound proxy (lowercase variants also supported)

## Testing Specifics
- Vitest in `tests/vitest.config.js` with `open-sse/` and `@/` path aliases
- Tests require `NODE_PATH=/tmp/node_modules` due to workspace hoisting (`cd tests && npm test` handles this)
- 56 unit test files in `tests/unit/` + 9 translator test files + 1 real test = 66 total
- Translator tests MUST `import "./registerAll.js"` at top (require() in translator/index.js silently no-ops under vitest/ESM → false pass)
- Real provider tests require `RUN_REAL=1` (read credentials from local sqlite DB)
- `it.concurrent` used extensively; `maxConcurrency: 60` for parallel provider tests
- Known-bug convention: `it.fails(...)` for known unfixed bugs (turns red when fixed → switch to `it`)
- Translator bug exposure docs: `tests/translator/AGENTS.md`

## Development Workflow
- Provider configs: `open-sse/config/providerModels.js` (model catalog, 942 lines) and `providers.js` (auth/endpoints)
- Add new provider:
  1. Add to providerModels.js and providers.js
  2. Create executor or reuse default.js for OpenAI-compatible
  3. Add translators in `open-sse/translator/request/` and `response/` if format differs from OpenAI
  4. Register in `open-sse/translator/index.js` ensureInitialized()
  5. Add OAuth handlers in `src/app/api/oauth/[provider]/` if needed
- `skills/` contains end-user agent skills (URLs to paste into Claude/Cursor/etc.) — not dev tooling
- Docker: multi-arch (linux/amd64 + linux/arm64); auto-published to GHCR + Docker Hub on `v*` tags

## Packages (`packages/`)
- `cmem/` - Contextual memory engine (SQLite FTS5, opt-in)
- `components/` - Dashboard UI components (barrel export via index.js)
- `kira-ai/` - Kiro AI integration
- `mcpServer/` - MCP server
- `validation/` - Validation schemas (e.g. cmemSchemas.js)
- `utils/` - Shared utilities
