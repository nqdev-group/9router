# Environment Variables

## Core Variables

| Variable | Default | Mô tả |
|----------|---------|-------|
| `JWT_SECRET` | Auto-generated (`~/.9router/jwt-secret`) | JWT signing secret cho dashboard auth cookie. Override để share across instances |
| `INITIAL_PASSWORD` | `123456` | Mật khẩu login đầu tiên khi chưa có saved hash |
| `DATA_DIR` | `~/.9router` (POSIX) / `%APPDATA%/9router` (Windows) | Main app data location (SQLite tại `$DATA_DIR/db/data.sqlite`) |
| `PORT` | Framework default | Service port |
| `HOSTNAME` | Framework default | Bind host |

## Auth & Security

| Variable | Default | Mô tả |
|----------|---------|-------|
| `API_KEY_SECRET` | `endpoint-proxy-api-key-secret` | HMAC secret cho generated API keys |
| `MACHINE_ID_SALT` | `endpoint-proxy-salt` | Salt cho stable machine ID hashing |
| `AUTH_COOKIE_SECURE` | `false` | Force `Secure` flag trên auth cookie (set `true` khi dùng HTTPS reverse proxy) |
| `REQUIRE_API_KEY` | `false` | Enforce Bearer API key trên `/v1/*` routes |

## Cloud Sync

| Variable | Default | Mô tả |
|----------|---------|-------|
| `BASE_URL` | `http://localhost:20128` | Server-side base URL dùng bởi cloud sync jobs (preferred) |
| `CLOUD_URL` | `https://9router.com` | Server-side cloud sync endpoint base URL (preferred) |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Backward-compatible/public base URL |
| `NEXT_PUBLIC_CLOUD_URL` | `https://9router.com` | Backward-compatible/public cloud URL |

## Logging & Observability

| Variable | Default | Mô tả |
|----------|---------|-------|
| `ENABLE_REQUEST_LOGS` | `false` | Write request/response logs tới `logs/` |
| `OBSERVABILITY_ENABLED` | `false` | Observability toggle |

## Outbound Proxy

| Variable | Mô tả |
|----------|-------|
| `HTTP_PROXY` | Outbound HTTP proxy URL |
| `HTTPS_PROXY` | Outbound HTTPS proxy URL |
| `ALL_PROXY` | All-protocol outbound proxy URL |
| `NO_PROXY` | Comma-separated domains to bypass proxy |

Lowercase variants (`http_proxy`, `https_proxy`, `all_proxy`, `no_proxy`) cũng được support.

## Runtime

| Variable | Mô tả |
|----------|-------|
| `NODE_ENV` | Set `production` cho deployment |
| `APP_DATA` | Windows app data path (dùng để resolve DATA_DIR) |
| `NEXT_TRACING_ROOT_MODE` | Set `workspace` cho CLI bundling |

## File Locations

### DATADIR

```
DEFAULT:
  Windows: %APPDATA%/9router
  POSIX:   ~/.9router

FILES:
  {DATA_DIR}/db/data.sqlite        # Main database
  {DATA_DIR}/db/backups/           # Auto backups
  {DATA_DIR}/db/legacy/*.json      # Legacy JSON files (one-time import)
  ./logs/                          # Request logs (khi ENABLE_REQUEST_LOGS=true)
```
