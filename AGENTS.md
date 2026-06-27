# AGENTS.md

Compact guidance for agents working in this repo. See also `open-sse/AGENTS.md` (SSE core) and `tests/translator/AGENTS.md` (translator tests).

## Dev commands

```bash
# Install
npm install

# Dev server (port 20128)
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev

# Production build + start
npm run build && PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start
```

No separate lint/typecheck commands exist. ESLint config is `eslint.config.mjs` (next core-web-vitals).

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

Test aliases: `vitest.config.js` maps `open-sse/` and `@/` to `../open-sse/` and `../src/`.

Real provider tests gated by `RUN_REAL=1`. Read credentials from `~/.9router/db/data.sqlite`.

## Architecture in 30 seconds

```
CLI → /v1/* (next rewrites) → src/sse/handlers/chat.js (combo loop, account fallback)
  → open-sse/handlers/chatCore.js (format detect, translate, dispatch)
    → open-sse/executors/[provider].js → upstream API
  ← open-sse/translator/response/*.js (normalize back)
  ← src/lib/usageDb.js (log usage)
→ Dashboard → src/app/(dashboard)/dashboard/* → src/app/api/* (CRUD)
```

## Path aliases (jsconfig.json)

- `@/` → `./src/*`
- `@9router/*` → `./packages/*` (components, cmem, validation, utils, mcpServer, kira-ai, providers, revidapi)
- `open-sse/` → `./open-sse/*`

## New features: always in packages/

**All new features/engines/engines must live in `packages/` and be imported via `@9router/*`.**

This keeps the main `src/` thin. Dashboard pages in `src/app/(dashboard)/` import UI components from `packages/components/`. Pipeline hooks in `open-sse/handlers/chatCore.js` import logic from `packages/cmem/`, `packages/validation/`, etc. via `@9router/...`.

```
packages/
  cmem/          → @9router/cmem        (context memory engine)
  components/    → @9router/components/ (UI: token-saver, caveman, cost, rtk, cmem)
  validation/    → @9router/validation/ (schemas)
  kira-ai/       → @9router/kira-ai/    (Kira AI integration)
  providers/     → @9router/providers/  (provider helpers)
  mcpServer/     → @9router/mcpServer/  (MCP server)
  utils/         → @9router/utils/      (shared utilities)
```

Never create new dirs under `src/` for feature logic. Only `src/app/api/` (routes) and `src/lib/` (infra) may grow.

## Key boundaries

| Dir | What it owns |
|-----|-------------|
| `open-sse/` | Standalone SSE engine — providers, executors, translators, RTK, config. Has own AGENTS.md. |
| `src/sse/` | Request entry (`chat.js`), auth services, logger — bridges Next.js routes to open-sse. |
| `src/app/api/` | Next.js API routes — V1 compat, dashboard CRUD, OAuth, CLI tools. |
| `src/app/(dashboard)/` | React dashboard pages. |
| `packages/` | All new feature engines, UI packages, validation, utils — imported via `@9router/*`. |
| `tests/` | Separate vitest package. |

## Provider system

Providers defined in `open-sse/providers/registry/{id}.js` → built into `open-sse/config/providers.js` (barrel re-export). Models in `open-sse/config/providerModels.js`.

**To add a provider:**
1. Copy `open-sse/providers/REGISTRY_TEMPLATE.js` → `open-sse/providers/registry/{id}.js`
2. Add models to `open-sse/config/providerModels.js`
3. Regenerate `open-sse/providers/registry/index.js` (auto-generated import list — don't hand-edit)
4. Optionally add executor in `open-sse/executors/` + register in `open-sse/executors/index.js`
5. Optionally add translators in `open-sse/translator/request/` + `response/`, import in `open-sse/translator/index.js`

## Translation pipeline

OpenAI is the intermediate format: `source → OpenAI → target`. Direct routes (e.g. `claude:kiro`) skip the lossy double-hop. Translators self-register via `register(from, to, reqFn, resFn)` as import side-effects — **new files MUST be imported in `open-sse/translator/index.js`**.

Known OpenAI-bridge losses: thinking/reasoning, non-base64 images, tool ids, is_error, audio, tool_choice:"none".

## RTK compression

Runs **before** translation in chatCore. Compresses `tool_result` content in-place. **Fail-open** — any error returns null, body untouched. Never throw out of RTK.

## DB driver chain

Priority order (see `src/lib/db/driver.js`):
- Bun: `bun:sqlite` → `sql.js`
- Node: `better-sqlite3` → `node:sqlite` (≥22.5) → `sql.js`

`better-sqlite3` is optional — `npm install` doesn't fail without it. sql.js is guaranteed fallback.

All DB access goes through `getAdapter()` from `src/lib/db/driver.js`. Repos in `src/lib/db/repos/`.

## Barrel export pattern

All component packages use `export default function`. Re-export through barrel `index.js`:
```js
export { default as ComponentName } from "./ComponentName.js"; // ✓ correct
export { ComponentName } from "./ComponentName.js"; // ✗ undefined at runtime
```

## Custom server

`custom-server.js` wraps Next.js standalone server — derives client IP from TCP socket (unspoofable), strips XFF headers for security. Used in production (`node custom-server.js`). Docker CMD uses this.

## CMEM (context memory)

Opt-in context memory engine in `packages/cmem/`. Hooked into chatCore pipeline (inject + capture). Dashboard UI under Compression Context section. Reuses 9router DB with `cmem_*` tables. Disabled by default (privacy implications).

## Environment

Key vars (see `.env.example` for full list): `JWT_SECRET`, `INITIAL_PASSWORD`, `DATA_DIR`, `PORT`, `BASE_URL` (server-side, preferred), `CLOUD_URL`, `API_KEY_SECRET`, `REQUIRE_API_KEY`, `AUTH_COOKIE_SECURE`.

Proxy: `HTTP_PROXY`/`HTTPS_PROXY` (and lowercase variants) for upstream calls.

## Pitfalls

- `open-sse/config/providers.js` re-exports from `providers/index.js` — don't declare PROVIDERS there directly
- `registry/index.js` is auto-generated — regenerate after adding registry files, don't hand-edit
- Binary formats (kiro EventStream, cursor protobuf, commandcode NDJSON) don't round-trip through OpenAI translator
- RTK/caveman/ponytail inject hooks run in `chatCore.js` before translation — all fail-open
- `tests/` is a separate npm package — install deps there before running tests
