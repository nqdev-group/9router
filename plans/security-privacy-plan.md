# Security & Data Privacy Plan — Implementation Status

## 1. Mục tiêu
- Bảo vệ dữ liệu nhạy cảm (PII/secret) khi gửi request tới AI provider
- Tự động detect & mask 50% giá trị (giữ floor(n/2), che ceil(n/2))
- Cho phép user tùy chỉnh danh sách keyword
- Hỗ trợ tiếng Việt (delimiter "là", keyword tiếng Việt)
- Direct email address detection

## 2. Kiến trúc

### Layers
```
request → chatCore.js → [RTK compression] → [PrivacyEngine] → executor → upstream
                                                    ↑
                                            settings from DB
                                          (privacyEnabled, privacyCustomKeywords)
```

### File structure
```
open-sse/privacy/
├── constants.js            # DEFAULT_KEYWORDS (EN + VI)
├── masking.js              # maskString() — keep floor, mask ceil
└── PrivacyEngine.js        # process(data) — walk objects/arrays/strings

packages/validation/
└── privacySchemas.js       # validatePrivacyConfig(), DEFAULT_KEYWORDS export

src/app/api/settings/privacy/
└── route.js                # GET  — return config + defaultKeywords
                            # PATCH — validate, sanitize, persist

src/app/(dashboard)/dashboard/settings/privacy/
└── page.js                 # UI: toggle, default keywords (read-only),
                            #     custom keywords (add/remove), security notice
```

## 3. DEFAULT_KEYWORDS (19 từ gốc + 12 tiếng Việt = 31)

### English (9 nhóm, 19 variants)
| Nhóm | Variants |
|---|---|
| username | `username`, `user_name`, `user` |
| password | `password`, `pass`, `pwd` |
| apikey | `apikey`, `api_key`, `api-key` |
| secretkey | `secretkey`, `secret_key`, `secret` |
| clientsecret | `clientsecret`, `client_secret` |
| token | `token`, `access_token`, `refresh_token` |
| cookie | `cookie` |
| session | `session` |
| email | `email`, `mail` |

### Vietnamese (4 nhóm, 12 variants)
| Nhóm | Variants |
|---|---|
| mật khẩu | `mật khẩu`, `mật_khẩu`, `matkhau`, `mậtkhẩu` |
| tên đăng nhập | `tên đăng nhập`, `tên_đăng_nhập`, `tendangnhap`, `tênđăngnhập` |
| tài khoản | `tài khoản`, `tài_khoản`, `taikhoan`, `tàikhoản` |
| email | (đã có ở English) |

## 4. Masking logic (`masking.js`)

```
Input:  "password123"  (11 chars)
keep  = Math.floor(11/2) = 5   → "passw"
mask  = Math.ceil(11/2)  = 6   → "******"
Output: "passw******"
```

- String ≤ 1 char: fully masked
- Works on any string value (passwords, tokens, emails...)

## 5. PrivacyEngine — how it works

### a) Object processing (`_isSensitiveKey`)
Walk object keys recursively. Normalize key (lowercase, strip non-alnum), check substring match against keyword list.

```
{ mật_khẩu: "Example123" } → { mật_khẩu: "Exa*******" }
                               ↑ key matched "mật_khẩu" → maskString(value)
```

### b) String regex (`_buildRegex`)
Pattern: `keyword\s*(?:[:=]|l[àa])\s*value`

3 capture groups for quoted/unquoted values:
- `"value with spaces"` — double-quoted
- `'value'` — single-quoted
- `value` — unquoted (until whitespace)

Hỗ trợ delimiter:
- `:` — `password: secret`
- `=` — `password=secret`
- `là` — `mật khẩu là Example123`
- `la` — `mat khau la Example123` (fallback không dấu)

### c) Email masking (`_maskEmails`)
Direct regex: `\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b`

Chỉ mask local part (trước @), giữ nguyên domain.
```
test.user@example.com → test*****@example.com
                         ^^^^    ^
               keep 4/9 chars    domain intact
```

## 6. Validation (`privacySchemas.js`)

| Rule | Giá trị |
|---|---|
| Max custom keywords | 50 |
| Max keyword length | 64 chars |
| Keyword format | `/^[a-zA-Z][a-zA-Z0-9_-]*$/` |
| Sanitization | trim + lowercase |

## 7. Files đã tạo/sửa

### Created (4 files)
| File | Purpose |
|---|---|
| `open-sse/privacy/constants.js` | DEFAULT_KEYWORDS |
| `open-sse/privacy/masking.js` | `maskString()` |
| `open-sse/privacy/PrivacyEngine.js` | Core engine + email masking |
| `src/app/api/settings/privacy/route.js` | GET/PATCH API |
| `src/app/(dashboard)/dashboard/settings/privacy/page.js` | Dashboard UI |
| `packages/validation/privacySchemas.js` | Validation schema + shared DEFAULT_KEYWORDS |
| `tests/unit/privacy.test.js` | 8 unit tests |

### Modified (5 files)
| File | Change |
|---|---|
| `open-sse/handlers/chatCore.js` | Import PrivacyEngine, instantiate with DB config, call process() after RTK |
| `src/sse/handlers/chat.js` | Pass privacyEnabled + privacyCustomKeywords from settings |
| `src/lib/db/repos/settingsRepo.js` | Add defaults: `privacyEnabled: true`, `privacyCustomKeywords: []` |
| `src/shared/components/Sidebar.js` | Add "Privacy Engine" nav link |
| `packages/validation/index.js` | Export privacySchemas |

## 8. API

### `GET /api/settings/privacy`
```json
{
  "privacyEnabled": true,
  "privacyCustomKeywords": [],
  "defaultKeywords": ["username", "email", "mật khẩu", ...]
}
```

### `PATCH /api/settings/privacy`
Body: `{ "privacyEnabled": true, "privacyCustomKeywords": ["clientid"] }`
→ validates → sanitizes (trim, lowercase) → persists → returns updated config

## 9. Security measures

1. **Input validation**: keywords validated against strict regex, max 50 items, 64 chars each
2. **Sanitization**: trim + lowercase before persist
3. **Default keywords read-only**: cannot be modified via API
4. **UI warning**: "Some providers may reject requests with masked values"
5. **Error handling**: validation errors return 400 with details array, engine catch-all returns original data
6. **Email masking**: only local part masked, domain preserved (valid routing still possible)
7. **Safe by design**: if regex throws or masking produces larger output, original kept (PrivacyEngine doesn't break requests)

## 10. Test coverage (8 tests)

| Test | What it covers |
|---|---|
| mask strings correctly | maskString keep/mask split |
| mask sensitive keys in objects | Recursive object walk + _isSensitiveKey |
| mask sensitive patterns in strings | Regex key=value detection |
| support custom keywords | Constructor customKeywords |
| mask email addresses directly | _maskEmails regex |
| mask password after "là" delimiter | Vietnamese delimiter |
| mask email after "là" delimiter | email keyword + là delimiter |
| mask Vietnamese key-value patterns | _isSensitiveKey with VI keys |

## 11. Future work

### Phase 5: Security Hardening
- [ ] Fix leak in `open-sse/utils/requestLogger.js` (uncomment `maskSensitiveHeaders`)
- [ ] Rate limiting on API routes
- [ ] Audit log for privacy config changes

### Improvements
- [ ] NLP-based detection for natural language patterns (không chỉ regex)
- [ ] Per-provider privacy policy (mask more/less depending on provider trust level)
- [ ] Preview panel showing what gets masked before sending

## 12. Known limitations

1. **Natural language**: `email của tôi là user@test.com` — "của tôi" giữa keyword và delimiter làm regex miss. Cần NLP để xử lý.
2. **False negatives**: giá trị nhạy cảm không có keyword prefix (VD: câu "mật khẩu của tôi là 123" — keyword match, nhưng value "123" quá ngắn, mask thành "*")
3. **False positives**: từ "secret" trong context bình thường bị mask nếu là value của key trùng
4. **Email masking mọi email**: không phân biệt context, tất cả email trong text đều bị mask
