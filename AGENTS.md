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

## Key Architecture
- Pure JS: ESM in `src/` & `open-sse/` (import/export); CommonJS in `cli/` (require)
- Next.js 16 with Webpack (turbopack disabled), standalone output
- URL rewrites: `/v1/*` → `/api/v1/*`, `/codex/*` → `/api/v1/responses`
- App vs API routes: `/api/*` = API routes; `/(dashboard)/dashboard/`, `/login` = pages
- Request flow: `route.js` → `chat.js` (combo/account loop) → `chatCore.js` (translate + dispatch) → executor → upstream
- Proxy/auth: `src/dashboardGuard.js` is the real Express integration; `src/proxy.js` re-exports it
- Import aliases (jsconfig.json): `@/*` → `./src/*`, `open-sse/*` → `./open-sse/*`, `@9router/*` → `./packages/*`
- SQLite at `$DATA_DIR/db/data.sqlite` via repos in `src/lib/db/`; 4 driver adapters: better-sqlite3 (native, optional), sql.js (WASM fallback), node:sqlite, bun:sqlite
- RTK token saver default-on in `translateRequest()` (compresses tool_result content)
- Format translation uses OpenAI bridge: source → openai → target
- MITM layer in `src/mitm/` for antigravity local proxy (separate server process)
- `open-sse/executors/base.js` = BaseExecutor class; `default.js` for OpenAI-compatible; 19 specialized executors
- `open-sse/services/` = 11 service modules (combo, model, provider, usage, tokenRefresh, accountFallback, oauthCredentialManager...)
- `packages/components/` has isolated feature components (token-saver, caveman, cost, rtk); barrel export gotcha: use `export { default as X } from "./X.js"` NOT `export { X } from "./X.js"`

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
- 51 unit test files in `tests/unit/` + 9 translator test files in `tests/translator/` = 60 total
- Translator tests MUST `import "./registerAll.js"` at top (require() in translator/index.js silently no-ops under vitest/ESM → false pass)
- Real provider tests require `RUN_REAL=1` (read credentials from local sqlite DB)
- `it.concurrent` used extensively; `maxConcurrency: 60` for parallel provider tests
- Known-bug convention: `it.fails(...)` for known unfixed bugs (turns red when fixed → switch to `it`)
- Translator bug exposure docs: `tests/translator/AGENTS.md`

## Development Workflow
- Provider configs: `open-sse/config/providerModels.js` (model catalog) and `providers.js` (auth/endpoints)
- Add new provider:
  1. Add to providerModels.js and providers.js
  2. Create executor or reuse default.js for OpenAI-compatible
  3. Add translators in `open-sse/translator/request/` and `response/` if format differs from OpenAI
  4. Register in `open-sse/translator/index.js` ensureInitialized()
  5. Add OAuth handlers in `src/app/api/oauth/[provider]/` if needed
- `skills/` contains end-user agent skills (URLs to paste into Claude/Cursor/etc.) — not dev tooling
- CLI tool integration: Set endpoint to `http://localhost:20128/v1` with API key from dashboard
- Docker: multi-arch (linux/amd64 + linux/arm64); auto-published to GHCR + Docker Hub on `v*` tags

## Models.dev Pricing Integration
- Independent data source at `open-sse/services/modelsDevService.js`
- Fetches `https://models.dev/catalog.json` → persists in SQLite KV scope `'modelsDevPricing'`
- Config defaults in `src/shared/constants/modelsDevDefaults.js`
- Repo: `src/lib/db/repos/modelsDevPricingRepo.js` (getSnapshot, saveSnapshot, getModelMap, saveModelMap)
- API: `GET /api/models-dev` (status), `PATCH /api/models-dev` (settings), `POST /api/models-dev/sync` (sync), `DELETE /api/models-dev/sync` (clear)
- Dashboard: `/dashboard/settings/models-dev` (toggle enabled/preferPrices/autoSyncHours)
- Pricing resolver: `src/lib/db/repos/pricingRepo.js` — `getPricingForModel()` consults models.dev when enabled + preferPrices
- Settings defaults in `src/lib/db/repos/settingsRepo.js`: `modelsDevEnabled: false`, `modelsDevPreferPrices: false`, `modelsDevAutoSyncHours: 24`
- Auto-sync on server start if enabled + data stale (background, non-blocking)
- Sync rate limit: 30s cooldown between manual syncs (HTTP 429)
- Model ID mapping: strip provider/ prefix → exact match → fallback