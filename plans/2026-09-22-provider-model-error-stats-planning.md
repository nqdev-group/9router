---
type: feature
complexity: high
status: completed
related_issues: []
related_prs: []
estimated_hours: ~168-224 (21-28 person-days)
---

# Kế hoạch: Trang thống kê lỗi provider/account/model + thao tác xử lý model lỗi trong combo

> **Ngày lập kế hoạch:** 2026-09-22
> **Scope dự kiến:** `src/lib/errorLogDb/` (mới — DB SQLite riêng, tách biệt hoàn toàn `data.sqlite` của app), wiring vào `src/sse/services/auth.js` + `open-sse/services/combo.js`, 2 API endpoint tổng hợp theo giờ, 1 trang dashboard mới (2 chart) trong nhóm "Compression Context", API reverse-lookup + bulk-remove model khỏi combo (kèm dọn cooldown RAM), thêm hàm `clearModelCooldown` vào `packages/model-combo-cooldown/`
> **Priority:** medium

---

## 1. Phân tích / Bối cảnh

**Yêu cầu người dùng (nguyên văn, diễn giải):** thêm 1 trang trong nhóm sidebar "Compression Context" hiển thị 2 danh sách — (a) provider | account bị lỗi | tần suất lỗi theo giờ, (b) provider | model bị lỗi | tần suất lỗi theo giờ — và với mỗi model lỗi, cho 2 thao tác: xem các combo nào đang khai báo dùng model đó, và gỡ model đó khỏi **tất cả** combo trong 1 lần.

**Đã grounding bằng cách đọc code thật (qua skill `nqdev-client-requirement-insight`), không đoán:**

- **Phát hiện quan trọng nhất — hiện chưa có bất kỳ log lỗi nào được lưu trữ trong hệ thống:**
  - `usageHistory` (`src/lib/db/schema.js:109-126`) có cột `status`/`connectionId` nên về mặt schema *có thể* chứa request lỗi, nhưng thực tế `saveRequestUsage()` chỉ được gọi từ 2 nơi (`open-sse/handlers/chatCore/requestDetail.js:138`, `src/sse/handlers/embeddings.js:140`) — cả 2 đều là **success path**, không truyền `status` nên luôn fallback `"ok"`. **Không có request fail nào được ghi lại.**
  - `markAccountUnavailable()`/`clearAccountError()` (`src/sse/services/auth.js:239-319, 330-393`) chỉ ghi **1 snapshot trạng thái hiện tại** per connection (`testStatus`, `lastError`, `errorCode`, `lastErrorAt`) — bị ghi đè mỗi lần đổi, không có lịch sử.
  - `packages/model-combo-cooldown/cooldownStore.js` chỉ là `Map` trong RAM (`comboName::modelStr → expiresAt`) — chỉ trả lời được "model này đang cooldown hay không", không đếm được đã lỗi bao nhiêu lần, và **scope theo từng combo riêng lẻ**, không phải global theo model.
  - → Kết luận: đây **không phải** tính năng "đọc dữ liệu có sẵn rồi vẽ bảng" — phải xây tầng thu thập log lỗi mới trước, rồi mới tổng hợp/hiển thị được.

- **Trang gần giống nhất đã có: `/dashboard/combo-cooldown`** (`src/app/(dashboard)/dashboard/combo-cooldown/page.js`, plan cũ `plans/2026-09-05-model-combo-cooldown-planning.md`). Đây chỉ là UI pattern tham khảo (Card + table + sidebar entry theo nhóm Compression Context), **không phải nguồn dữ liệu tham khảo** — nó poll `listActiveCooldowns()` (RAM, không lịch sử), không có breakdown theo provider/account, không có tần suất theo giờ.

- **Lưu trữ combo:** bảng `combos` (`schema.js:89-98`) — cột `models` là JSON array đơn giản. `combosRepo.js`'s `updateCombo(id, data)` chỉ update **1 combo theo id** — chưa có sẵn reverse-lookup "combo nào dùng model X" hay bulk-update nhiều combo cùng lúc, nhưng logic để tự viết đơn giản (loop `getCombos()` + filter + update từng cái).

- **Trùng lặp tiềm ẩn với tính năng đã có — Provider Alert** (`plans/2026-06-15-provider-alert-plan.md`): đã có sẵn cơ chế phân loại account `available`/`temporarily_down`/`permanently_down` + gửi Discord alert khi 1 provider mất hết account khả dụng. Trang mới này có breakdown chi tiết hơn (theo giờ, theo model) nhưng nên làm rõ có tái dùng logic phân loại đó không, tránh 2 hệ thống phân loại lỗi song song không nhất quán (xem mục 4).

- **Sidebar:** nhóm `compressionContextItems` (`src/shared/components/Sidebar.js:57-70`) hiện có: API Docs, Combos Pipeline, Combo Cooldown, RTK Engine, Caveman Engine, CMEM Engine, Response Cache, Token Limit Routing, Token Saver Report, Provider Alert, Privacy Engine, Models.dev — trang mới hợp lý về mặt chủ đề khi đặt cạnh Combo Cooldown/Token Saver Report/Provider Alert.

## 2. Approach / Strategy

**Kiến trúc 2 tầng, làm theo đúng thứ tự phụ thuộc:**

1. **Tầng thu thập (mới hoàn toàn):** 1 bảng ghi log lỗi (`provider`, `connectionId`, `model`, `comboName`, `errorCode`, `timestamp`) — wire vào tối thiểu 2 điểm: `auth.js` (account-level, khi `markAccountUnavailable` chạy — `comboName` để `NULL`, không áp dụng) và `combo.js`/`accountFallback.js` (model-level, khi 1 model bị đánh dấu fail). **Đã chốt với user (2026-09-22): model-level lỗi scope theo từng combo** (`comboName` **bắt buộc**, không nullable cho row model-level) — khớp đúng scope hiện tại của `markComboModelFailed(comboName, modelStr, ...)` trong `combo.js`, nên wiring đơn giản hơn dự tính ban đầu (không cần thiết kế song song global + per-combo). **Giới hạn đã biết theo quyết định này:** request gọi model trực tiếp (không qua combo) sẽ **không** có log lỗi model-level — chỉ áp dụng cho model trong 1 combo cụ thể, đúng phạm vi yêu cầu gốc ("model có khai báo dùng trong combo"). Retention: **7 ngày** (đã chốt, xem mục 4).
2. **Tầng tổng hợp:** 2 API endpoint GROUP BY giờ — 1 cho account, 1 cho model — tương tự pattern `getChartData()` đã có ở token-saver-report, chỉ khác nguồn dữ liệu.
3. **Tầng hiển thị:** trang mới mirror pattern `combo-cooldown`/`token-saver-report` (Card + table, sidebar entry trong nhóm Compression Context).
4. **Thao tác trên model lỗi:** reverse-lookup (`GET`, filter `combos` theo `models` chứa model X) + bulk-remove (loop update từng combo có match, kèm `ConfirmModal` vì đây là thao tác phá hủy).

**Vì sao không tái dùng `usageHistory` trực tiếp mà dùng bảng riêng:** `usageHistory` hiện là bảng "chỉ ghi request thành công" theo đúng thiết kế ban đầu (dùng cho cost/token report) — thêm luồng ghi lỗi vào đây làm lẫn 2 mục đích khác nhau (billing/usage vs error-monitoring), có thể ảnh hưởng các query aggregate hiện có nếu không cẩn thận filter `status`. **Đã chốt với user (2026-09-22): tạo bảng log lỗi hoàn toàn riêng**, không mở rộng `usageHistory`.

**Bổ sung — DB riêng hoàn toàn, không dùng chung DB app (đã chốt với user, 2026-09-22).** Không chỉ "bảng riêng trong cùng DB" như dự tính ban đầu ở trên — mà **1 file SQLite hoàn toàn tách biệt** với `data.sqlite` (DB chính của app). Đã đọc `src/lib/db/driver.js`/`paths.js` để xác nhận tính khả thi và độ phức tạp thật:
- `src/lib/db/driver.js` hiện là **1 singleton cứng, chỉ trỏ tới đúng 1 file** (`DATA_FILE = DB_DIR/data.sqlite`, từ `paths.js`) — dùng `global._dbAdapter` để sống sót qua Next.js hot-reload, có fallback chain 4 driver (`bun:sqlite` → `better-sqlite3` → `node:sqlite` → `sql.js`) tùy runtime. **Chưa từng có pattern multi-DB trong repo này** — đây là lần đầu tiên cần 2 file DB độc lập cùng lúc.
- **Cách làm:** tạo **1 module driver mới** (vd `src/lib/errorLogDb/driver.js`) **mirror y hệt cấu trúc fallback-chain + singleton** của `src/lib/db/driver.js`, chỉ đổi target path (vd `DB_DIR/error-log.sqlite` — vẫn nằm trong `DATA_DIR` sẵn có, xem dưới) và đổi tên biến global singleton (`global._errorLogDbAdapter`, tránh đụng singleton của DB chính). Không tái dùng `runMigrationOnce()` của app (gắn với schema toàn app) — DB mới tự có 1 bước init schema riêng, nhỏ, chỉ gồm bảng log lỗi + index (tương tự cách `packages/cmem`'s `MemoryStore.init()` tự `CREATE TABLE IF NOT EXISTS` không qua migration chung).
- **Không cần đổi hạ tầng Docker/volume:** file DB mới vẫn đặt trong `DATA_DIR` (`DB_DIR = DATA_DIR/db`, đã mount sẵn qua volume `9router-data` trong `docker-compose.yml`) — chỉ là 1 filename khác trong cùng thư mục đã persist sẵn, không cần thêm volume/path mount mới.
- **Lý do tách DB (suy luận, cần xác nhận thêm nếu sai — xem Unknown 6 mục 4):** cô lập write-load tần suất cao của log lỗi khỏi DB chính (tránh lock contention ảnh hưởng các query app khác), và có thể tùy chỉnh backup/retention/kích thước riêng biệt với DB chính.
- **Effort tăng thêm ~2-3 ngày** so với phương án "bảng riêng cùng DB" (đã phản ánh vào estimate frontmatter) — vì phải tự dựng lại driver-selection + singleton pattern cho DB thứ 2, dù là mirror 1 pattern đã có sẵn (rủi ro thiết kế thấp), không phải thiết kế mới từ đầu.

**Hiển thị tần suất theo giờ: chart, không phải bảng số.** **Đã chốt với user (2026-09-22): dùng chart trực quan** (bar/sparkline theo giờ) ngay từ MVP, không phải bảng số đếm thô như default ban đầu đề xuất — cộng thêm ~1-2 ngày effort so với phương án bảng số (đã phản ánh vào estimate ở frontmatter). Tái dùng pattern chart đã có ở `SavingsTrendChart.js` (`packages/components/token-saver-report/`) làm tham khảo trực tiếp — cùng nhu cầu: time-bucket theo trục X, có thể tái dùng thư viện chart (Recharts) đã dùng sẵn trong repo.

**Dọn cooldown RAM khi bulk-remove model khỏi combo:** **Đã chốt với user (2026-09-22): có, phải dọn.** Xác nhận thêm: `packages/model-combo-cooldown/cooldownStore.js`'s `resetComboCooldown(comboName)` hiện **chỉ xóa được toàn bộ cooldown của cả combo** (mọi model trong combo đó), **chưa có** hàm xóa đúng 1 cặp `(comboName, modelStr)` — nếu dùng `resetComboCooldown` sẽ vô tình xóa luôn cooldown của các model khác không liên quan trong cùng combo. → Cần thêm 1 hàm mới nhỏ (vd `clearModelCooldown(comboName, modelStr)`) vào package này, export qua `index.js`, gọi từ API bulk-remove ở Phase 2 cho từng cặp combo+model bị gỡ.

## 3. Công việc cần thực hiện (Todo)

### Phase 1 — MVP — ✅ Đã hoàn thành 2026-09-22
- [x] Tạo `src/lib/errorLogDb/paths.js` — `ERROR_LOG_DB_FILE = path.join(DB_DIR, "error-log.sqlite")`, tái dùng `DB_DIR` từ `src/lib/db/paths.js`
- [x] Tạo `src/lib/errorLogDb/driver.js` — mirror fallback-chain + singleton pattern của `src/lib/db/driver.js`, dùng `global._errorLogDbAdapter` riêng, tự gọi `initSchema()` thay vì `runMigrationOnce`
- [x] Tạo `src/lib/errorLogDb/schema.js` — 1 bảng `error_log` (`provider`, `connection_id`, `model`, `combo_name`, `error_code`, `created_at_epoch`) + 3 index
- [x] Tạo `src/lib/errorLogDb/errorLogRepo.js` — `logAccountError`/`logModelError` (fail-open, không throw), `getAccountErrorFrequency`/`getModelErrorFrequency` (raw hourly rows), `getAccountErrorChartData`/`getModelErrorChartData` (pivot sang `{buckets, series}` cho chart, cap `MAX_CHART_SERIES = 8`), `getFailingModels`, `cleanupOldErrorLogs` (7 ngày retention, `setInterval` 24h giống CMEM)
- [x] Wire `src/sse/services/auth.js` (`markAccountUnavailable`) — gọi `logAccountError` ngay sau `updateProviderConnection`
- [x] Wire `open-sse/services/combo.js` — thêm param `onModelError` vào `handleComboChat()`, gọi ở cả 2 nhánh fail (fallback + catch). **Không** gọi trực tiếp `src/lib/errorLogDb` từ đây — `open-sse/` không được import `src/`, nên dùng dependency-injection giống `tierRouting`/`tokenLimitRouting`/`modelCooldown` đã có sẵn; implementation thật wire ở `src/sse/handlers/chat.js` (cả 2 call site thật của `handleComboChat`, không phải nhánh capacity-adapter)
- [x] API `GET /api/error-stats/accounts`, `GET /api/error-stats/models` (kèm `failingModels` cho Phase 2)
- [x] Trang dashboard `/dashboard/error-stats` — 2 chart (`ErrorFrequencyChart`, Recharts `LineChart`, mirror `SavingsTrendChart.js`) + bảng "Failing models"
- [x] Sidebar entry `compressionContextItems`

### Phase 2 — Thao tác xử lý model lỗi — ✅ Đã hoàn thành 2026-09-22
- [x] `clearModelCooldown(comboName, modelStr)` — thêm vào `packages/model-combo-cooldown/cooldownStore.js` + export `index.js` (xóa đúng 1 cặp, khác `resetComboCooldown` xóa cả combo)
- [x] API `GET /api/combos/using-model?model=` (query param, không phải dynamic path segment — model string chứa `/`)
- [x] API `POST /api/combos/remove-model` — loop combo có match, `updateCombo` + `clearModelCooldown` cho từng combo bị ảnh hưởng
- [x] UI: nút "Show combos"/"Hide combos" (expand inline) + nút "Remove from all combos" + `ConfirmModal` (liệt kê số combo bị ảnh hưởng nếu đã biết, fallback "every combo that declares it" nếu chưa fetch)

## 4. Risks & Unknowns

- ~~**Risk 1:** Model-level lỗi hiện tại (cooldown) scope theo từng combo...~~ — **Đã chốt (2026-09-22): scope theo từng combo**, khớp đúng cơ chế cooldown hiện có. Không còn rủi ro đổi schema giữa chừng.
- **Risk 2:** Trùng lặp/không nhất quán với hệ phân loại lỗi đã có ở Provider Alert (`available`/`temporarily_down`/`permanently_down`). → **Mitigation:** khảo sát kỹ `packages/provider-alert/engine.js` lúc code, cân nhắc tái dùng `classifyConnections` (đã export sẵn từ session MCP-server trước) thay vì viết phân loại mới.
- **Risk 3 (mới, phát sinh từ quyết định retention 7 ngày):** Với tần suất "lỗi theo giờ", 7 ngày = 168 bucket giờ mỗi provider/model — đủ để thấy trend theo tuần, nhưng nếu sau này user muốn so sánh theo tháng (vd đối chiếu với Provider Alert cooldown 15 phút hay pattern lỗi theo lịch) sẽ không còn dữ liệu cũ. → **Mitigation:** chấp nhận theo quyết định user, ghi rõ trong UI "chỉ hiển thị 7 ngày gần nhất" để tránh hiểu nhầm là lịch sử đầy đủ.
- ~~**Unknown 1:** Model-level lỗi tính global hay theo từng combo?~~ — **Đã chốt (2026-09-22): theo từng combo** (giống cooldown hiện tại).
- ~~**Unknown 2:** Retention bao lâu?~~ — **Đã chốt (2026-09-22): 7 ngày.**
- ~~**Unknown 3:** Bảng log lỗi mới hoàn toàn hay mở rộng `usageHistory`?~~ — **Đã chốt (2026-09-22): không chỉ bảng riêng mà DB hoàn toàn riêng** (file SQLite tách biệt `data.sqlite` của app — xem mục 2).
- ~~**Unknown 4:** "Tần suất lỗi theo giờ" hiển thị bảng số hay chart?~~ — **Đã chốt (2026-09-22): chart trực quan.**
- ~~**Unknown 5:** Gỡ model khỏi combo có cần dọn luôn cooldown RAM không?~~ — **Đã chốt (2026-09-22): có, phải dọn** — cần thêm hàm `clearModelCooldown` mới (xem mục 2/3).
- ~~**Unknown 6:** Lý do thật đằng sau yêu cầu "DB riêng"?~~ — **Đã xác nhận (2026-09-22): đúng như suy luận — cô lập write-load tần suất cao của log lỗi khỏi DB chính**, tránh lock contention ảnh hưởng query app khác. Thiết kế hiện tại (mục 2/3) đáp ứng đúng mục đích này, không cần đổi gì thêm.
- **Đã xác nhận (2026-09-22):** cách triển khai "không cần hạ tầng mới — file DB mới vẫn nằm trong `DATA_DIR` đã mount sẵn qua volume Docker, chỉ khác filename, không cần volume/path mount riêng" — đúng theo đề xuất, user duyệt trực tiếp cách làm này.

## 5. Success Criteria — tất cả đã đạt, verify 2026-09-22

- [x] Trang mới xuất hiện trong nhóm sidebar "Compression Context" (`/dashboard/error-stats`), 2 chart: provider|account|tần suất lỗi/giờ và provider|model|tần suất lỗi/giờ, dữ liệu từ log thật.
- [x] Log lỗi lưu trong 1 file SQLite riêng biệt (`error-log.sqlite`, cùng `DATA_DIR/db/` với `data.sqlite` nhưng độc lập hoàn toàn) — test `errorLogDb — separate file from the app DB` xác nhận 2 path khác nhau + adapter thật tạo được file.
- [x] Với mỗi model lỗi, xem được danh sách combo đang khai báo dùng model đó — `GET /api/combos/using-model`, test route-level pass.
- [x] Gỡ 1 model khỏi tất cả combo trong 1 thao tác, có `ConfirmModal`, đồng thời dọn sạch cooldown RAM đúng cặp combo+model (không đụng model khác cùng combo) — test route-level xác nhận cả 2 vế.
- [x] Log lỗi có retention 7 ngày — test `cleanupOldErrorLogs deletes rows older than 7 days, keeps recent rows` pass.
- [x] Không phá vỡ hành vi hiện có của `usageHistory`/cost report/token-saver report — DB tách riêng hoàn toàn, 0 thay đổi vào các file đó.

## 6. Questions / Dependencies

Tất cả 6 câu hỏi (Unknown 1-6) đã được user trả lời/xác nhận (2026-09-22), không còn gì mở.

## 7. Kết quả thực thi (2026-09-22)

### Files mới

| File | Nội dung |
|---|---|
| [src/lib/errorLogDb/paths.js](../src/lib/errorLogDb/paths.js) | `ERROR_LOG_DB_FILE` |
| [src/lib/errorLogDb/driver.js](../src/lib/errorLogDb/driver.js) | Mirror `src/lib/db/driver.js` — fallback-chain + singleton riêng cho DB thứ 2 |
| [src/lib/errorLogDb/schema.js](../src/lib/errorLogDb/schema.js) | `initSchema()` — bảng `error_log` + 3 index |
| [src/lib/errorLogDb/errorLogRepo.js](../src/lib/errorLogDb/errorLogRepo.js) | Write (`logAccountError`/`logModelError`, fail-open) + read (hourly frequency, chart pivot, failing-models list) + retention cleanup |
| [src/app/api/error-stats/accounts/route.js](../src/app/api/error-stats/accounts/route.js), [.../models/route.js](../src/app/api/error-stats/models/route.js) | 2 API `GET` thin route |
| [src/app/api/combos/using-model/route.js](../src/app/api/combos/using-model/route.js) | Reverse-lookup, query param `?model=` |
| [src/app/api/combos/remove-model/route.js](../src/app/api/combos/remove-model/route.js) | Bulk-remove + clear cooldown |
| [src/app/(dashboard)/dashboard/error-stats/page.js](<../src/app/(dashboard)/dashboard/error-stats/page.js>) | Trang dashboard — 2 chart + bảng failing models + actions |
| [packages/components/error-stats/ErrorFrequencyChart.js](../packages/components/error-stats/ErrorFrequencyChart.js) + `index.js` | Component chart dùng chung (Recharts `LineChart`, mirror `SavingsTrendChart.js`) |
| [tests/unit/error-log-db.test.js](../tests/unit/error-log-db.test.js) | 9 test — DB riêng, write/read account+model, chart pivot + cap, retention |
| [tests/unit/error-stats-routes.test.js](../tests/unit/error-stats-routes.test.js) | 6 test route-level — cả 4 route qua handler thật |

### Files đã sửa

| File | Thay đổi |
|---|---|
| [src/sse/services/auth.js](../src/sse/services/auth.js) | Import `logAccountError`, gọi sau `updateProviderConnection` trong `markAccountUnavailable` |
| [open-sse/services/combo.js](../open-sse/services/combo.js) | Thêm param `onModelError` vào `handleComboChat()`, gọi ở 2 nhánh fail (fallback + catch), độc lập `modelCooldown?.enabled` |
| [src/sse/handlers/chat.js](../src/sse/handlers/chat.js) | Thêm hàm `onModelError()` (parse provider/model từ modelStr, gọi `logModelError`), wire vào cả 2 call site thật của `handleComboChat` |
| [packages/model-combo-cooldown/cooldownStore.js](../packages/model-combo-cooldown/cooldownStore.js) + `index.js` | Thêm `clearModelCooldown(comboName, modelStr)` |
| [src/shared/components/Sidebar.js](../src/shared/components/Sidebar.js) | Thêm entry "Error Stats" vào `compressionContextItems` |
| [packages/components/index.js](../packages/components/index.js) | Export `ErrorFrequencyChart` |
| [tests/unit/model-combo-cooldown.test.js](../tests/unit/model-combo-cooldown.test.js) | +2 test cho `clearModelCooldown` |
| [scripts/generate-internal-openapi.mjs](../scripts/generate-internal-openapi.mjs) | Thêm `error-stats` vào `TAG_GROUPS`, chạy lại generator (158 path/243 operation, từ 154/239) |
| [src/app/api/docs/internal-openapi/internal-swagger.json](../src/app/api/docs/internal-openapi/internal-swagger.json) | Output regenerate |
| `AGENTS.md`, `open-sse/services/AGENTS.md`, `src/sse/AGENTS.md`, `src/app/api/AGENTS.md` | Cập nhật docs cho DB riêng, `onModelError`, route mới, `clearModelCooldown` |

### Kiến trúc quan trọng phát hiện lúc code (khác giả định ban đầu)

**`open-sse/` không được import `src/`** — phát hiện ngay khi chuẩn bị wire `logModelError` trực tiếp vào `combo.js`. Đã dừng lại, đọc `AGENTS.md` xác nhận rule, và chuyển sang dependency-injection đúng pattern có sẵn (`tierRouting`/`tokenLimitRouting`/`modelCooldown` đều được `chat.js` build rồi truyền vào `combo.js`, không phải `combo.js` tự import) — thêm param `onModelError`, implementation thật nằm ở `chat.js`. Đây là lý do file `errorLogRepo.js` ở `src/lib/errorLogDb/` (không phải `packages/`) nhưng vẫn đúng convention — mirror chính xác cách `src/lib/db/repos/*.js` (combosRepo, usageRepo, pricingRepo, modelTokenLimitsRepo) đã làm từ trước: repo/query logic cho 1 bảng cụ thể được coi là "infra glue" theo AGENTS.md, không cần tách ra `packages/`.

### Verification

- **Unit + route test:** `error-log-db.test.js` (9), `error-stats-routes.test.js` (6), `model-combo-cooldown.test.js` (9, +2 mới) — tất cả pass.
- **Regression:** chạy lại `combo-autoswitch`/`combo-fusion`/`combo-routing`/`combo-token-limit`/`account-fallback-4xx`/`tier-routing`/`ollama-internal-openapi-spec`/`ollama-public-openapi-spec`/`cmem*` — 173 pass, chỉ 2 fail pre-existing không liên quan (`combo-autoswitch.test.js`, đã xác nhận từ phiên trước bằng `git stash`).
- **Lint:** `eslint` sạch cho toàn bộ file backend mới/sửa. 2 file UI (`ErrorFrequencyChart.js`, `error-stats/page.js`) có đúng 1 lỗi `react-hooks/set-state-in-effect` — xác nhận đây là lỗi **đã có sẵn, chưa fix** trong `combo-cooldown/page.js` (file làm mẫu), không phải lỗi mới — giữ nguyên theo đúng pattern đã có, không tự ý sửa khác đi so với file tham khảo.
- **Gotcha phát hiện:** `node --check` **không** validate JSX thật sự (file JSX hỏng rõ ràng vẫn exit 0) — phải dùng `node node_modules/eslint/bin/eslint.js` (bypass `.cmd` wrapper bị lỗi parse path có ngoặc `(dashboard)` trên Git Bash/Windows) để kiểm tra JSX thật.
- Chưa commit — đang chờ user review.
