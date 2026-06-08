# OAuth Flows

## Giới thiệu

9Router hỗ trợ nhiều OAuth flow types để authenticate với các AI providers. Tất cả OAuth logic tập trung tại:

- **Handlers**: `src/lib/oauth/services/`
- **Constants**: `src/lib/oauth/constants/oauth.js`
- **Routes**: `src/app/api/oauth/[provider]/[action]/route.js`

## Flow Types

### Authorization Code PKCE

Sử dụng cho: Claude, Codex, GitLab

```
1. Browser: GET /api/oauth/{provider}/authorize
   → Response: { authUrl, codeVerifier, state }
   
2. User authorize: Browser mở authUrl → Provider login → Callback

3. Client: POST /api/oauth/{provider}/exchange { code, codeVerifier, state }
   → 9Router exchange code → get tokens
   → Tạo connection + save to DB
   → Response: { connection, success: true }
```

### Authorization Code (không PKCE)

Sử dụng cho: Antigravity, Gemini CLI, iFlow, Qoder, Cline

Tương tự PKCE nhưng không có code_verifier.

### Device Code Flow

Sử dụng cho: GitHub, Kiro, Qwen, Kimi Coding, Kilo Code, CodeBuddy

```
1. Client: GET /api/oauth/{provider}/device-code
   → Response: { deviceCode, userCode, verificationUrl, interval }

2. User: Mở verificationUrl, nhập userCode, authorize

3. Client: POST /api/oauth/{provider}/poll { deviceCode }
   (poll mỗi interval ms)
   → Pending: { success: false, error: "authorization_pending" }
   → Success: { success: true, connection }
   → Expired: { success: false, error: "expired_token" }
```

### Token Import

Sử dụng cho: Cursor

```
1. 9Router đọc token từ Cursor local SQLite DB
2. Tạo connection với token đã import
3. Auto-import chạy định kỳ
```

## Provider-Specific Flows

### Claude

```js
OAuth Config:
- Auth URL: https://claude.ai/ssu/api/v1/auth/authorize
- Token URL: https://claude.ai/ssu/api/v1/auth/token
- PKCE: Yes
- Scopes: openid profile email
```

### Codex

```js
OAuth Config:
- Auth URL: https://github.com/login/oauth/authorize
- Token URL: https://github.com/login/oauth/access_token
- PKCE: Yes
- Fixed port: 1455
- Extracts account info from id_token JWT
```

### GitHub Copilot

```js
Device Code Flow:
- Device URL: https://github.com/login/device/code
- Token URL: https://github.com/login/oauth/access_token
- User info: https://api.github.com/user
- Gets Copilot token from GitHub API sau khi auth
```

### Kiro AI

```js
Device Code Flow (3 steps):
1. AWS SSO OIDC client registration
2. Device authorization
3. Polling for tokens
Auth Scopes: AWS Builder ID, Google, GitHub
```

### Antigravity

```js
Authorization Code:
- Google OAuth
- Loads Code Assist project after auth
- Auto-onboards new users
- Project ID management
```

### Gemini CLI

```js
Authorization Code:
- Google OAuth
- Loads project ID via cloudcode-pa API
```

## Token Refresh

**File**: `open-sse/services/tokenRefresh.js`

Mỗi provider có refresh strategy riêng:

```js
refreshClaudeOAuthToken(credentials)
refreshGoogleToken(credentials)
refreshQwenToken(credentials)
refreshCodexToken(credentials)
refreshIflowToken(credentials)
refreshGitHubToken(credentials)
refreshCopilotToken(credentials)
```

Token refresh được gọi:
1. **Pre-check**: Trước khi execute request, kiểm tra expiry
2. **On 401/403**: Trong `chatCore.js`, khi nhận được 401/403
3. **Retry**: Retry 3 lần với delay nếu refresh fail

## Connection Lifecycle

```
Create (OAuth flow) → Test (validate) → Active
  ↓                                   ↓
Update (refresh token)          Rate Limited (cooldown)
  ↓                                   ↓
Delete (remove)                 Active (sau cooldown)
```
