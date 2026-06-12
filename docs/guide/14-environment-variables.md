# Environment Variables

## Core Application

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `DATA_DIR` | `~/.9router` (POSIX) / `%APPDATA%/9router` (Windows) | Main data directory (SQLite DB, config, backups) | `src/lib/dataDir.js`, `src/lib/mitmAliasCache.js`, `src/lib/appUpdater.js`, `src/lib/updater/updater.js`, `src/mitm/paths.js`, `cli/` |
| `PORT` | Framework default (Next.js) | Service HTTP port (commonly 20128) | `src/app/api/models/test/ping.js`, `src/app/api/providers/[id]/test-models/route.js` |
| `HOSTNAME` | Framework default | Bind host (commonly `0.0.0.0`) | next.config.mjs |
| `NODE_ENV` | — | Controls dev/production behavior. Set `production` for deployment | `open-sse/utils/debugLog.js`, `src/mitm/config.js`, shutdown/update route guards |
| `TRAY_MODE` | — | Set to `"1"` by CLI when running in system tray mode; app reads to adjust shutdown/update behavior | `cli/cli.js` (set), `src/lib/appUpdater.js` (read) |

## Authentication & Secrets

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `JWT_SECRET` | Auto-generated (`~/.9router/jwt-secret`) | JWT signing secret for dashboard auth cookie. Override to share across instances | `src/lib/auth/dashboardSession.js` |
| `AUTH_COOKIE_SECURE` | `false` | Force `Secure` flag on auth cookie. Set `true` behind HTTPS reverse proxy | `src/lib/auth/dashboardSession.js` |
| `INITIAL_PASSWORD` | `123456` | First-login password when no saved hash exists | `src/app/api/auth/login/route.js` |
| `SHUTDOWN_SECRET` | — | Secret required to invoke the shutdown API endpoint | `src/app/api/shutdown/route.js` |
| `API_KEY_SECRET` | `endpoint-proxy-api-key-secret` | HMAC secret for generated API keys | `src/shared/utils/apiKey.js` |
| `MACHINE_ID_SALT` | `endpoint-proxy-salt` | Salt for stable machine ID hashing | `src/shared/utils/machineId.js` |
| `REQUIRE_API_KEY` | `false` | Enforce Bearer API key on `/v1/*` routes | `src/mitm/handlers/base.js` |
| `KIMI_CODING_OAUTH_CLIENT_ID` | `17e5f671-d194-4dfb-9706-5516cb48c098` | OAuth client ID for Kimi Coding provider | `src/lib/oauth/constants/oauth.js` |

## URLs & Cloud Sync

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `BASE_URL` | — | Server-side base URL (preferred for cloud sync jobs) | `src/lib/auth/oidc.js` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Backward-compatible/public base URL | `src/lib/auth/oidc.js` |
| `CLOUD_URL` | `https://9router.com` | Server-side cloud sync endpoint base URL | `src/lib/db/repos/settingsRepo.js` |
| `NEXT_PUBLIC_CLOUD_URL` | `https://9router.com` | Client-side cloud sync URL | `src/lib/db/repos/settingsRepo.js`, dashboard CLI tool components (3 files) |
| `NEXT_PUBLIC_BASE_PATH` | — | Base path for gitbook deployment | `gitbook/next.config.mjs` |

## Outbound Proxy (for upstream provider calls)

| Variable | Description | Source |
|----------|-------------|--------|
| `HTTP_PROXY` / `http_proxy` | Outbound HTTP proxy URL | `open-sse/utils/proxyFetch.js`, `src/lib/network/outboundProxy.js` |
| `HTTPS_PROXY` / `https_proxy` | Outbound HTTPS proxy URL | `open-sse/utils/proxyFetch.js`, `src/lib/network/outboundProxy.js` |
| `ALL_PROXY` / `all_proxy` | All-protocol outbound proxy URL | `open-sse/utils/proxyFetch.js`, `src/lib/network/outboundProxy.js` |
| `NO_PROXY` / `no_proxy` | Comma-separated domains to bypass proxy | `open-sse/utils/proxyFetch.js`, `src/lib/network/outboundProxy.js` |
| `NINE_ROUTER_PROXY_MANAGED` | — | Internal flag tracking whether proxy was set programmatically via UI | `src/lib/network/outboundProxy.js` |
| `NINE_ROUTER_PROXY_URL` | — | Internal — the managed proxy URL value | `src/lib/network/outboundProxy.js` |
| `NINE_ROUTER_NO_PROXY` | — | Internal — the managed no-proxy value | `src/lib/network/outboundProxy.js` |

Lowercase variants (`http_proxy`, `https_proxy`, `all_proxy`, `no_proxy`) are also read.

## Logging, Observability & Debug

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `ENABLE_REQUEST_LOGS` | `false` | Write request/response logs to `logs/` | `src/app/api/settings/route.js` |
| `ENABLE_TRANSLATOR` | `false` | Toggle translator logging | `src/app/api/settings/route.js` |
| `OBSERVABILITY_ENABLED` | `false` | Toggle request details observability | `src/lib/db/repos/requestDetailsRepo.js` |
| `OBSERVABILITY_MAX_RECORDS` | `1000` | Max stored observability records | `src/lib/db/repos/requestDetailsRepo.js` |
| `OBSERVABILITY_BATCH_SIZE` | `50` | Batch insert size | `src/lib/db/repos/requestDetailsRepo.js` |
| `OBSERVABILITY_FLUSH_INTERVAL_MS` | `5000` | Flush interval (ms) | `src/lib/db/repos/requestDetailsRepo.js` |
| `OBSERVABILITY_MAX_JSON_SIZE` | `5` | Max JSON size per record (KB) | `src/lib/db/repos/requestDetailsRepo.js` |
| `DEBUG_MITM` | — | Toggle MITM proxy debug logging | `src/mitm/handlers/base.js` |
| `CURSOR_STREAM_DEBUG` | — | Toggle Cursor executor stream debug | `open-sse/executors/cursor.js` |
| `CURSOR_PROTOBUF_DEBUG` | — | Toggle Cursor protobuf debug | `open-sse/utils/cursorProtobuf.js` |

## Updater (self-update system)

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `UPDATER_PKG_NAME` | `9router` | Package name for update checking | `src/lib/updater/updater.js` |
| `UPDATER_PORT` | `20129` | Updater server port | `src/lib/updater/updater.js` |
| `UPDATER_TAIL_LINES` | `8` | Lines to tail from update log | `src/lib/updater/updater.js` |
| `UPDATER_RETRIES` | `3` | Max download retries | `src/lib/updater/updater.js` |
| `UPDATER_RETRY_DELAY_MS` | `5000` | Delay between retries (ms) | `src/lib/updater/updater.js` |
| `UPDATER_LINGER_MS` | `30000` | Process linger time before exit (ms) | `src/lib/updater/updater.js` |
| `UPDATER_WAIT_MIN_MS` | `3000` | Min wait after signal (ms) | `src/lib/updater/updater.js` |
| `UPDATER_WAIT_MAX_MS` | `15000` | Max wait after signal (ms) | `src/lib/updater/updater.js` |
| `UPDATER_WAIT_CHECK_MS` | `500` | Poll interval for process health (ms) | `src/lib/updater/updater.js` |
| `UPDATER_APP_PORT` | `20128` | Main app port updater talks to | `src/lib/updater/updater.js` |
| `UPDATER_RELAUNCH` | — | Set to `"1"` to trigger relaunch after update | `src/lib/updater/updater.js` |
| `UPDATER_RELAUNCH_CMD` | — | Command for relaunch | `src/lib/updater/updater.js` |
| `UPDATER_RELAUNCH_ARGS` | `[]` | JSON array of args for relaunch | `src/lib/updater/updater.js` |
| `UPDATER_SCRIPT_PATH` | — | Custom update script path | `src/lib/appUpdater.js` |

## Azure Executor

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `AZURE_ENDPOINT` | — | Azure OpenAI endpoint URL | `open-sse/executors/azure.js` |
| `AZURE_API_VERSION` | — | Azure API version string | `open-sse/executors/azure.js` |
| `AZURE_DEPLOYMENT` | — | Azure deployment name | `open-sse/executors/azure.js` |
| `AZURE_ORGANIZATION` | — | Azure organization | `open-sse/executors/azure.js` |
| `OPENAI_API_KEY` | — | Fallback API key (used when provider has no key set) | `open-sse/executors/azure.js` |

## MITM Proxy

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `MITM_SERVER_PATH` | — | Path to the MITM server binary | `src/mitm/manager.js`, `src/shared/services/initializeApp.js` |
| `MITM_ROUTER_BASE` | `http://localhost:20128` | Base URL for MITM to route traffic back to 9Router | `src/mitm/handlers/base.js` |

## Tunnel

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `TUNNEL_WORKER_URL` | `https://abc-tunnel.us` | Cloudflare tunnel worker URL | `src/lib/tunnel/cloudflare/config.js` |
| `TUNNEL_TRANSPORT_PROTOCOL` | `quic` (hardcoded as `DEFAULT_QUICK_TUNNEL_PROTOCOL`) | Transport protocol for cloudflared tunnel | `src/lib/tunnel/cloudflare/cloudflared.js` |
| `CLOUDFLARED_PROTOCOL` | — | Fallback tunnel protocol (same purpose as above) | `src/lib/tunnel/cloudflare/cloudflared.js` |

## Next.js Build

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `NEXT_PHASE` | — | Next.js build phase identifier (`phase-production-build`, `phase-export`, `phase-static`) | `src/shared/services/bootstrap.js` |
| `NEXT_DIST_DIR` | `.next` | Custom dist directory for Next.js output | `next.config.mjs` |
| `NEXT_TRACING_ROOT_MODE` | — | Set `workspace` for CLI bundling | `next.config.mjs` |
| `NINEROUTER_PROXY_CLIENT_MAX_BODY_SIZE` | `128mb` | Max body size for proxy client | `next.config.mjs` |

## Platform / OS

| Variable | Description | Source |
|----------|-------------|--------|
| `APPDATA` | Windows app data path (Roaming) | Multiple files — used to resolve DATA_DIR, startup paths, config locations |
| `LOCALAPPDATA` | Windows local app data path | `src/app/api/cli-tools/cowork-settings/route.js`, `src/app/api/oauth/cursor/auto-import/route.js` |
| `SystemRoot` | Windows system root (typically `C:\Windows`) | `src/mitm/manager.js`, `src/mitm/dns/dnsConfig.js` (hosts file path) |
| `PATH` | System PATH for subprocess execution | Tailscale (extended path), CLI tools (npm path prefix on Windows), code settings |
| `XDG_CONFIG_HOME` | Linux config home | `src/app/api/cli-tools/jcode-settings/route.js` |
| `DISPLAY` | X11 display (Linux tray detection) | `cli/src/cli/tray/tray.js`, `cli/src/cli/tray/autostart.js` |
| `CODESPACES` | GitHub Codespaces detection | `cli/cli.js` |
| `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN` | Codespaces port forwarding detection | `cli/cli.js` |

## Scripts (dev/CI only)

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `GLM_API_ENDPOINT` | `https://api.z.ai/api/anthropic/v1/messages` | Endpoint for README translation | `scripts/translate-readme.js` |
| `GLM_API_MODEL` | `glm-5` | Model for README translation | `scripts/translate-readme.js` |
| `GLM_API_KEY` | — | API key for README translation | `scripts/translate-readme.js` |
| `GLM_MAX_TOKENS` | `32000` | Max tokens for translation | `scripts/translate-readme.js` |
| `GLM_TEMPERATURE` | `0.3` | Temperature for translation | `scripts/translate-readme.js` |
| `TRANSLATE_BATCH_SIZE` | `2` | Parallel language batch count | `scripts/translate-readme.js` |

## Tests

| Variable | Default | Description | Source |
|----------|---------|-------------|--------|
| `RUN_REAL` | — | Set `"1"` to run real provider smoke tests | `tests/translator/real/smoke-providers.real.test.js` |
| `REAL_PROVIDERS` | — | Comma-separated provider filter for smoke tests | `tests/translator/real/smoke-providers.real.test.js` |
| `RUN_E2E` | — | Set `"1"` to run RTK E2E tests | `tests/unit/rtk.e2e.test.js`, `tests/unit/rtk.multi-provider.e2e.test.js` |
| `RTK_E2E_PORT` | `20128` | Port for RTK E2E tests | `tests/unit/rtk.e2e.test.js`, `tests/unit/rtk.multi-provider.e2e.test.js` |
| `RTK_E2E_LOG` | — | Log file path for RTK E2E | `tests/unit/rtk.e2e.test.js`, `tests/unit/rtk.multi-provider.e2e.test.js` |
| `AG_CACHE_TEST` | — | Set `"1"` to run Antigravity cache tests | `tests/unit/antigravity-cache.test.js` |

## Data Directory Layout

```
Default:
  Windows: %APPDATA%/9router
  POSIX:   ~/.9router

Files:
  {DATA_DIR}/db/data.sqlite        # Main database (providers, combos, keys, usage, settings)
  {DATA_DIR}/db/backups/           # Auto-generated database backups
  {DATA_DIR}/db/legacy/*.json      # Legacy JSON files (one-time import on migration)
  {DATA_DIR}/jwt-secret            # Auto-generated JWT secret (if not overridden)
  ./logs/                          # Request logs (when ENABLE_REQUEST_LOGS=true)
```

## Quick Reference: Where Envs Are Read

| Area | Key Files |
|------|-----------|
| Data directory | `src/lib/dataDir.js`, `cli/hooks/sqliteRuntime.js`, `cli/src/cli/api/client.js` |
| Auth | `src/lib/auth/dashboardSession.js`, `src/app/api/auth/login/route.js` |
| SSE Core | `open-sse/utils/proxyFetch.js`, `open-sse/executors/azure.js`, `open-sse/executors/cursor.js` |
| Dashboard | `src/app/(dashboard)/dashboard/cli-tools/` (NEXT_PUBLIC_CLOUD_URL) |
| Updates | `src/lib/updater/updater.js`, `src/lib/appUpdater.js` |
| Network proxy | `src/lib/network/outboundProxy.js` |
| MITM | `src/mitm/manager.js`, `src/mitm/handlers/base.js`, `src/mitm/paths.js` |
| Tunnel | `src/lib/tunnel/cloudflare/cloudflared.js`, `src/lib/tunnel/cloudflare/config.js` |
| Observability | `src/lib/db/repos/requestDetailsRepo.js` |
| CLI | `cli/cli.js`, `cli/src/cli/tray/tray.js`, `cli/src/cli/tray/autostart.js` |
| OAuth | `src/lib/oauth/constants/oauth.js`, `src/lib/auth/oidc.js` |
| CLI tool settings | `src/app/api/cli-tools/` (multiple route files) |
