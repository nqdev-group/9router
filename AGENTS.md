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
- ESM in `src/` & `open-sse/`; CommonJS in `cli/` (the npm-published package). Node >=18 required.
- Next.js 16 with Webpack (turbopack disabled), standalone output. No formatter (eslint only).
- URL rewrites: `/v1/*` → `/api/v1/*`, `/codex/*` → `/api/v1/responses`
- Routes: `/api/*` = API routes; `/(dashboard)/dashboard/`, `/login` = pages
- Request flow: `route.js` → `src/sse/handlers/chat.js` (combo/account loop) → `open-sse/handlers/chatCore.js` (translate + dispatch) → executor → upstream
- Two SSE layers: `src/sse/` (Next.js route handlers) → `open-sse/` (standalone SSE core, re-usable outside Next.js)
- Proxy/auth: `src/dashboardGuard.js` is real middleware; `src/proxy.js` re-exports it
- Import aliases: `@/*` → `./src/*`, `open-sse/*` → `./open-sse/*`, `@9router/*` → `./packages/*`
- SQLite at `$DATA_DIR/db/data.sqlite` via repos in `src/lib/db/`; 4 driver adapters: better-sqlite3 (optional), sql.js (fallback), node:sqlite, bun:sqlite
- RTK token saver ON by default in `translateRequest()` (runs before format translation)
- Format translation: source → openai → target (OpenAI bridge)
- MITM layer in `src/mitm/` = separate server process (antigravity local proxy)
- `open-sse/executors/`: base.js, default.js (OpenAI-compat), specialized per non-standard provider
- `packages/components/` barrel export: use `export { default as X } from "./X.js"` NOT `export { X } from "./X.js"`

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
- Independent pricing source at `open-sse/services/modelsDevService.js`, persisted in SQLite KV scope `'modelsDevPricing'`
- Config: `src/shared/constants/modelsDevDefaults.js`; Repo: `src/lib/db/repos/modelsDevPricingRepo.js`
- API: `GET/PATCH /api/models-dev`, `POST/DELETE /api/models-dev/sync`; Dashboard at `/dashboard/settings/models-dev`
- Pricing resolver in `src/lib/db/repos/pricingRepo.js` consults models.dev when enabled + preferPrices
- Settings: `modelsDevEnabled: false`, `modelsDevPreferPrices: false`, `modelsDevAutoSyncHours: 24`
- Auto-sync on start if enabled + stale; 30s cooldown between manual syncs; model ID mapping strips provider prefix