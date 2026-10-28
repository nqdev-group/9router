---
type: feature
complexity: low
impact: low
related_issues: []
related_prs: []
time_spent_hours: ~1
status: completed
---

# Kế hoạch: Tích hợp provider xai247 (xai247.xyz)

> **Ngày:** 2026-10-13
> **Phạm vi:** [packages/providers/registry/xai247.js](../packages/providers/registry/xai247.js), [packages/providers/registry/index.js](../packages/providers/registry/index.js)
> **Trạng thái:** ✅ Đã hoàn thành (usage/announcements để lại làm sau)

---

## 1. Bối cảnh

Cần thêm gateway xai247 (một key cho Claude/GPT/Gemini, tương thích OpenAI và Anthropic) vào 9router, theo mẫu của [kira.js](../packages/providers/registry/kira.js). Thông tin từ dashboard: model `gpt-5.6-terra`; base OpenAI `https://xai247.xyz/v1`; base Anthropic `https://xai247.xyz`; xác thực `Authorization: Bearer <key>` hoặc `x-api-key`.

## 2. Công việc đã thực hiện

- Tạo registry `xai247` (category apikey, `serviceKinds: ["llm"]`, `passthroughModels: true`, `modelsFetcher` kiểu `openai`, retry 429/503). Chọn đường OpenAI (`/v1/chat/completions`) làm transport duy nhất: đủ cho mọi model, translator đã xử lý client Claude → OpenAI nên không cần nối base Anthropic.
- Bỏ các phần tts/image/video/usage handler của Kira vì xai247 chưa có tài liệu cho các dịch vụ đó.
- Đăng ký `pc13` trong `registry/index.js` (danh sách viết tay, không phải file tự sinh).
- Thêm `transport.usage` với `url` (dashboard/usage) và `announcementsUrl` (dashboard/announcements) — chỉ là link tham khảo cho người xem. `announcementsUrl` là tên field tự đặt, chưa xác minh có nơi nào trong `src/` đọc.
- Thăm dò API không đăng nhập: `/api/usage` và `/api/announcements` trả `401 unauthenticated`; `/v1/usage`, `/v1/user/profile`, `/v1/announcements` trả 404. Dashboard là SPA nên không đọc được endpoint từ HTML.

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [packages/providers/registry/xai247.js](../packages/providers/registry/xai247.js) (**Mới**) | Định nghĩa provider xai247 |
| [packages/providers/registry/index.js](../packages/providers/registry/index.js) | Import và đăng ký `pc13` |

## 4. Trạng thái hiện tại

Chưa commit. Chưa test với API key thật; chưa chạy các baseline `tests/__baseline__/verify-*.mjs`.

## 5. Việc còn mở (chưa làm, để quyết định sau)

- [x] Danh mục model: `GET /api/models` là public (không cần auth) → cập nhật đủ 6 model (gpt-5.6-terra, gpt-6-luna, gpt-6.1-sol, claude-haiku-5-5, claude-opus-5, claude-sonnet-5-5). `/v1/models` vẫn cần key thật để xác minh dạng `{ data: [...] }` — chưa làm được vì không có key.
- [x] `/api/usage`, `/api/announcements`: cả header `Authorization: Bearer` lẫn `x-api-key` đều trả `401 unauthenticated` (khác dạng `invalid_api_key` của `/v1/*`) → là auth theo session dashboard, không dùng được API key → **không viết** `usage/xai247.js`; giữ link tham khảo.
- [x] Icon: [public/providers/xai247.png](../public/providers/xai247.png) (favicon 128x128 của xai247.xyz).
- [x] Pricing: thêm khối `xai247` vào [packages/providers/pricing.js](../packages/providers/pricing.js), lấy từ `/api/models` (`*PerMillionMicro` / 1e6).
- [x] Baseline: `verify-*.mjs` chạy bằng node thuần không resolve được alias `@9router/*` (chỉ vitest có alias); `verify-no-regression.mjs` cũng giả định đường dẫn Docker `/app/`. Thay vào đó chạy full vitest trước/sau thay đổi (stash): 0 test mới fail (nền 123 fail, sau 121 — lệch 2 test minimax-code do snapshot tự ghi). Lưu ý: chạy vitest ghi thêm snapshot vào `tests/translator/__snapshots__` — nhớ `git restore` lại.
- [ ] CHANGELOG-NQDEV.md: file do `auto-changelog` sinh tự động → không sửa tay.

## 6. Bài học rút ra

Không viết usage handler khi chưa thấy response thật — handler của Kira được viết sau khi kiểm chứng bằng tài khoản thật, nên cùng cách ở đây.

## 7. Tham khảo bên ngoài

- https://xai247.xyz/dashboard/models
- https://xai247.xyz/dashboard/quickstart
- https://xai247.xyz/dashboard/usage
- https://xai247.xyz/dashboard/announcements
