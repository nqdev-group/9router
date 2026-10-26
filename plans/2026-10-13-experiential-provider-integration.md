---
type: feature
complexity: low
impact: low
related_issues: [QUYIT-909]
related_prs: []
time_spent_hours: ~1
status: completed
---

# Kế hoạch: Tích hợp provider Experiential Labs (experientiallabs.ai)

> **Ngày:** 2026-10-13
> **Phạm vi:** [packages/providers/registry/experiential.js](../packages/providers/registry/experiential.js), [packages/providers/registry/index.js](../packages/providers/registry/index.js), [packages/providers/pricing.js](../packages/providers/pricing.js)
> **Trạng thái:** ✅ Đã hoàn thành (chưa test với API key thật)

---

## 1. Bối cảnh

Cần thêm gateway Experiential Labs vào 9router theo mẫu [kira.js](../packages/providers/registry/kira.js). Thông tin: base OpenAI `https://api.experientiallabs.ai/v1`; xác thực `Authorization: Bearer <key>` hoặc `x-api-key`; model ví dụ `jev-latest` (free). Trang tham khảo: overview, docs, spend, models, settings/limits tại `platform.experientiallabs.ai`.

## 2. Công việc đã thực hiện

- Tạo registry `experiential` (category apikey, `serviceKinds: ["llm"]`, `passthroughModels: true`, `modelsFetcher` kiểu `openai`, retry 429/503). Chỉ dùng đường OpenAI `/v1/chat/completions`.
- Chỉ seed các model free có id đã được xác nhận: `clef-flash`, `clef`, `gpt-6-luna-decisions`, `jev-latest`. Catalog có ~1.110 model nhưng id API không công khai khi thiếu key → để `modelsFetcher` + `passthroughModels` lo phần còn lại, không đoán id.
- Đăng ký `pc14` trong `registry/index.js`.
- Thêm khối `experiential` vào `pricing.js` (4 model free = 0).
- `GET /v1/models` không key trả `401 invalid_key` → cần key thật mới xác minh được dạng `{ data: [...] }`.
- Không viết usage handler: các trang spend/limits là dashboard theo session, chưa có endpoint usage dùng API key. Giữ link tham khảo trong `transport.usage` (`docsUrl`/`modelsUrl`/`limitsUrl` là tên field tự đặt).

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [packages/providers/registry/experiential.js](../packages/providers/registry/experiential.js) (**Mới**) | Định nghĩa provider experiential |
| [packages/providers/registry/index.js](../packages/providers/registry/index.js) | Import và đăng ký `pc14` |
| [packages/providers/pricing.js](../packages/providers/pricing.js) | Khối pricing `experiential` |

## 4. Trạng thái hiện tại

Chưa commit. Chưa test với API key thật. Đã chạy vitest trước/sau, không có test mới fail (xem mục 5).

## 5. Việc còn mở

- [ ] Có key thật: xác minh `/v1/models`, bổ sung model/pricing đầy đủ. **Chưa làm được** — không có API key (`/v1/models` trả `401 invalid_key`); cần chạy lại khi có key.
- [x] `gpt-6-luna-decisions`: pricing đổi input thành 0.10 (list price), output 0.
- [x] Icon: [public/providers/experiential.png](../public/providers/experiential.png) — render từ `https://www.experientiallabs.ai/icon.svg` (SVG, không có PNG/ICO) sang 128x128 bằng `sharp`.
- [x] Vitest trước/sau (gỡ `pc14` để lấy nền): nền 123 fail, sau 122; không có test mới fail ngoài `xai-oauth-service` (timeout nền đã biết, flaky). Lệch 2 test `minimax-code*` là do snapshot tự ghi.
- [x] Snapshot `golden-url-header`: vitest tự ghi thêm entry `experiential` (headers + url). Snapshot đã commit cũ thiếu cả nhiều provider khác nên diff lớn — giữ nguyên, cần review trước khi commit.
- [x] CHANGELOG-NQDEV.md do `auto-changelog` sinh → không sửa tay.

## 6. Tham khảo bên ngoài

- https://platform.experientiallabs.ai/overview
- https://platform.experientiallabs.ai/docs
- https://platform.experientiallabs.ai/models
- https://platform.experientiallabs.ai/spend
- https://platform.experientiallabs.ai/settings/limits
