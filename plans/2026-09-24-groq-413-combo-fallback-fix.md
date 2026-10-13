---
type: bug-fix
complexity: low
impact: medium
related_issues: []
related_prs: []
time_spent_hours: ~1
status: completed
---

# Kế hoạch: Fix combo fail cứng khi Groq trả 413 (payload quá lớn cho TPM free-tier)

> **Ngày:** 2026-09-24
> **Phạm vi:** `open-sse/config/errorConfig.js`, `tests/unit/account-fallback-4xx.test.js`
> **Trạng thái:** ✅ Đã hoàn thành (code + test), chưa commit

---

## 1. Bối cảnh

User gửi 1 bản tổng hợp log mới (5 nhóm vấn đề: lỗi provider/model, free-tier OpenCode panel không ổn định, token refresh, hạ tầng compress service, điểm tích cực) kèm 5 đề xuất ưu tiên xử lý. Đáng chú ý nhất: **Groq trả 413 (request quá lớn, ~38 tool-calling, ~25KB payload, vượt TPM free-tier 8000 token/phút) không có fallback, làm fail cả combo cha `9r-combo-opencode`** — mất toàn bộ kết quả thay vì thử model khác trong combo.

Trước khi sửa, đọc lại plan gần nhất cùng chủ đề (`2026-09-21-opencode-combo-cmem-fixes-planning.md`) — plan đó đã sửa đúng 1 bug cùng loại (400 "model is unavailable" từ OpenCode Zen bị phân loại nhầm thành lỗi do request, không fallback). Giả thuyết: 413 của Groq là cùng 1 lớp bug, chỉ khác status code.

## 2. Công việc đã thực hiện

### 2.1. Xác nhận root cause bằng code thật (không suy đoán từ log)

Đọc `checkFallbackError` (`open-sse/services/accountFallback.js:23-64`): mọi status 4xx **không nằm trong `ERROR_RULES`** và khác 401/402/403/429 sẽ rơi vào nhánh mặc định `shouldFallback: false, cooldownMs: 0` (chủ đích: tránh cooldown nhầm 1 account khỏe chỉ vì bản thân request sai — context overflow, param không hỗ trợ...). `413` chưa từng có rule nào khớp → rơi đúng nhánh này.

Đọc tiếp `open-sse/services/combo.js:409-411`: khi `shouldFallback` là `false`, combo `return` ngay lập tức — không thử model tiếp theo, không gọi `markComboModelFailed`. Xác nhận đúng cơ chế "fail cứng cả combo" mà user mô tả, cùng pattern với bug 400 đã sửa tuần trước, không phải model/account bị hỏng thật.

### 2.2. Phân loại 413 là lỗi capacity-scoped, không phải request-scoped

413 ở đây phát sinh vì TPM free-tier của Groq (8000 token/phút) không đủ chứa 1 request có nhiều tool-calling — bản chất giống hệt 429 (rate limit theo thời gian) hơn là 1 request thực sự sai định dạng. Vì vậy chọn xử lý y hệt rule `429` hiện có: `{ status: 413, backoff: true }` — vừa fallback sang model/account khác ngay, vừa dùng exponential backoff (thay vì cooldown cố định) để không cooldown quá lâu một account có thể phục vụ bình thường các request nhỏ hơn trong tương lai gần.

**Đã cân nhắc nhưng không chọn:** cooldown cố định kiểu `COOLDOWN.long` (như rule "model is unavailable") — không hợp lý vì account/model không hề chết, chỉ 1 request cụ thể quá lớn so với TPM còn lại; backoff tăng dần theo số lần liên tiếp phù hợp hơn.

### 2.3. Thêm rule vào `ERROR_RULES` (không đụng `combo.js`)

Giữ đúng kiến trúc sẵn có (đã note trong plan trước): `ERROR_RULES` ở `errorConfig.js` là nơi duy nhất định nghĩa "lỗi nào coi là gì", dùng chung bởi cả combo lẫn account fallback — không cần sửa logic vòng lặp `combo.js`.

### 2.4. Viết test regression

Thêm test `"falls back with backoff for a 413 payload-too-large (e.g. Groq TPM cap)"` vào `tests/unit/account-fallback-4xx.test.js`, theo đúng pattern test đã có cho case 400 "model is unavailable".

### 2.5. Verify

`npx vitest run --config tests/vitest.config.js tests/unit/account-fallback-4xx.test.js` → 6/6 pass (bao gồm 5 test cũ + 1 test mới).

Lưu ý môi trường: chạy `npx vitest` **không kèm `--config tests/vitest.config.js`** sẽ tự tải về 1 bản vitest không pin version và không resolve được alias `@/...` (test khác trong `error-stats-routes.test.js` fail vì lý do này) — không liên quan gì tới thay đổi ở đây, chỉ là cách gọi lệnh sai; dùng đúng config thì test pass sạch.

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [open-sse/config/errorConfig.js](../open-sse/config/errorConfig.js) | Thêm rule `{ status: 413, backoff: true }` vào `ERROR_RULES` |
| [tests/unit/account-fallback-4xx.test.js](../tests/unit/account-fallback-4xx.test.js) | Test mới cho case 413 Groq TPM cap |

## 4. Trạng thái hiện tại

✅ Đã commit (`7f130605`, gộp cùng 2 fix khác trong ngày — headroom tool_call_id, Mistral promptCacheKey). Test liên quan pass (6/6). ✅ User xác nhận đã build và deploy lên server thật. Chưa có log thật xác nhận fallback 413 hoạt động đúng trên production (cần theo dõi thêm khi Groq TPM cap lại xảy ra).

## 5. Việc còn mở (4 đề xuất còn lại của user — không phải bug code, cần hành động khác)

- [ ] **Loại `muse-spark-1.2/1.3-contributor-free` và `nemotron-3-ultra-free` khỏi combo `9r-combo-opencode`:** đây là dữ liệu combo lưu trong DB (`combosRepo.js`), không nằm trong repo. Đã tìm thấy sẵn endpoint `POST /api/combos/remove-model` (lộ ra khi chạy test `error-stats-routes.test.js`) có thể dùng để dọn — cần user xác nhận có muốn gọi API này trên server thật không, chưa tự ý thực hiện.
- [ ] **`gh/claude-sonnet-4.5` (400 model_not_supported):** grep toàn repo xác nhận chuỗi model này **không tồn tại** ở bất kỳ registry nào (chỉ có `gh/claude-4.5-sonnet` và `gh/claude-sonnet-4.6`) → kết luận đây là entry sai/lỗi thời trong combo đã lưu của user, không phải bug routing. Cần user tự sửa hoặc gỡ qua UI/API.
- [ ] **Re-auth thủ công Cline (3 connection) và Kiro:** xác nhận lại kết luận từ plan 2026-09-21 — `invalid_grant`/`401 Bad credentials` là token đã bị revoke phía provider, không có code path nào tự phục hồi được, cần user tự re-login.
- [ ] **Theo dõi service compress `192.168.1.67:10018`:** chỉ cần quan sát thêm, không có gì để sửa lúc này (đã fail-open sẵn, không chặn request).

## 6. Bài học rút ra

- Khi thấy log mô tả "lỗi X làm fail cả combo, không fallback", trước khi nghĩ ra fix mới nên kiểm tra `ERROR_RULES`/`checkFallbackError` trước — đây là điểm lỗi lặp lại nhiều lần (bug 400 tuần trước, bug 413 tuần này), khả năng cao còn status code khác chưa được liệt kê sẽ gặp lại đúng pattern này trong tương lai (vd. các mã lỗi riêng của từng provider).
- Không phải mọi status nằm ngoài whitelist nên tự động thêm `cooldownMs` cố định — cần phân biệt rõ "request-scoped" (request tự nó sai, giữ nguyên hành vi không fallback) và "capacity-scoped" (account/model tạm thời không đủ sức phục vụ request này, nên fallback + backoff) trước khi chọn rule.
