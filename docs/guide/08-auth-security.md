# Authentication & Security

## Dashboard Middleware

**File**: `src/dashboardGuard.js`

Next.js middleware bảo vệ tất cả routes trừ static assets.

### Access Control Rules

| Path | Access |
|------|--------|
| `/api/health`, `/api/init`, `/api/locale` | Public |
| `/api/auth/*` | Public |
| `/api/version` | Public (GET) |
| `/v1/*`, `/v1beta/*` | Public* |
| `/api/settings/*` | Protected |
| `/api/keys/*` | Protected |
| `/api/providers/*` | Protected |
| `/api/combos/*` | Protected |
| `/api/oauth/*` | Protected |
| `/api/shutdown` | Always protected |
| `/api/version/shutdown` | Always protected |
| `/api/version/update` | Always protected |
| `/api/oauth/cursor/auto-import` | Always protected |
| `/api/oauth/kiro/auto-import` | Always protected |
| `/api/mcp/*` | Local-only |
| `/api/tunnel/*` | Local-only |

*\* API key check bên trong handler*

## Dashboard Auth

### Login Flow

```http
POST /api/auth/login
Content-Type: application/json

{ "password": "123456" }
→ { token: "...", success: true }
```

- Sử dụng bcrypt để hash password
- JWT token cho session cookie
- `INITIAL_PASSWORD` env var cho lần login đầu (mặc định `123456`)
- Block tunnel login nếu `tunnelDashboardAccess` disabled

### OIDC Support

Hỗ trợ OpenID Connect qua:

```http
GET /api/auth/oidc/start?provider=google
GET /api/auth/oidc/callback?code=...&state=...
```

Cấu hình OIDC trong settings.

## API Key Auth

### Tạo API Key

```http
POST /api/keys
Content-Type: application/json

{ "name": "My Key", "machineId": "..." }
→ { key: "sk_9router_...", ... }
```

### Validate

```http
Authorization: Bearer sk_9router_...
```

Hoặc:

```http
x-api-key: sk_9router_...
```

### Cấu hình

Khi `REQUIRE_API_KEY=true` trong env:
- Tất cả `/v1/*` requests cần valid API key
- Trả về 401 nếu thiếu hoặc sai key

API key được tạo bằng HMAC với `API_KEY_SECRET`.

## OAuth Flows

### Authorization Code PKCE

Sử dụng cho: Claude, Codex, GitLab

1. `GET /api/oauth/{provider}/authorize` → Auth URL + PKCE data
2. User authorize trong browser
3. Callback → `POST /api/oauth/{provider}/exchange` → Tokens
4. Lưu connection trong DB

### Device Code Flow

Sử dụng cho: GitHub, Kiro, Qwen, Kimi Coding, Kilo Code, CodeBuddy

1. `GET /api/oauth/{provider}/device-code` → Device code + URL
2. User nhập code tại URL
3. `POST /api/oauth/{provider}/poll` → Poll cho token
4. Lưu connection trong DB

### Token Import

Sử dụng cho: Cursor

1. Đọc token từ Cursor local SQLite DB
2. Tạo connection với token đã import

## JWT Auth

- JWT token lưu trong cookie (configurable secure flag)
- Secret: `JWT_SECRET` env var (auto-generated nếu unset)
- Dashboard session verification qua JWT

## Security Best Practices

### Environment Variables

```bash
# BẮT BUỘC thay đổi trong production:
JWT_SECRET="your-strong-secret-here"
INITIAL_PASSWORD="strong-password-here"
API_KEY_SECRET="your-api-key-secret"
MACHINE_ID_SALT="your-salt"

# Khuyến nghị:
REQUIRE_API_KEY=true
AUTH_COOKIE_SECURE=true   # Khi dùng HTTPS
```

### Route Protection

- Dashboard management APIs: luôn yêu cầu auth
- CLI APIs (/v1/*): optional API key check
- Auto-import routes: always protected
- Shutdown routes: require `SHUTDOWN_SECRET` (production-blocked)

### Data Security

- Provider secrets (tokens, API keys) lưu trong SQLite
- Bảo vệ ở filesystem level
- Request logs có thể chứa sensitive data → cẩn thận khi enable `ENABLE_REQUEST_LOGS`

### Tunnel Access

- Tunnel dashboard access có thể bị disable
- Tailscale routes local-only
- MCP routes local-only
