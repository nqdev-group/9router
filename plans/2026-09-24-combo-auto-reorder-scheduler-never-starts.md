---
type: bug-fix
complexity: medium
impact: high
related_issues: [QUYIT-737]
related_prs: []
time_spent_hours: ~1
status: completed
---

# Kế hoạch: Combo Auto-Reorder không bao giờ chạy khi server chỉ phục vụ API (không ai mở dashboard)

> **Ngày:** 2026-09-24
> **Phạm vi:** `src/instrumentation.js`, `src/lib/comboAutoReorder/scheduler.js`
> **Trạng thái:** ✅ Đã hoàn thành (code), chưa commit, chưa test bằng cách restart server thật (chỉ verify được qua đọc code + unit test package không đổi)

---

## 1. Bối cảnh

User báo cáo: **Combo Cooldown** hoạt động đúng (thấy model "Cooling down"), nhưng **Combo Auto-Reorder** (tính năng vừa implement xong ngày hôm trước, commit `83dc9b02`, xem `plans/2026-09-23-combo-auto-reorder-planning.md`) không thấy log gì, cũng không thấy model nào bị đẩy xuống cuối danh sách dù có model fail.

Hỏi lại user để loại trừ 2 giả thuyết rẻ tiền trước khi đào sâu:
- Đã bật toggle `comboAutoReorderEnabled` trong Settings? → **Đã bật rồi.**
- Server thật đã deploy image build sau commit `83dc9b02` chưa? → **Đã rebuild + deploy sau đó.**

Cả 2 giả thuyết đơn giản đều bị loại. Đọc lại toàn bộ pipeline (`planReorder.js`, `failingModels.js`, `reorderModels.js`, cách `onModelError` trong `src/sse/handlers/chat.js:99-103` tách `provider`/`model` từ `modelStr`) — không thấy bug logic join-key hay tính toán.

## 2. Công việc đã thực hiện

### 2.1. Tìm ra root cause thật: scheduler chưa bao giờ được khởi động

Đọc `src/shared/services/initializeApp.js`: `startComboAutoReorderSweep()` chỉ được gọi bên trong `runHeavyStartup()`, hàm này chỉ chạy khi `initializeApp()` được gọi. Truy ngược: `initializeApp()` được gọi từ `src/shared/services/bootstrap.js`, và **file này chỉ được import làm side-effect từ `src/app/layout.js:7`** (`import "@/shared/services/bootstrap";`).

**Vấn đề cốt lõi:** `app/layout.js` là Next.js App Router layout — chỉ được Next.js load khi có request khớp 1 **UI page route** (route dùng layout, render HTML). Các API route handler (`app/api/.../route.js`, gồm cả endpoint OpenAI-compatible `/v1/chat/completions` mà Cline/Claude Code gọi trực tiếp) **không đi qua `layout.js`**, nên không bao giờ trigger side-effect import này. Xác nhận với user: server chỉ nhận traffic API, **chưa từng mở dashboard UI trên trình duyệt kể từ lần restart/deploy gần nhất** → `initializeApp()` chưa từng chạy lần nào → `startComboAutoReorderSweep()` chưa từng được gọi → sweep interval không tồn tại, không có gì để log hay để swap.

**Vì sao Cooldown vẫn hoạt động bình thường trong cùng hoàn cảnh:** Cooldown (`packages/model-combo-cooldown`) không phải background job — nó chạy trực tiếp, đồng bộ bên trong request-handling path (`markComboModelFailed` gọi thẳng từ `open-sse/services/combo.js` mỗi khi 1 model fail trong lúc xử lý request), hoàn toàn không phụ thuộc `layout.js`/dashboard có được mở hay không.

**Bằng chứng gián tiếp trong chính codebase xác nhận đây là rủi ro đã biết:** `backgroundTokenRefresh` — 1 scheduler khác cũng được khởi động từ `runHeavyStartup()` — đã có sẵn **đường khởi động dự phòng thứ 2** viết thẳng trong `custom-server.js:18-47` (`startBackgroundTokenRefreshFromCustomServer()`), kèm comment: *"Fail-open if missing — initializeApp also starts the same scheduler when the Next app boots"* — cho thấy team trước đã nhận ra đường `layout.js` không đủ tin cậy để làm nguồn khởi động duy nhất. `startComboAutoReorderSweep()` khi thêm mới (2026-09-23) lại **không** được cho đường dự phòng tương tự — đây chính là gap.

### 2.2. Chọn điểm khởi động đáng tin cậy: `src/instrumentation.js`

Next.js có sẵn hook chính thức `instrumentation.js`'s `register()` — chạy đúng 1 lần khi server process khởi động, **không phụ thuộc route nào được request trước** (đúng mục đích thiết kế của Next.js cho việc này). Repo đã dùng hook này cho các việc khởi động quan trọng khác (`initConsoleLogCapture`, `installCatalogSource`, `startModelCatalogSync`) — xác nhận hook này chạy ổn định trong đúng kiểu deploy của user (nếu không chạy, model catalog sync cũng sẽ hỏng, nhưng user không báo lỗi đó).

Thêm lời gọi `startComboAutoReorderSweep()` vào cuối `register()` trong `instrumentation.js`. An toàn để gọi trùng với đường cũ (`layout.js` → `bootstrap.js` → `initializeApp()`) vì `scheduler.js` có sẵn guard `started` (module-level flag) — gọi lần 2 là no-op, không tạo 2 interval song song.

**Vì sao không dời hẳn toàn bộ `initializeApp()`/`runHeavyStartup()` sang `instrumentation.js` thay vì chỉ thêm 1 dòng cho riêng combo-auto-reorder:** phạm vi user báo cáo là combo-auto-reorder cụ thể; `runHeavyStartup()` còn khởi động tunnel/tailscale/mitm/quotaAutoPing — dời cả khối đó là thay đổi lớn hơn nhiều, rủi ro cao hơn, ngoài phạm vi bug đang sửa. Ghi chú ở mục 5 rằng các job khác cũng có khả năng bị cùng 1 gap.

### 2.3. Thêm log khi thực sự reorder — vá luôn phần "không thấy log gì"

Ngay cả khi scheduler chạy đúng, phát hiện thêm: `tick()` trong `scheduler.js` chỉ gọi `onWarn` khi có **write conflict** (model bị sửa tay đúng lúc sweep chạy), **không hề log** khi 1 lần sweep thực sự demote model nào đó thành công — `runComboAutoReorderSweep()` trả về `{checked, reordered, skipped}` nhưng `tick()` bỏ qua toàn bộ giá trị trả về. Thêm `console.log` khi `result.reordered.length > 0`, liệt kê tên các combo vừa bị reorder — cho user 1 tín hiệu quan sát được tương đương với cách Cooldown hiển thị trạng thái, thay vì phải tự vào trang Settings xem bảng "Currently demoted models" mới biết.

### 2.4. Verify

`npx vitest run --config tests/vitest.config.js tests/unit/combo-auto-reorder.test.js` → 27/27 pass (không đổi logic package thuần, chỉ đổi wiring/log ở `scheduler.js` và `instrumentation.js`, cả 2 file này chưa có test riêng).

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [src/instrumentation.js](../src/instrumentation.js) | Thêm gọi `startComboAutoReorderSweep()` trong `register()` — đường khởi động dự phòng không phụ thuộc `layout.js`/dashboard UI |
| [src/lib/comboAutoReorder/scheduler.js](../src/lib/comboAutoReorder/scheduler.js) | `tick()` giờ đọc `result.reordered` và log khi có combo thực sự bị demote |

## 4. Trạng thái hiện tại

✅ Đã commit (`da182762`, "feat: fix combo auto-reorder scheduler not starting in API-only deployments"). ✅ User xác nhận đã build và deploy lên server thật. **Chưa verify hành vi thực tế** — cần quan sát log `[ComboAutoReorder] demoted fail-prone models in: ...` xuất hiện sau khi 1 model fail đủ ngưỡng (mặc định 10 fail/1h) qua ít nhất 1 chu kỳ sweep (mặc định 5 phút, sau initial delay 15s kể từ lúc process khởi động), và bảng "Currently demoted models" trong Settings có dữ liệu.

## 5. Việc còn mở

- [ ] **Verify trên server thật sau deploy:** chưa có xác nhận log `[ComboAutoReorder]` đã thực sự xuất hiện hay model đã thực sự bị demote — cần user quan sát thêm sau khi có đủ điều kiện trigger (model fail ≥ ngưỡng trong cửa sổ rolling).
- [ ] **Cùng 1 gap kiến trúc rất có thể ảnh hưởng các job khác cũng chỉ khởi động qua `runHeavyStartup()`/`layout.js`:** tunnel/tailscale auto-resume, mitm auto-start, `quotaAutoPing` — tất cả đều phụ thuộc dashboard UI được mở ít nhất 1 lần sau restart, giống hệt bug vừa sửa. Chưa sửa các job này trong phiên này (ngoài phạm vi báo cáo gốc của user, mỗi job có mức độ ưu tiên/rủi ro khác nhau khi thêm redundant-start). Nên hỏi user có deploy kiểu API-only (không mở dashboard) cho các tính năng đó không — nếu có, cần áp dụng đúng pattern này cho từng job.
- [ ] **Ngưỡng mặc định 10 fail / 1 giờ có thể vẫn chưa đạt** dù scheduler giờ chạy đúng — cần user tự quan sát thêm sau khi deploy fix này; nếu vẫn không demote dù chắc chắn 1 model đã fail ≥ 10 lần/1h, quay lại điều tra tiếp (không loại trừ hoàn toàn khả năng có bug thứ 2).

## 6. Bài học rút ra

- **Next.js App Router `layout.js` không phải nơi đáng tin cậy để khởi động background job cho 1 server chủ yếu phục vụ API** — layout chỉ load khi có request khớp UI page route; với 9router (chủ yếu là proxy API, dashboard chỉ là phụ), giả định "sẽ luôn có ai đó mở dashboard sau khi restart" là sai trong nhiều kiểu triển khai thực tế (headless/server-side client). `instrumentation.js`'s `register()` mới là hook đúng của Next.js cho việc này — chạy 1 lần khi server boot, không phụ thuộc route nào được gọi trước.
- **Khi thêm 1 background job mới ăn theo `runHeavyStartup()`, phải tự hỏi "job này có đường khởi động dự phòng không phụ thuộc dashboard UI không?"** — `backgroundTokenRefresh` đã làm đúng việc này (dự phòng trong `custom-server.js`) nhưng `combo-auto-reorder` (thêm sau) lại bỏ sót, dù cùng 1 codebase, cùng pattern khởi động qua `initializeApp.js`.
- **Không có log nào xuất hiện có thể có 2 nguyên nhân hoàn toàn khác nhau: (a) code chạy nhưng không match điều kiện fail, hoặc (b) code chưa bao giờ chạy** — trước khi đào sâu vào logic tính toán (ngưỡng, join-key...), nên xác minh trước tiên bằng câu hỏi đơn giản "job này có thực sự được khởi động không" (kiểm tra qua entrypoint/hook, không chỉ đọc logic nghiệp vụ).

## 7. Jira

Cập nhật vào issue gốc của tính năng (không tạo issue mới — đây là bug fix nối tiếp trực tiếp cùng công việc):

| Field | Giá trị |
|---|---|
| Key | [QUYIT-737](https://nhquydev.atlassian.net/browse/QUYIT-737) |
| Hành động | Thêm comment tóm tắt root cause + fix (2026-09-24), chuyển trạng thái `To Do` → `In Progress` |
| Lý do chưa chuyển `Done` | Đã commit (`da182762`) + user xác nhận đã build và deploy, nhưng chưa có xác nhận log `[ComboAutoReorder]` thực sự xuất hiện trên server thật (mục 4/5) — để `In Progress` cho tới khi verify xong |
