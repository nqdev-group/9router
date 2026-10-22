---
type: feature
complexity: low
impact: low
related_issues: []
related_prs: []
time_spent_hours: ~1
status: in_progress
---

# Kế hoạch: Tích hợp provider xai247 (xai247.xyz)

> **Ngày:** 2026-10-13
> **Phạm vi:** [packages/providers/registry/xai247.js](../packages/providers/registry/xai247.js), [packages/providers/registry/index.js](../packages/providers/registry/index.js)
> **Trạng thái:** 🚧 Đang thực hiện (provider chạy được theo chuẩn OpenAI; usage/announcements chờ xác minh API)

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

- [ ] Xác minh `/v1/models` trả đúng dạng `{ data: [...] }` bằng key thật.
- [ ] Xác minh `/api/usage`, `/api/announcements` có nhận API key hay chỉ session; nếu có thì viết `packages/providers/usage/xai247.js` và đăng ký trong `usage/index.js`.
- [ ] Thêm icon `public/providers/xai247.png` (đang dùng icon `bolt` + chữ "X2").
- [ ] Thêm pricing vào `packages/providers/pricing.js` nếu có bảng giá.
- [ ] Ghi CHANGELOG-NQDEV.md và chạy baseline provider.

## 6. Bài học rút ra

Không viết usage handler khi chưa thấy response thật — handler của Kira được viết sau khi kiểm chứng bằng tài khoản thật, nên cùng cách ở đây.

## 7. Tham khảo bên ngoài

- https://xai247.xyz/dashboard/models
- https://xai247.xyz/dashboard/quickstart
- https://xai247.xyz/dashboard/usage
- https://xai247.xyz/dashboard/announcements
