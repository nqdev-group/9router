# Combo System

## Giới thiệu

Combo là cơ chế cho phép định nghĩa một chuỗi models với fallback tự động. Khi model đầu tiên fail (hết quota, rate limit, lỗi), request tự động chuyển sang model tiếp theo.

## Cấu trúc

Combo được lưu trong database table `combos`:

```js
{
  id: "uuid",
  name: "my-coding-combo",
  kind: null,        // Optional: loại combo
  models: [
    "cc/claude-opus-4-6",
    "glm/glm-5.1",
    "kr/claude-sonnet-4.5"
  ],
  createdAt: "...",
  updatedAt: "..."
}
```

## Fallback Strategy

### Cấu hình

```js
settings.comboStrategy = "fallback";         // fallback | round-robin
settings.comboStickyRoundRobinLimit = 3;      // Số lần sticky cho round-robin
settings.comboStrategies = {
  "my-coding-combo": {
    fallbackStrategy: "fallback"              // Override per-combo
  }
};
```

### fallback (mặc định)

```
→ Try model 1 (cc/claude-opus-4-6)
  → Success: return
  → Fail: mark account unavailable
    → Try model 2 (glm/glm-5.1)
      → Success: return
      → Fail: mark account unavailable
        → Try model 3 (kr/claude-sonnet-4-5)
```

### round-robin

Phân phối request đều giữa các models trong combo với sticky limit (request liên tiếp đến cùng model trong N lần).

## Account Fallback

Trong mỗi model, cơ chế account fallback hoạt động:

```
→ Try model
  → Get credentials cho provider (theo priority/round-robin)
  → Execute request
    → Success: clear account error, return
    → Fail:
      → Mark account unavailable (cooldown)
      → Còn account khác? → Try next account
      → Hết account? → Fallback sang model tiếp theo trong combo
```

## Flow xử lý combo

```
handleChat() trong src/sse/handlers/chat.js:

1. Parse model string
2. Kiểm tra nếu là combo name → getComboModels()
3. handleComboChat() từ open-sse/services/combo.js
4. Với mỗi model trong combo:
   a. handleSingleModelChat()
   b. Resolve model info (provider + model)
   c. Get credentials (account selection)
   d. handleChatCore() → translation → executor
   e. Nếu success → return
   f. Nếu fail → markAccountUnavailable()
      → Next account hoặc next model
```

## Error Handling

Các lỗi được xử lý bởi `open-sse/services/accountFallback.js`:

```js
checkFallbackError(statusCode, errorText, provider)
```

Fallback decisions dựa trên:
- Status codes (429, 502, 503, 401, 403)
- Error message heuristics
- Provider-specific patterns

## Tạo Combo

```http
POST /api/combos
Content-Type: application/json

{
  "name": "my-combo",
  "models": ["cc/claude-opus-4-6", "glm/glm-5.1"]
}
```

Yêu cầu: `name` phải match regex `/^[a-zA-Z0-9_.\-]+$/`
