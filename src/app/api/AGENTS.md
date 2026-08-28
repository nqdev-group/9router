# src/app/api

Next.js App Router API routes: `/v1` + `/v1beta` OpenAI/Gemini-compat gateway, dashboard CRUD, OAuth device/PKCE flows, CLI-tool config writers, host-process control. One `route.js` per endpoint, exported `GET`/`POST`/`PATCH`/`DELETE`/`OPTIONS` handlers.

## Directory map

- `v1/`, `v1beta/` — LLM API compat surface. `v1/chat/completions`, `v1/models[/[kind]]`, `v1/embeddings`, `v1/images`, `v1/messages` (Claude), `v1/responses` (Codex), `v1/audio`, `v1/videos`, `v1/search`, `v1/web`. Reached via `next.config.mjs` rewrites (`/v1/:path*` → `/api/v1/:path*`, `/codex/:path*` → `/api/v1/responses`).
- `combos/`, `keys/`, `providers/`, `provider-nodes/`, `proxy-pools/`, `models/`, `models-dev/`, `model-token-limits/`, `media-providers/`, `settings/`, `usage/`, `pricing/`, `tags/` — dashboard CRUD, one dir per resource, `[id]` for item routes.
- `auth/` — dashboard login (`login`, `logout`, `status`, `reset-password`, `oidc`, `saml`).
- `oauth/[provider]/[action]/` — generic OAuth handler (device-code + PKCE), one file dispatching on `action` (authorize/exchange/device-code/poll/…). Plus provider-specific dirs (`oauth/codex`, `oauth/cursor`, `oauth/gitlab`, `oauth/iflow`, `oauth/kiro`) for flows the generic handler can't cover (e.g. auto-import, cookie auth).
- `cli-tools/` — reads/writes local CLI config files (`~/.claude/settings.json`, `~/.codex/config.toml`, etc.) for Claude Code, Codex, Cline, Copilot, Droid, Kilo, Opencode, and others. One dir per tool, `all-statuses/` aggregates.
- `headroom/`, `pxpipe/`, `tunnel/` — spawn/manage local sidecar processes (compress proxy, MITM proxy, Tailscale/tunnel). `start`/`stop`/`restart`/`status` sub-routes.
- `translator/` — dashboard "test a translation" playground (`load`, `save`, `send`, `translate`, `console-logs`).
- `mcp/[plugin]/` — MCP server registry/tools proxy for dashboard.
- `health/`, `init/`, `locale/`, `version/`, `shutdown/` — process/app-level endpoints.

## Request/response pattern

Every handler follows the same shape (e.g. `combos/route.js:10-18`, `keys/route.js:8-16`):

```js
export async function GET() {
  try {
    const combos = await getCombos();          // call into @/lib or open-sse
    return NextResponse.json({ combos });
  } catch (error) {
    console.log("Error fetching combos:", error);
    return NextResponse.json({ error: "Failed to fetch combos" }, { status: 500 });
  }
}
```

- Plain `NextResponse.json(...)` everywhere — **no shared response helper** exists (`src/lib/apiResponse.js` or similar was searched for and does not exist).
- Errors are always `{ error: <string> }`, but the string source is inconsistent: static message (`combos/route.js:16`), `error.message` (`oauth/[provider]/[action]/route.js:238`, `settings/rtk/route.js:33`) — pick one per new route but don't expect the codebase to be uniform.
- `export const dynamic = "force-dynamic"` (sometimes + `revalidate = 0`) is set on routes that must not be statically cached (`combos/route.js:4`, `keys/route.js:5`, `settings/rtk/route.js:5-6`).
- SSE/streaming routes (`v1/chat/completions/route.js`) return whatever the delegated handler returns directly (a `Response`), not `NextResponse.json`; they also implement `OPTIONS` for CORS preflight.

## The thin-route rule

Per root `AGENTS.md` ("New features: always in packages/"), `src/app/api/` may grow but **only as thin routes calling into `packages/*`** (or `@/lib`, `open-sse/`, `src/sse/`) — never reimplementing feature logic inline.

Compliant example — `v1/chat/completions/route.js:29-34`: the route does init + delegates everything to `@/sse/handlers/chat.js`:
```js
export async function POST(request) {
  await ensureInitialized();
  return await handleChat(request);
}
```
`combos/route.js` and `keys/route.js` follow the same shape: parse body, call one or two `@/lib/localDb` functions, return. `oauth/[provider]/[action]/route.js` is thin per-branch (each `if (action === ...)` calls into `@/lib/oauth/providers` or `@/lib/oauth/utils/server`), but the file itself is 455 lines because it fans out over ~10 actions × ~6 providers with provider-specific branching inline (still delegates the actual OAuth/network work).

## Auth & middleware

Auth is **centralized**, not per-route: `src/dashboardGuard.js` `proxy(request)` is invoked once (via middleware) for every request and gates by path prefix before the route handler runs:

- `PUBLIC_API_PATHS` (health, init, locale, auth/login|logout|status|oidc|saml, version, settings/require-login) — no auth.
- `PUBLIC_PREFIXES` (`/v1`, `/v1beta`, `/api/v1`, `/api/v1beta`, `/codex`) — no dashboardGuard auth; the LLM API enforces its own key check inside the handler (`REQUIRE_API_KEY`, local-request bypass, CLI token, or `validateApiKey`) — see `isPublicLlmApi`/`canAccessPublicLlmApi` in `dashboardGuard.js:134-158`.
- `ALWAYS_PROTECTED` (`shutdown`, `settings/database`, `version/shutdown|update`, `oauth/cursor|kiro/auto-import`) — JWT or CLI token required regardless of `requireLogin` setting.
- `PROTECTED_API_PATHS` (settings, keys, providers, provider-nodes, proxy-pools, combos, models, usage, oauth, media-providers, pricing, tags, cli-tools, mcp, translator, tunnel) — JWT cookie (`verifyDashboardAuthToken`) or CLI token, unless `requireLogin` is disabled in settings.
- `LOCAL_ONLY_PATHS` (cli-tools/cowork-settings, cli-tools/antigravity-mitm, mcp/, tunnel/tailscale-*, oauth/*/auto-import, auth/reset-password, headroom/start|stop|proxy) — routes that spawn child processes or read host secrets; restricted to loopback origin + auth, or CLI token (`dashboardGuard.js:70-87, 160-165`).
- Deny-by-default: any `/api/*` path not in an allow-list still requires JWT or CLI token (`dashboardGuard.js:224-229`).

No route file itself checks auth — individual `route.js` files assume the guard already ran. The one exception is the LLM API's own key check inside `src/sse/handlers/chat.js` (outside this dir), since `/v1/*` bypasses dashboardGuard's JWT path entirely.

## How to add a route

1. Create `src/app/api/<resource>/route.js` (or `[id]/route.js`, `[...path]/route.js` for catch-all).
2. Export the HTTP verbs you need; parse `request.json()` / `request.nextUrl.searchParams`, call into `@/lib/*` (DB/infra) or `@9router/*` (feature logic) or `open-sse/*` (engine), wrap in try/catch, return `NextResponse.json`.
3. If the path needs auth different from the deny-by-default JWT/CLI-token rule, add it to the matching list in `src/dashboardGuard.js` (`PUBLIC_API_PATHS`, `ALWAYS_PROTECTED`, `PROTECTED_API_PATHS`, or `LOCAL_ONLY_PATHS`) — routes are NOT self-securing.
4. If the endpoint needs a public rewrite alias (like `/v1`), add it to `next.config.mjs` rewrites, not here.
5. Any non-trivial logic (parsing, validation, orchestration beyond 1-2 calls) belongs in `packages/*` or `@/lib/*`, imported into the route — don't grow business logic inside `route.js`.

## Pitfalls

| Issue | Where |
|---|---|
| `cli-tools/*-settings/route.js` files reimplement full CLI-config read/write/merge/exec logic inline (135-387 lines each: `exec()`, `fs.readFile`/`writeFile`, JSON merge) instead of delegating to `packages/` — violates the thin-route rule as written, though this is long-standing/upstream-style code, not a new addition | `cli-tools/claude-settings/route.js`, `cli-tools/cowork-settings/route.js` (387 lines), `cli-tools/openclaw-settings/route.js` |
| Large routes with real business logic embedded (probing providers, resolving live model catalogs) rather than a thin call into `packages/` | `providers/validate/route.js` (650 lines, `probeWebProvider`/`probeMediaProvider` inline), `v1/models/route.js` (576 lines, `LIVE_MODEL_RESOLVERS` map inline), `providers/[id]/models/route.js` (598 lines) |
| No shared response/error helper — every route hand-rolls `NextResponse.json({ error })`; message format (static string vs `error.message`) is inconsistent across routes | repo-wide, e.g. `combos/route.js:16` vs `oauth/[provider]/[action]/route.js:238` |
| Auth is enforced centrally in `src/dashboardGuard.js`, not in route files — adding a new path under an existing prefix (e.g. `settings/newthing`) inherits that prefix's rule automatically; a genuinely new top-level prefix does NOT get any protection until added to one of the path lists | `src/dashboardGuard.js:40-87` |
| `/v1*` and `/v1beta*` skip dashboardGuard's JWT check entirely (`PUBLIC_PREFIXES`) — auth for these is `REQUIRE_API_KEY` + `validateApiKey`/CLI-token/local-request checks inside `dashboardGuard.js` itself, not in the route or in `src/sse/` | `src/dashboardGuard.js:36-37, 134-158` |
