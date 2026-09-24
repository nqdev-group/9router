---
type: bug-fix
complexity: medium
impact: high
related_issues: []
related_prs: []
time_spent_hours: ~1.5
status: completed
---

# Kế hoạch: Fix mất `tool_call_id` khi nén tool history qua Headroom/Compress gây lỗi 400

> **Ngày:** 2026-09-24
> **Phạm vi:** `open-sse/rtk/headroom.js`, `tests/unit/headroom.test.js`
> **Trạng thái:** ✅ Đã hoàn thành (code + test), chưa commit

---

## 1. Bối cảnh

User gửi log thật: request qua combo `9r-route-combo-free` → `9r-combo-claude` → `mistral/codestral-latest`, có tool history dài (36 TOOL, 10 MSG) được Headroom nén mạnh (`toolHistory=5521B→692B`, ~87%). Provider Mistral trả `400 "Tool call id has to be defined."` (`code: "3051"`), lỗi này **không có fallback** — làm fail cả 2 tầng combo cha (`9r-combo-claude` rồi `9r-route-combo-free`). User đã tự phân tích và đưa ra giả thuyết đúng hướng: bước nén làm mất liên kết `tool_call_id` giữa cặp `assistant.tool_calls` ↔ `tool` (role) result, đề xuất 5 việc cần làm (reproduce, log trước/sau nén, fix logic nén, kiểm tra chéo provider khác, thêm validation + auto-fallback bỏ nén, viết test).

**Phát hiện quan trọng làm đổi hướng fix so với đề xuất ban đầu:** đọc `src/lib/headroom/detect.js` + `src/lib/headroom/process.js` xác nhận **"Headroom" không phải code trong repo này** — đây là 1 package Python bên thứ 3 (`headroom-ai`, cài qua `pip`), chạy như 1 local proxy process (`headroom` CLI, mặc định port 8787), expose endpoint `/v1/compress`. Repo `9router` chỉ có vai trò: (a) detect/start/stop process này (`src/lib/headroom/*`), (b) gọi HTTP tới `/v1/compress` và ghép kết quả nén vào body request (`open-sse/rtk/headroom.js`). **Thuật toán nén thật sự (cái quyết định cắt/rearrange message nào) nằm hoàn toàn trong package `headroom-ai` bên ngoài, không có source ở đây để sửa trực tiếp.**

Vì vậy các mục "fix logic nén" và "log payload trước/sau trong module Headroom" theo đúng nghĩa đen (sửa thuật toán compress) **không khả thi trong repo này**. Hướng fix khả thi và đúng kiến trúc: xử lý ở đúng boundary mà 9router kiểm soát được — **validate kết quả trả về từ Headroom trước khi ghép vào request gửi provider, tự động bỏ qua (fail-open) nếu phát hiện liên kết `tool_call_id` bị vỡ** — đúng theo đề xuất "Thêm validation trước khi gửi... tự động fallback bỏ nén khi phát hiện mismatch thay vì gửi payload hỏng" của user.

Xác nhận thêm từ log: request lỗi có `FMT: openai→openai` — tức đi qua nhánh cuối cùng của `compressWithHeadroom` (OpenAI shape), nhánh này **forward `data.messages` thẳng vào `body.messages` không qua translator nào của 9router** (`body[key] = data.messages`) → xác nhận payload hỏng đến thẳng từ response của Headroom, không phải do lỗi dịch format trong 9router.

## 2. Công việc đã thực hiện

### 2.1. Thêm hàm kiểm tra tính toàn vẹn `tool_call_id` (`open-sse/rtk/headroom.js`)

Thêm `hasIntactToolCallLinkage(messages)`: duyệt toàn bộ mảng message OpenAI-shape trả về từ Headroom, gom 2 tập hợp — `declaredIds` (mọi `id` trong `tool_calls[]` của message `assistant`) và `resolvedIds` (mọi `tool_call_id` của message role `tool`/`function`). Payload chỉ hợp lệ khi 2 tập này **khớp nhau 2 chiều**:
- Mọi `tool` message phải có `tool_call_id` không rỗng và id đó phải nằm trong `declaredIds` (chặn đúng ca bug user báo cáo: tool result mồ côi vì assistant tool_calls đã bị nén mất).
- Mọi `tool_calls` id đã khai báo phải có 1 `tool` message tương ứng (chặn chiều ngược lại: tool_calls bị treo không có kết quả — cũng bị OpenAI-compatible provider từ chối).

Đặt việc gọi hàm này **ngay trong `callCompress()`** (hàm dùng chung bởi cả 4 nhánh format: `claude`, `openai-responses`, `kiro`, `openai` thường) — 1 chỗ, áp dụng cho mọi nhánh, không cần sửa riêng từng nhánh. Khi phát hiện vỡ liên kết: `setDiagnostic(diagnostics, "proxy response broke tool_call_id linkage — skipping compression")` rồi `return null` — dùng đúng pattern fail-open đã có sẵn cho mọi lỗi khác trong file này (proxy lỗi HTTP, response thiếu `messages[]`, Kiro sai thứ tự...). Khi bỏ qua nén, request tiếp tục gửi đi với **body gốc chưa nén** thay vì payload hỏng.

**Vì sao chọn kiểm tra ở `callCompress` thay vì sau khi ghép vào `body`:** đây là điểm hội tụ duy nhất nhận trực tiếp response thô từ Headroom trước khi bất kỳ nhánh nào dịch ngược sang Claude/Kiro/Responses — dữ liệu ở đây luôn là OpenAI-shape thuần (đúng field `tool_calls`/`tool_call_id` top-level), nên validate ở đây vừa đơn giản vừa đúng 1 lần cho tất cả format đầu vào.

**Vì sao không cố "sửa" (repair) message hỏng thay vì bỏ nén hoàn toàn:** không đủ thông tin để biết bên nào (tool_calls hay tool result) là bản gốc đúng — tự ý xoá 1 bên có thể xoá nhầm dữ liệu người dùng cần. Bỏ nén và dùng lại body gốc là lựa chọn an toàn nhất, nhất quán với triết lý fail-open toàn bộ file (`// Fail-open: returns null on any error`).

### 2.2. Viết test regression (`tests/unit/headroom.test.js`)

3 test mới:
- Bỏ nén khi Headroom trả về tool result mồ côi (tool_call_id không khớp tool_calls nào) — verify `body` giữ nguyên y hệt bản gốc (`structuredClone` so sánh), `diagnostics.reason` đúng message.
- Bỏ nén khi Headroom trả về `tool_calls` bị treo (không có tool result tương ứng).
- Test dương tính: cặp `tool_calls`/`tool_call_id` còn nguyên vẹn sau nén → vẫn áp dụng kết quả nén bình thường (không bị false positive chặn nhầm các lần nén hợp lệ).

### 2.3. Verify

`npx vitest run --config tests/vitest.config.js tests/unit/headroom.test.js tests/unit/headroom-chat-core.test.js tests/unit/headroom-detect.test.js tests/unit/headroom-responses-format.test.js` → `headroom.test.js` 32/32 pass (gồm 3 test mới). 1 fail duy nhất ở `headroom-detect.test.js` (`prefers the interpreter that actually has headroom-ai installed`) là lỗi có sẵn từ trước, do assertion hardcode path kiểu Unix (`/opt/hr/bin/python3`) chạy trên Windows trả về `\opt\hr\bin\python.exe` — không liên quan gì tới thay đổi lần này, file `detect.js` không bị đụng tới.

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [open-sse/rtk/headroom.js](../open-sse/rtk/headroom.js) | Thêm `hasIntactToolCallLinkage()`, gọi trong `callCompress()` để fail-open khi Headroom trả về message vỡ liên kết `tool_call_id` |
| [tests/unit/headroom.test.js](../tests/unit/headroom.test.js) | 3 test mới: orphan tool result, dangling tool_calls, và case hợp lệ vẫn nén bình thường |

## 4. Trạng thái hiện tại

Chưa commit. Test liên quan pass (trừ 1 fail có sẵn không liên quan, đã xác nhận). Chưa deploy — cần build+push image mới hoặc build local rồi restart container thật (giống lưu ý ở các plan trước, image chạy thật kéo từ registry `decolua/9router`, tách biệt khỏi repo local).

## 5. Việc còn mở

- [ ] **Kiểm tra chéo các provider khác (OpenAI, Groq, Anthropic, GitHub Copilot...)** — không cần làm riêng cho từng provider vì fix chặn ở tầng validate response Headroom (trước khi biết request sẽ đi provider nào), áp dụng chung cho mọi provider nhận payload đã nén. Không cần việc riêng biệt này nữa, nhưng vẫn nên theo dõi log thật sau khi deploy để xác nhận không còn ca lỗi tương tự ở provider khác.
- [ ] **Không sửa được thuật toán nén gốc trong `headroom-ai`** — nếu muốn fix tận gốc (thay vì fail-open bỏ qua nén khi hỏng), cần báo lỗi lên upstream project `headroom-ai` hoặc pin/patch riêng bản cài trên server; ngoài phạm vi sửa trong repo `9router`.
- [ ] **Đo tần suất bỏ nén thực tế sau khi deploy** — nếu `diagnostics.reason = "proxy response broke tool_call_id linkage..."` xuất hiện thường xuyên trong log thật, nghĩa là bug ở `headroom-ai` khá phổ biến với tool-heavy workflow — có thể cần cân nhắc tắt nén cho request có tool history dài thay vì chấp nhận tỷ lệ fail-open cao (mất lợi ích nén ở đúng các request cần nén nhất).
- [ ] Deploy image mới lên server thật (nếu user muốn) — build từ repo local + push registry `decolua/9router`, hoặc sửa tạm `docker-compose.yml` để build local.

## 6. Bài học rút ra

- **Không phải mọi thứ nhắc tới trong log tên là "module X" đều là code trong repo hiện tại** — "Headroom" nghe như 1 module nội bộ nhưng thực chất là 1 package Python bên thứ 3 chạy như sidecar process; luôn xác minh qua `src/lib/headroom/detect.js`/`process.js` (hoặc tương đương) trước khi giả định có thể "sửa logic nén" trực tiếp.
- **Khi không kiểm soát được thuật toán ở phía cung cấp dữ liệu (proxy/service ngoài), điểm đòn bẩy đúng là validate ở boundary nhận dữ liệu về** — cùng triết lý fail-open đã dùng xuyên suốt `headroom.js` cho mọi lỗi khác (timeout, HTTP lỗi, thiếu field, sai thứ tự Kiro...), chỉ cần thêm 1 điều kiện fail-open mới thay vì đổi kiến trúc.
- **Validate theo tính bất biến 2 chiều (mọi tool result phải có tool_calls khai báo, VÀ mọi tool_calls phải có tool result) chặt hơn và an toàn hơn** so với chỉ kiểm tra 1 chiều — cả 2 kiểu lệch đều bị OpenAI-compatible provider từ chối, không riêng gì kiểu user báo cáo.
