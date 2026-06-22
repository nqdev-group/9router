# Provider Alert Plan — Discord Webhook

**Mục tiêu:** Cảnh báo Discord khi tất cả accounts vĩnh viễn (non-transient) trong 1 provider đều down. Recovery notification khi provider hồi phục.

**Ngày tạo:** 2026-06-15
**Trạng thái:** PLANNED

---

## 1. Tổng quan

```
Request fail → markAccountUnavailable() [auth.js]
  → set modelLock + testStatus (existing)
  → (fire & forget) engine.checkAllAccountsDown(provider, connections)
    → 0 available AND >0 permanently_down?
    → debounce 15 phút OK?
    → engine.formatAlertMessage() → discord.send()
```

```
Request success → clearAccountError() [auth.js]
  → clear modelLock (existing)
  → (fire & forget) engine.checkRecovery(provider, connections)
    → wasAllDown AND now available > 0?
    → engine.formatRecoveryMessage() → discord.send()
```

---

## 2. Phân loại trạng thái account

| Trạng thái | Điều kiện | Ví dụ | Alert? |
|---|---|---|---|
| `available` | `isActive=1`, không `modelLock`, `testStatus≠"unavailable"` | Account khỏe | — |
| `temporarily_down` | `isActive=1`, có `modelLock` active | Rate limit (429), 5xx, backoff | **Không** |
| `permanently_down` | `isActive=0` HOẶC (`testStatus="unavailable"` AND `errorCode ∈ [401,402,403,404]`) | Auth hết hạn, account bị disable, API key sai | **Có** |

**Alert condition:**
- `available === 0` AND `permanently_down > 0`
- Không alert khi tất cả đều `temporarily_down` (rate-limit sẽ hết)

**Recovery condition:**
- Provider đã `wasAllDown` VÀ bây giờ `available > 0` → gửi recovery alert

---

## 3. Package: `packages/provider-alert/`

### 3.1. Cấu trúc

```
packages/provider-alert/
├── index.js       # re-export public API
├── engine.js      # check all-down, debounce, recovery state
├── discord.js     # POST webhook, handle 429 rate limit
└── README.md      # (optional)
```

### 3.2. `engine.js` — Logic chính

**Exports:**
- `checkAllAccountsDown(provider, connections)` → `{ shouldAlert, downCount, totalCount, errors[] }` hoặc `null`
- `checkRecovery(provider, connections, wasAllDown)` → `{ recovered }` hoặc `null`
- `formatAlertMessage(provider, downCount, totalCount, errors)` → Discord embed object
- `formatRecoveryMessage(provider)` → Discord embed object (màu xanh)
- `setLastAlertTime(provider, timestamp)` — lưu debounce time
- `getLastAlertTime(provider)` — đọc debounce time

**State management (in-memory):**
- `debounceMap`: `Map<provider, lastAlertAt>` — debounce 15 phút
- `allDownState`: `Map<provider, wasAllDown>` — track recovery

**Logic `checkAllAccountsDown`:**

```js
function checkAllAccountsDown(provider, connections, cooldownMin = 15) {
  // 1. Phân loại mỗi account
  for (const c of connections) {
    if (c.isActive === 0) { permanentlyDown++; errors.push(...) }
    else if (isModelLockActive(c)) { temporarilyDown++ }
    else if (c.testStatus === "unavailable" && PERMANENT_ERROR_CODES.has(c.errorCode)) { permanentlyDown++; errors.push(...) }
    else if (c.testStatus !== "unavailable") { available++ }
    else { temporarilyDown++ }  // unavailable but no active lock + not permanent error = backoff expired
  }

  // 2. Kiểm tra điều kiện
  if (available > 0) return null;
  if (permanentlyDown === 0) return null; // all temporarily down

  // 3. Kiểm tra debounce
  const lastAlert = debounceMap.get(provider);
  if (lastAlert && (Date.now() - lastAlert) < cooldownMin * 60000) return null;

  // 4. Should alert
  allDownState.set(provider, { wasAllDown: true });
  return { shouldAlert: true, downCount: permanentlyDown, totalCount: connections.length, errors };
}
```

**Logic `checkRecovery`:**

```js
function checkRecovery(provider, connections) {
  const state = allDownState.get(provider);
  if (!state || !state.wasAllDown) return null;

  const available = connections.filter(c => c.isActive === 1 && !isModelLockActive(c) && c.testStatus !== "unavailable");
  if (available.length > 0) {
    state.wasAllDown = false;
    return { recovered: true, availableCount: available.length };
  }
  return null;
}
```

### 3.3. `discord.js` — Webhook sender

**Exports:**
- `sendDiscordAlert(webhookUrl, embed)` → `boolean` (success/fail)

**Logic:**
- POST `application/json` đến Discord webhook URL
- Xử lý HTTP 429 → respect `Retry-After` header, retry 1 lần
- Timeoute: 5s
- Không throw khi fail — log lỗi, return `false`
- Fire-and-forget pattern (caller không await)

**Format embed:**
```json
{
  "embeds": [{
    "title": "🚨 Provider Down: {provider}",
    "description": "Tất cả {totalCount} accounts đều permanent failure.",
    "color": 15158332,
    "fields": [
      { "name": "Accounts", "value": "0/{totalCount} available", "inline": true },
      { "name": "Lỗi", "value": "account1: 401 Invalid token\naccount2: 403 Forbidden" }
    ],
    "timestamp": "ISO8601"
  }]
}
```

**Recovery embed:**
```json
{
  "title": "✅ Provider Recovered: {provider}",
  "description": "Provider đã có accounts khả dụng trở lại.",
  "color": 3066993,
  "fields": [
    { "name": "Available", "value": "{availableCount}/{totalCount} accounts" }
  ]
}
```

### 3.4. `index.js` — Re-export

```js
export { checkAllAccountsDown, checkRecovery, formatAlertMessage, formatRecoveryMessage, setLastAlertTime, getLastAlertTime } from './engine.js';
export { sendDiscordAlert } from './discord.js';
```

---

## 4. Integration points (app code)

### 4.1. `src/lib/db/repos/settingsRepo.js` — Thêm settings keys

```js
// Vào DEFAULT_SETTINGS object
providerAlertEnabled: false,
providerAlertWebhookUrl: "",
providerAlertCooldown: 15,  // minutes
providerAlertIgnoreProviders: "[]",  // JSON array, VD: ["opencode-free"]
```

### 4.2. `src/sse/services/auth.js` — Hooks

#### Trong `markAccountUnavailable()` (sau khi set error state)

```js
// ~dòng 237: sau console.error(...)
if (settings.providerAlertEnabled && settings.providerAlertWebhookUrl) {
  const { checkAllAccountsDown, formatAlertMessage, sendDiscordAlert } = await import('@9router/provider-alert');
  const { getProviderConnections } = await import('@/lib/db/repos/connectionsRepo');
  const db = await getDb();
  const providerId = resolveProviderId(provider);
  const connections = getProviderConnections({ provider: providerId, isActive: true });
  const { PERMANENT_ERROR_CODES } = await import('@9router/provider-alert');
  const result = checkAllAccountsDown(providerId, connections, settings.providerAlertCooldown, PERMANENT_ERROR_CODES);
  if (result?.shouldAlert) {
    const embed = formatAlertMessage(providerId, result.downCount, result.totalCount, result.errors);
    sendDiscordAlert(settings.providerAlertWebhookUrl, embed).catch(() => {});
  }
}
```

#### Trong `clearAccountError()` (sau khi clear state)

```js
// ~dòng 260: sau khi clear modelLock + testStatus
if (settings.providerAlertEnabled && settings.providerAlertWebhookUrl) {
  const { checkRecovery, formatRecoveryMessage, sendDiscordAlert } = await import('@9router/provider-alert');
  const { getProviderConnections } = await import('@/lib/db/repos/connectionsRepo');
  const db = await getDb();
  const providerId = resolveProviderId(currentConnection.provider);
  const connections = getProviderConnections({ provider: providerId, isActive: true });
  const result = checkRecovery(providerId, connections);
  if (result?.recovered) {
    const embed = formatRecoveryMessage(providerId, result.availableCount, connections.length);
    sendDiscordAlert(settings.providerAlertWebhookUrl, embed).catch(() => {});
  }
}
```

**Lưu ý:** Fire-and-forget pattern — không await, không block request. Import dynamic để tránh circular dependency.

### 4.3. *(Optional phase 2)* `src/app/api/settings/alert/route.js` — API routes

- `GET /api/settings/alert` — return current alert settings
- `PUT /api/settings/alert` — update settings (webhook URL, enabled, cooldown, ignored providers)

---

## 5. Settings keys

| Key | Type | Default | Mô tả |
|-----|------|---------|-------|
| `providerAlertEnabled` | boolean | `false` | Bật/tắt alert |
| `providerAlertWebhookUrl` | string | `""` | Discord webhook URL |
| `providerAlertCooldown` | number | `15` | Số phút giữa 2 cảnh báo liên tiếp |
| `providerAlertIgnoreProviders` | string (JSON) | `"[]"` | Danh sách provider bỏ qua |

---

## 6. Risk & Mitigations

| Risk | Giải pháp |
|------|-----------|
| **Alert storm** khi nhiều request fail cùng lúc | Debounce 15 phút + in-memory Map + fire-and-forget |
| **Discord webhook rate limit** | Handle 429, respect `Retry-After`, timeout 5s |
| **Webhook URL plaintext trong DB** | Phase 1 OK (Discord webhook có token riêng). Phase 2 có thể encrypt |
| **Dynamic import perf** | Node.js cache ESM modules, import 1 lần sẽ re-use |
| **Provider noAuth (Kiro, OpenCode Free)** | `providerAlertIgnoreProviders` default chứa các provider này |
| **Server restart mất debounce state** | Acceptable — alert lại 1 lần không catastrophic, cooldown ngắn 15 phút |
| **`markAccountUnavailable` không gọi cho mọi error** | Check auth.js: chỉ gọi khi `result.success === false` — đúng scope |

---

## 7. Files cần tạo/sửa

| File | Action | Mô tả |
|------|--------|-------|
| `packages/provider-alert/index.js` | **Tạo** | Re-export |
| `packages/provider-alert/engine.js` | **Tạo** | Logic check all-down, debounce, recovery |
| `packages/provider-alert/discord.js` | **Tạo** | Webhook sender |
| `src/lib/db/repos/settingsRepo.js` | **Sửa** | Thêm 4 settings keys |
| `src/sse/services/auth.js` | **Sửa** | Hook trong `markAccountUnavailable` + `clearAccountError` |
| `src/app/api/settings/alert/route.js` | **Tạo** *(optional phase 2)* | API routes |

**Tổng cộng:** 3 files mới (package) + 2 files sửa (app code) + 0 DB migration

---

## 8. Testing

### Unit test
- `test/checkAllAccountsDown.test.js`: mock connections[], verify alert logic
- `test/checkRecovery.test.js`: verify recovery detection
- `test/debounce.test.js`: verify cooldown behavior

### Integration test
- Mock Discord webhook endpoint
- Simulate: 3 accounts → fail all permanently → verify webhook POST
- Simulate: fail 1 → success 1 → verify recovery webhook
- Simulate: fail all with 429 → verify NO webhook sent (temporary only)

### Manual test
1. Tạo provider với 2 accounts (OAuth)
2. Enable alert, set webhook URL
3. Disable cả 2 accounts (isActive=0) → verify Discord nhận alert
4. Enable lại 1 account → verify Discord nhận recovery
5. Test rate limit scenario: fail với 429 → verify không có alert

---

## 9. Commit messages

```
feat(provider-alert): add packages/provider-alert with Discord webhook alerts
feat(provider-alert): add checkAllAccountsDown and checkRecovery engine
feat(provider-alert): add discord webhook sender with rate limit handling
feat(settings): add provider alert settings keys
feat(auth): hook provider alert into markAccountUnavailable and clearAccountError
```
