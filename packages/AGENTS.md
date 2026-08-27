# packages

All new feature engines/UI/validation/provider helpers live here, imported into `src/` or `open-sse/` via `@9router/*` — never written inline in the app (root AGENTS.md hard rule). See root AGENTS.md for the full one-line-per-package table and the provider-registration flow; this file covers internals, resolution mechanics, and barrel conventions.

## Directory map

- `cmem/` — Context Memory Engine. Own `package.json` (`type:module`, `exports` map for `.`/`./core`/`./capture`/`./injection`/`./config`). `core/` (CmemEngine orchestrator, memoryStore, summarizer, contextBuilder, tokenBudget, configResolver), `capture/` (Observer), `injection/` (Injector + `formatters/{openai,claude,gemini}.js`), `utils/`, `config/defaults.js`. Root `index.js` barrels only `CmemEngine`.
- `components/` — Dashboard React UI, named exports only. Subfolders `caveman/`, `cmem/`, `cost/`, `rtk/`, `token-saver-report/` each have their own local `index.js` barrel, but the root `index.js` re-exports leaf files directly (`./rtk/IntensitySelector.js`), bypassing the subfolder barrels. Imports `@/shared/components/Card` and `@/shared/constants/providers` from `src/` — an accepted exception for shared UI atoms, not general license.
- `validation/` — schema files only, root `index.js` is `export * from "./xSchemas.js"` per file (cavemanSchemas, cmemSchemas, privacySchemas, rtkConfigSchemas, tierRoutingSchemas, tokenLimitSchemas). No subfolders.
- `providers/` — no root `index.js`. Consumed by deep import: `@9router/providers/pricing.js`, `@9router/providers/registry/index.js`. `registry/index.js` is hand-maintained (comment says so explicitly) — see root AGENTS.md "Provider system" for the add-a-provider steps.
- `provider-alert/` — Discord down/recovery alerts. Root `index.js` re-exports named fns from `engine.js` + `discord.js`.
- `services/` — single file `model.js`, no barrel. Consumed via deep import `@9router/services/model.js`; both call sites wrap it in try/catch so a missing/broken file fails open (see Pitfalls).
- `tier-routing/` — `index.js` barrels `taskClassifier.js`, `costSort.js`, `budgetGuard.js`, `config/defaults.js`.
- `token-limit-routing/` — same shape as `tier-routing/`: `index.js` + `config/defaults.js`.
- `mcpServer/` — 9Router exposing *itself* as an MCP server (Streamable HTTP, `@modelcontextprotocol/sdk`) so external MCP-native agents can call typed tools instead of parsing `skills/*/SKILL.md` and hand-rolling curl. Own `package.json` (`@9router/mcpServer`, `private:true`, `exports` for `.`/`./server`/`./http`). `index.js` exports `createMcpServer` (builds an `McpServer` with every tool registered, `lib/server.js`) and `handleMcpHttpRequest` (per-request stateless transport handler, `lib/transport/httpHandler.js`) — mounted at `src/app/api/v1/mcp/route.js` (thin route), reachable at `/v1/mcp`. Tools live in `lib/tools/*.js`, each proxying into the same `src/sse/handlers/*.js` functions the real `/v1/*` REST routes call (never `open-sse/handlers/*Core.js` directly — that would skip combo-loop/account-fallback), via the shared `lib/tools/shared/proxyRequest.js` helper (builds a synthetic `Request`, forwards the caller's bearer token as MCP `authInfo`). **Not** the same thing as `src/app/api/mcp/[plugin]/*` (`src/lib/mcp/stdioSseBridge.js`) — that route is 9Router acting as an MCP *client-side bridge*, spawning external local stdio MCP servers for dashboard tool cards; opposite direction, JWT/localhost-gated by `dashboardGuard.js`. This is exactly why the new route lives at `/v1/mcp` and not `/api/mcp` — the latter is already reserved by `dashboardGuard.js` for the bridge (JWT-only, no Bearer API key), which would silently break remote/tunnel access. See `plans/2026-08-27-mcp-server-tools-planning.md` for the full design rationale and remaining tool phases (media/web/usage/health tools not yet implemented).
- `utils/` — root barrel `index.ts` is the only `.ts` file under `packages/` and is an empty stub (`export {}`). The real util, `header.util.js`, is never routed through it — `src/shared/components/Header.js` imports it by deep path `@9router/utils/header.util` instead.
- `revidapi/` — Revid TTS adapter. `index.js` exports config plus `export { default as revidapiAdapter, synthesize } from "./adapter.js"` (uses `default as` because `adapter.js` has a default export).

## Alias resolution

- `@9router/*` → `./packages/*` is declared once, in `jsconfig.json` `compilerOptions.paths`. Next.js reads jsconfig paths natively and wires them into its own webpack/turbopack resolver — there is no separate alias entry in `next.config.mjs`.
- `packages/index.js` only exists so `@9router/*` resolves to a real directory; nothing imports it. Never delete it.
- Per-package `package.json` `exports` maps (`cmem/`, `mcpServer/`) look authoritative but are **not** what resolves `@9router/*` imports — the jsconfig path is a blanket file-path prefix (`@9router/<anything>` → `packages/<anything>`) that happens to line up with those subpaths without consulting them. Treat `exports` blocks as documentation, not the live mechanism.
- Plain `require("@9router/...")` inside `open-sse/services/model.js:172` and `open-sse/providers/registry/index.js:2` also resolves because Next compiles server files (including `open-sse/`) through the same webpack resolver, even under `next dev`. `tests/vitest.config.js` defines its own separate `@9router/` → `../packages/` alias since Next's resolver isn't involved there.

## Barrel export convention

Named exports re-exported from leaf files, one line per export:
```js
export { IntensitySelector } from "./rtk/IntensitySelector.js"; // packages/components/index.js
```
Use `export { default as X }` only when the source file itself uses `export default` (`packages/revidapi/index.js`). Not every package barrels everything — `providers/`, `services/`, `utils/`'s real content are consumed via deep import paths instead (see Directory map).

## How to add a package

1. `mkdir packages/<name>`, add `index.js` with named exports (or `export *` for flat schema dirs). No alias registration needed — `@9router/*` already covers any new folder.
2. Import as `@9router/<name>` (or a deep path like `@9router/<name>/sub/file.js` if skipping the barrel).
3. `package.json` is optional — only add one (`cmem/`, `mcpServer/` pattern) if you need explicit `type:module` or want documented subpath exports.
4. New AI provider → do not create a generic package; follow root AGENTS.md "Provider system" (`packages/providers/registry/{id}.js` + hand-edit `packages/providers/registry/index.js`).
5. Don't import from `src/` or `open-sse/` engine internals inside a new package (see Pitfalls); `components/` importing `@/shared/components/Card` is the one accepted precedent, not a general license.
6. No test folder inside `packages/` — tests for `packages/*` logic live in `tests/` (separate vitest package) like everything else.

## Pitfalls

| Pitfall | Where |
|---|---|
| `components/*` import `@/shared/components/Card`, `@/shared/constants/providers` from `src/` — a `packages/` → `src/` dependency, backwards from the intended direction | `packages/components/**/*.js` |
| `utils/index.ts` is TS and an empty stub; `header.util.js` is never barreled, always imported by deep path | `packages/utils/index.ts`, `packages/utils/header.util.js` |
| `providers/`, `services/` have no root `index.js` — importing bare `@9router/providers` / `@9router/services` resolves to nothing usable; must use the deep file path | `packages/providers/`, `packages/services/model.js` |
| `services/model.js` missing/broken is silently swallowed by the consumer's try/catch (fail-open) — extra model-prefix inference just disappears, no error | `open-sse/services/model.js:170-176` |
| `package.json` `exports` maps exist but aren't consulted by actual resolution (see Alias resolution) — don't gate what's importable by them | `packages/cmem/package.json`, `packages/mcpServer/package.json` |
| `components/index.js` re-exports leaf files directly, not through each subfolder's own `index.js` barrel — two barrels to keep in sync when adding a component | `packages/components/index.js` vs `packages/components/rtk/index.js` |
| `packages/PACKAGES-ANALYSIS.md` is a pre-existing, partially stale doc (still lists removed `kira-ai/`, missing `tier-routing/`/`token-limit-routing/`) — prefer this file | `packages/PACKAGES-ANALYSIS.md` |
