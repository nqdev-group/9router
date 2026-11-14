---
type: bug-fix
complexity: low
impact: medium
related_issues: []
related_prs: []
time_spent_hours: ~0.5
status: completed
---

# Kế hoạch: Strip field `promptCacheKey` lạ trước khi gửi request tới Mistral (422 extra_forbidden)

> **Ngày:** 2026-09-24
> **Phạm vi:** `open-sse/translator/concerns/paramSupport.js`, `tests/unit/param-support.test.js`
> **Trạng thái:** ✅ Đã hoàn thành (code + test), chưa commit

---

## 1. Bối cảnh

User gửi tiếp 2 log mới, phát hiện thêm 1 lỗi khác trên cùng model `mistral/codestral-latest` (ngoài lỗi 413/tool_call_id đã sửa trước đó trong ngày): `422 extra_forbidden`, `loc: ["body","promptCacheKey"]`, `msg: "Extra inputs are not permitted"`, giá trị field là `"ses_f2f08b82fffeKzDQ2eVeD7Z04n"` (dạng session id). Lỗi lặp lại 2 lần trong cùng phiên, **không có fallback → fail cả combo cha**, giống hệt pattern các bug 400/413 đã gặp trước đó trong ngày (status không nằm trong whitelist fallback → combo dừng cứng).

Cùng lúc user báo thêm: Cline hết sạch credential (`No active credentials for provider: cline` → 404, không chỉ refresh fail như trước) và danh sách model combo tiếp tục đổi (thông tin, không phải bug).

## 2. Công việc đã thực hiện

### 2.1. Xác định nguồn gốc field `promptCacheKey`

Grep toàn bộ repo (case-insensitive) cho `promptCacheKey`/`prompt_cache_key`/`cacheKey`: field camelCase `promptCacheKey` **không tồn tại ở bất kỳ đâu trong code 9router** — chỉ có `prompt_cache_key` (snake_case, đúng field OpenAI Responses API thật) ở `open-sse/translator/request/openai-responses.js`. Kết luận: `promptCacheKey` không phải do 9router tự thêm vào, mà **do client gốc (giá trị bắt đầu `ses_` gợi ý GitHub Copilot Chat) gửi kèm sẵn trong request** dạng OpenAI-shape, và 9router hiện không strip field lạ ở root trước khi forward tới Mistral.

### 2.2. Xác nhận đúng điểm chèn fix — tái dùng cơ chế đã có sẵn

Đọc `open-sse/translator/concerns/paramSupport.js`: file này đã có sẵn đúng 1 rule cùng loại — Mistral (và Groq, Cerebras) đã được cấu hình `dropMessageFields: ["reasoning_content", "reasoning", "reasoning_details"]` với comment giải thích chính xác cùng cơ chế lỗi (client leak field đặc thù dialect khác → Mistral 422 `extra_forbidden` vì schema validate nghiêm ngặt hơn Groq/OpenAI). Xác nhận `stripUnsupportedParams(provider, model, body)` được gọi trong `DefaultExecutor.transformRequest()` (`open-sse/executors/default.js:78`) — Mistral không có executor riêng, dùng `DefaultExecutor`, nên thêm 1 rule `drop` (xoá field root-level, khác với `dropMessageFields` xoá field trong từng message) là đủ, không cần đụng executor nào.

### 2.3. Thêm rule `{ provider: "mistral", drop: ["promptCacheKey"] }`

Thêm vào `STRIP_RULES`, không có `match` (áp dụng mọi model Mistral, vì đây là field-level incompatibility chung của cả provider, không riêng model nào). Không strip field này cho provider khác — `promptCacheKey`/session cache là hành vi hợp lệ phía OpenAI/GitHub Copilot, chỉ riêng Mistral từ chối.

### 2.4. Viết test regression (`tests/unit/param-support.test.js`)

2 test mới: (a) `promptCacheKey` bị xoá khỏi body gửi tới Mistral, các field khác (`temperature`) giữ nguyên; (b) `promptCacheKey` **không** bị xoá khi provider khác (vd. `openai`) — tránh regression strip nhầm sang provider chấp nhận field này.

### 2.5. Verify

`npx vitest run --config tests/vitest.config.js tests/unit/param-support.test.js` → 8/8 pass (6 test cũ + 2 test mới).

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [open-sse/translator/concerns/paramSupport.js](../open-sse/translator/concerns/paramSupport.js) | Thêm rule `{ provider: "mistral", drop: ["promptCacheKey"] }` vào `STRIP_RULES` |
| [tests/unit/param-support.test.js](../tests/unit/param-support.test.js) | 2 test mới: strip đúng cho Mistral, giữ nguyên cho provider khác |

## 4. Trạng thái hiện tại

✅ Đã commit (`7f130605`, gộp cùng 2 fix khác trong ngày — Groq 413 fallback, headroom tool_call_id). Test pass. ✅ User xác nhận đã build và deploy lên server thật. Chưa có log thật xác nhận Mistral hết báo lỗi 422 `promptCacheKey` — theo dõi thêm.

## 5. Việc còn mở

- [ ] **Cline hết sạch credential (`No active credentials for provider: cline` → 404):** không phải bug code — `status: 404` đã có sẵn rule fallback đúng (`errorConfig.js:79`, `cooldownMs: COOLDOWN.long`, `shouldFallback: true`), combo sẽ tự chuyển model tiếp theo bình thường. Đây là bước leo thang của vấn đề `invalid_grant` đã ghi nhận từ các log trước — cần user tự re-login lại Cline, không có code path nào tự phục hồi được từ việc hết credential hoàn toàn.
- [ ] **Danh sách model trong combo tiếp tục thay đổi giữa các phiên** (`mistral/codestral-latest` lên vị trí #1) — chỉ là thông tin cấu hình phía user, không phải vấn đề cần sửa.
- [ ] **Rà soát tổng thể "tầng build request cho Mistral"** như user đề xuất — đã xử lý 2/2 lỗi cụ thể phát hiện được qua log thật hôm nay (413 fallback ở plan riêng + `promptCacheKey` ở đây); chưa có bằng chứng cụ thể nào khác để mở rộng rà soát thêm ngoài 2 case này. Nếu log tương lai lộ thêm lỗi 4xx khác từ Mistral, áp dụng đúng quy trình đã dùng 3 lần trong ngày: kiểm tra `ERROR_RULES` (nếu là lỗi fallback) hoặc `STRIP_RULES` (nếu là field/param bị từ chối) trước khi viết code mới.

## 6. Bài học rút ra

- **Không phải field lạ nào cũng do 9router tự sinh ra** — trước khi giả định lỗi nằm trong logic dịch request của 9router, grep tên field chính xác trong toàn repo trước; nếu không tìm thấy, khả năng cao đây là field client gửi thẳng mà router chưa lọc, không phải bug ở tầng translate.
- **`paramSupport.js`/`STRIP_RULES` là điểm hội tụ đúng cho mọi loại "provider X từ chối field Y"** — đã có 2 loại rule sẵn (`drop` cho root-level, `dropMessageFields` cho field trong từng message); khi gặp lỗi `422 extra_forbidden`/`400` tương tự ở provider khác trong tương lai, nên tái dùng file này thay vì thêm logic rải rác trong executor.
