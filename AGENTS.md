# AGENTS.md

Compact guidance for agents working in this repo. See also `open-sse/AGENTS.md` (SSE core), `tests/translator/AGENTS.md` (translator tests), `CLAUDE.md` (complementary).

## Dev commands

```bash
# Install
npm install

# Dev server (port 20128; default 20127 w/o PORT)
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev

# Bun alternative (same env vars)
npm run dev:bun

# Production build + custom-server (production-grade: strips XFF, derives client IP from TCP)
npm run build && PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start
```

No separate lint/typecheck scripts exist. ESLint config at `eslint.config.mjs` (next core-web-vitals) for IDE integration only.

## Tests

Tests live in `tests/` as a **separate package** (own `package.json`, own vitest). NOT in root.

```bash
cd tests && npm install && npm test

# Single file
cd tests && npx vitest run --reporter=verbose path/to/file.test.js

# Pattern match
cd tests && npx vitest run --reporter=verbose -t "combo-routing"
```

**Windows gotcha**: `tests/package.json` uses `NODE_PATH=/tmp/node_modules` (Unix-only). On Windows use:
```bash
cd tests && npx vitest run --reporter=verbose --config ./vitest.config.js
```

Test aliases (from `tests/vitest.config.js`): `open-sse/` → `../open-sse/`, `@/` → `../src/`, `@9router/` → `../packages/`.

Real provider tests gated by `RUN_REAL=1`. Read credentials from `~/.9router/db/data.sqlite`.

**Translator test gotcha**: `open-sse/translator/index.js` uses `require(...)` (bundler-only) to lazy-load translators. Under vitest/ESM, `require` silently no-ops → empty registry → false passes. Every test calling `translateRequest`/`translateResponse` MUST `import "./registerAll.js"` at the top. See `tests/translator/AGENTS.md`.

## Architecture in 30 seconds

```
CLI → /v1/* (next rewrites) → src/app/api/v1/* (thin route)
  → src/sse/handlers/chat.js (combo loop, account fallback)
    → open-sse/handlers/chatCore.js (pre-hooks, format detect, translate, dispatch)
      → open-sse/executors/[provider].js → upstream API
    ← open-sse/translator/response/*.js (normalize back)
    ← src/lib/usageDb.js (log usage)
→ Dashboard → src/app/(dashboard)/dashboard/* → src/app/api/* (CRUD)
```

Next.js rewrites (`next.config.mjs`): `/v1/:path*` → `/api/v1/:path*`, `/responses` → `/api/v1/responses`, `/codex/:path*` → `/api/v1/responses`.

## Path aliases (jsconfig.json)

- `@/` → `./src/*`
- `@9router/*` → `./packages/*` (components, cmem, validation, utils, mcpServer, kira-ai, providers, revidapi)
- `open-sse/` → `./open-sse/*`

`packages/index.js` is a stub file that makes `@9router/*` resolve; never delete it.

## New features: always in packages/

**All new features/engines must live in `packages/` and be imported via `@9router/*`.**

```
packages/
  cmem/          → @9router/cmem        (context memory engine)
  components/    → @9router/components/ (UI: caveman, cmem, cost, rtk, token-saver-report)
  validation/    → @9router/validation/ (schemas)
  kira-ai/       → @9router/kira-ai/    (Kira AI integration)
  providers/     → @9router/providers/  (extra provider registry)
  mcpServer/     → @9router/mcpServer/  (MCP server)
  utils/         → @9router/utils/      (shared utilities)
  revidapi/      → @9router/revidapi/   (Revid API)
```

Dashboard pages in `src/app/(dashboard)/` import UI from `packages/components/`. Pipeline hooks in `open-sse/handlers/chatCore.js` import logic from `packages/cmem/`, `packages/validation/`, etc. Never create new dirs under `src/` for feature logic. Only `src/app/api/` (routes) and `src/lib/` (infra) may grow.

## Key boundaries

| Dir | What it owns |
|-----|-------------|
| `open-sse/` | Standalone SSE engine — providers, executors, translators, RTK, config, PrivacyEngine. Has own AGENTS.md. |
| `src/sse/` | Request entry (`chat.js`), auth services, logger — bridges Next.js routes to open-sse. |
| `src/app/api/` | Next.js API routes — V1 compat, dashboard CRUD, OAuth, CLI tools. 26 sub-dirs (auth, combos, providers, keys, settings, usage, oauth, etc.). |
| `src/app/(dashboard)/` | React dashboard pages. |
| `packages/` | All new feature engines, UI packages, validation, utils — imported via `@9router/*`. |
| `tests/` | Separate vitest package. |
| `cli/` | Standalone npm CLI package (`9router` on npm). Pack/publish from here. |
| `src/shared/` | Shared React components, hooks, constants, services. |
| `src/store/` | Zustand stores (providerStore, settingsStore, themeStore, userStore, notificationStore, headerSearchStore). |

## Provider system

Providers defined in `open-sse/providers/registry/{id}.js` → built into `open-sse/providers/index.js` (PROVIDERS + PROVIDER_MODELS). `open-sse/config/providers.js` re-exports from `providers/index.js`. Models in `open-sse/config/providerModels.js` re-exports PROVIDER_MODELS from `providers/index.js` + adds CORE_PROVIDER_MODELS.

**To add a provider:**
1. Copy `open-sse/providers/REGISTRY_TEMPLATE.js` → `open-sse/providers/registry/{id}.js`
2. Add models to `open-sse/config/providerModels.js`
3. Regenerate `open-sse/providers/registry/index.js` (auto-generated import list — don't hand-edit)
4. Optionally add executor in `open-sse/executors/` + register in `open-sse/executors/index.js`
5. Optionally add translators in `open-sse/translator/request/` + `response/`, import in `open-sse/translator/index.js`

## Translation pipeline

OpenAI is the intermediate format: `source → OpenAI → target`. Direct routes (e.g. `claude:kiro`) skip the lossy double-hop. Translators self-register via `register(from, to, reqFn, resFn)` as import side-effects — **new files MUST be imported in `open-sse/translator/index.js`**.

Known OpenAI-bridge losses: thinking/reasoning, non-base64 images, tool ids, is_error, audio, tool_choice:"none".

## Token-saving engines (all fail-open, run before translation)

All run in `chatCore.js` before translation, in order: PrivacyEngine → RTK → Headroom → Caveman → Ponytail → CMEM inject → CMEM capture (post-response).

| Engine | What it does | Location |
|--------|-------------|----------|
| **RTK** | Compress `tool_result` content in-place (git-diff, grep, ls, tree, etc.). 21 filters. Auto-detect from first 1KB. Default ON. | `open-sse/rtk/` |
| **Headroom** | Optional external `/v1/compress` proxy. Fail-open if proxy down. | `open-sse/rtk/headroom.js` |
| **Caveman** | Inject caveman-speak system prompt → terse replies, up to 65% output savings. | `open-sse/rtk/caveman.js` |
| **Ponytail** | Inject "lazy senior dev" prompt (Lite/Full/Ultra) → YAGNI-first, minimal code. | `open-sse/rtk/ponytail.js` |
| **CMEM** | Context memory engine. Opt-in, disabled by default. Uses `cmem_*` tables in the 9router DB. | `packages/cmem/` |

Preprocessors in `open-sse/rtk/preprocessors/` (contentCleaner, etc.) run before filters.

## DB driver chain

Priority order (see `src/lib/db/driver.js`):
- Bun: `bun:sqlite` → `sql.js`
- Node: `better-sqlite3` → `node:sqlite` (≥22.5) → `sql.js`

`better-sqlite3` is optional (`optionalDependencies`) — `npm install` doesn't fail without it. sql.js is guaranteed fallback.

All DB access goes through `getAdapter()` from `src/lib/db/driver.js`. Repos in `src/lib/db/repos/` (including `cmemRepo.js`, `settingsRepo.js`, `combosRepo.js`, `usageRepo.js`, etc.).

## Barrel export pattern

Components in `packages/components/` use **named exports** (`export function X`). Re-export through barrel `index.js`:
```js
export { IntensitySelector } from "./rtk/IntensitySelector.js"; // ✓ named export
```
Use `export { default as X }` only when source file uses `export default function`.

## Custom server & production

`custom-server.js` wraps Next.js standalone server — derives client IP from TCP socket (unspoofable), strips XFF headers for security. Used in production (`node custom-server.js`). Docker CMD uses this.

Docker: `Dockerfile`, `docker-compose.yml`, `DOCKER.md`, `BUILD-DOCKER.md`. Images published at `decolua/9router` (Docker Hub) and `ghcr.io/decolua/9router` (GHCR).

## Auth & middleware

- **Dashboard auth**: JWT cookie via `src/dashboardGuard.js`. Serves dashboard, `/api/`, `/oauth/`, `/v1/`, `/v1beta/` paths with JWT, API key, or CORS auth depending on route.
- **API key enforcement**: Set `REQUIRE_API_KEY=true` to require Bearer token on `/v1/*` (recommended for internet-exposed deploys).
- **OAuth flows**: `src/app/api/oauth/[provider]/[action]/route.js` — handler per provider with device-code and PKCE flows.

## Environment

Key vars (see `.env.example` for full list): `JWT_SECRET`, `INITIAL_PASSWORD`, `DATA_DIR`, `PORT`, `BASE_URL` (server-side, preferred), `CLOUD_URL`, `API_KEY_SECRET`, `REQUIRE_API_KEY`, `AUTH_COOKIE_SECURE`, `ENABLE_REQUEST_LOGS`, `OBSERVABILITY_ENABLED`.

`BASE_URL` vs `NEXT_PUBLIC_BASE_URL`: server runtime prefers `BASE_URL` for internal sync callbacks. `NEXT_PUBLIC_*` vars kept for backward compat.

Proxy: `HTTP_PROXY`/`HTTPS_PROXY` (and lowercase variants) for upstream calls.

## Pitfalls

- `open-sse/config/providers.js` re-exports from `providers/index.js` — don't declare PROVIDERS there directly
- `open-sse/providers/registry/index.js` is auto-generated — regenerate after adding registry files, don't hand-edit
- Binary formats (kiro EventStream, cursor protobuf, commandcode NDJSON) don't round-trip through OpenAI translator
- RTK/caveman/ponytail/headroom inject hooks run in `chatCore.js` before translation — all fail-open, never throw
- `tests/` is a separate npm package — install deps there before running tests
- `packages/index.js` is required for `@9router/*` path alias resolution — don't delete
- `.opencode/opencode.jsonc` is a bare schema reference; no custom instructions configured there
