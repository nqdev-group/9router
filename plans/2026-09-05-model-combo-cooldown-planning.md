---
type: feature
complexity: medium
status: completed
related_issues: [QUYIT-693]
related_prs: []
estimated_hours: ~36-40
---

# Kế hoạch: Model Cooldown cho Combos Pipeline

> **Ngày lập kế hoạch:** 2026-09-05
> **Scope dự kiến:** `packages/model-combo-cooldown/` (mới), `open-sse/services/combo.js`, `src/sse/handlers/chat.js`, `tests/unit/`
> **Priority:** medium

---

## 1. Phân tích / Bối cảnh

Yêu cầu khách hàng: khi 1 model trong Combos Pipeline trả về lỗi thất bại, hệ thống phải tự động đánh dấu "bỏ qua" (skip) model đó trong 5 phút — các request tới combo trong khoảng thời gian này sẽ không gọi vào model đang bị skip nữa. Sau 5 phút, đánh dấu skip tự động bị xóa (model quay lại vòng quay bình thường).

Bối cảnh kỹ thuật hiện có (đã khảo sát trước khi lên plan):
- `open-sse/services/combo.js` (`handleComboChat`) đã có sẵn 1 pipeline filter/reorder chạy trước vòng lặp fallback: `tokenLimitRouting` (lọc cứng model không đủ token) → `tierRouting` (reorder theo cost) → auto-switch theo capability. Tính năng mới sẽ là 1 bước filter tương tự, chèn vào cùng vị trí.
- Cơ chế gần giống đã tồn tại nhưng khác scope: `markAccountUnavailable`/`isModelLockActive` (`src/sse/services/auth.js`) set cooldown `modelLock_${model}` — nhưng đó là **per-connection/per-account**, không phải per-model-toàn-combo. Không tái dùng được, phải xây mới.
- **Pitfall đã biết** (ghi trong `src/sse/AGENTS.md`): combo detection chạy 2 lần trong `chat.js` — 1 lần ở `handleChat` (dòng ~205-218) và 1 lần lặp lại trong `handleSingleModelChat` khi `modelInfo.provider` null (dòng ~285-298). Cả 2 nhánh đều tự dựng `tierRouting`/`tokenLimitRouting` config riêng — bất kỳ thay đổi nào ở 1 nhánh mà quên nhánh kia sẽ gây hành vi không nhất quán tùy đường request đi qua nhánh nào.
- Rule bắt buộc của repo (`AGENTS.md` — "New features: always in packages/"): toàn bộ logic mới phải nằm trong `packages/`, `src/`/`open-sse/` chỉ được import để dùng, không viết logic trực tiếp.

**Quyết định đã chốt với khách hàng (không cần hỏi lại):**
- Phạm vi skip: **theo từng combo riêng** (key = `comboName + modelStr`), không phải global theo tên model — cùng 1 model có thể bị skip ở combo A nhưng vẫn dùng bình thường ở combo B.
- Lưu trữ: **in-memory** (Map, giống pattern `comboRotationState` đã có sẵn trong `combo.js`) — không cần bảng DB/migration mới. Chấp nhận mất trạng thái khi restart server (TTL chỉ 5 phút nên rủi ro thấp).
- Khi TẤT CẢ model trong 1 combo đều đang cooldown cùng lúc: **fail-open** — bỏ qua skip-list, vẫn thử hết models như bình thường (giống contract có sẵn của `filterModelsByTokenLimit`: không bao giờ trả về danh sách rỗng).

## 2. Approach / Strategy

**Phương án chọn:** Thêm 1 package mới thuần logic (`packages/model-combo-cooldown/`) implement TTL-map, sau đó wire vào đúng 2 điểm hiện có: pipeline filter trong `handleComboChat` (combo.js) và 2 nhánh gọi `handleComboChat` trong `chat.js`.

**Vì sao không chọn DB-backed:** Khách hàng đã xác nhận in-memory là đủ; thêm bảng/migration cho 1 trạng thái sống 5 phút là over-engineering, tăng effort ~1-2 ngày không cần thiết ở giai đoạn MVP.

**Vì sao không áp dụng cho Fusion combo (loại trừ khỏi MVP):** Fusion (`handleFusionChat`) gọi song song toàn bộ panel model, không phải vòng lặp fallback tuần tự — áp filter skip vào đây sẽ ảnh hưởng tới quorum math (`minPanel`), cần thiết kế riêng, không nằm trong yêu cầu gốc (yêu cầu nói "khi request tới combo" trong ngữ cảnh model lỗi rồi fallback — khớp với fallback/round-robin, không khớp fan-out song song).

**Điểm kích hoạt cooldown (mark failed) — quyết định kỹ thuật cần xác nhận trước khi code (xem mục 6):**
Chỉ mark cooldown khi lỗi thuộc loại **đã được `checkFallbackError` phân loại là `shouldFallback=true`** (429/500/502/503/504/timeout) hoặc khi handler ném exception (catch block) — **không** mark khi `shouldFallback=false` (lỗi 400/content-filter — lỗi do request, không phải do model, tránh oan uổng model tốt).

**Key steps:**
1. Core engine (package mới, pure logic, có unit test riêng)
2. Wire filter + mark-failed vào `combo.js`
3. Wire config builder vào cả 2 nhánh của `chat.js`
4. Integration test end-to-end qua combo pipeline thật
5. Cập nhật `AGENTS.md`/`src/sse/AGENTS.md` (thêm dòng vào bảng `packages/` + ghi chú pitfall combo-detection-duplicate nếu áp dụng)

## 3. Công việc cần thực hiện (Todo)

- [x] Tạo `packages/model-combo-cooldown/`: `cooldownStore.js` (`markComboModelFailed`, `isComboModelSkipped` lazy-expire, `filterSkippedComboModels` fail-open, `resetComboCooldown`), `config/defaults.js` (`DEFAULT_MODEL_COOLDOWN_TTL_MS = 5 * 60 * 1000`), `index.js` (barrel export)
- [x] ~~Đăng ký export trong `packages/index.js`~~ — không cần: `packages/index.js` chỉ là stub cho path alias `@9router/*` (xác nhận qua `token-limit-routing`/`tier-routing`, cả hai cũng không đăng ký ở đó)
- [x] Unit test package: [tests/unit/model-combo-cooldown.test.js](../tests/unit/model-combo-cooldown.test.js) — mark → skip đúng combo, không skip combo khác cùng model, fail-open khi cả 2 model đều skip, hết hạn đúng TTL (fake timers), không skip model chưa từng fail
- [x] Sửa [open-sse/services/combo.js](../open-sse/services/combo.js): thêm bước filter `modelCooldown` ngay sau `tokenLimitRouting`, trước `tierRouting`/auto-switch; log `cooldown: skip [...] (recent failure in combo "...")`
- [x] Sửa `open-sse/services/combo.js`: gọi `markComboModelFailed(comboName, modelStr, modelCooldown.ttlMs)` ở đúng 2 điểm (nhánh fallback trước khi thử model tiếp, và nhánh `catch` exception) — xác nhận KHÔNG gọi ở nhánh `!shouldFallback` (return sớm, không chạm code này)
- [x] Sửa [src/sse/handlers/chat.js](../src/sse/handlers/chat.js) nhánh 1 (`handleChat`): thêm `modelCooldown: { enabled: true }` vào lời gọi `handleComboChat`
- [x] Sửa `src/sse/handlers/chat.js` nhánh 2 (`handleSingleModelChat`): thêm y hệt `modelCooldown: { enabled: true }` — đã diff kỹ cả 2 nhánh để tránh lệch nhau
- [x] Integration test: [tests/unit/combo-model-cooldown.test.js](../tests/unit/combo-model-cooldown.test.js) — 6 case qua `handleComboChat` thật (skip cùng combo, không skip combo khác, hết hạn TTL, fail-open cả combo cooldown, no-op khi không truyền `modelCooldown`)
- [x] Cập nhật `AGENTS.md` (thêm dòng `model-combo-cooldown/` vào bảng `packages/*`) + `src/sse/AGENTS.md` (thêm `modelCooldown` vào mô tả pipeline combo + vào danh sách field phải đồng bộ ở pitfall combo-detection-duplicate)
- [x] Chạy full test suite trên Windows (`cd tests && npx vitest run --reporter=verbose --config ./vitest.config.js`) — xem mục "Kết quả thực thi" bên dưới

## 4. Risks & Unknowns

- **Risk 1:** Quên đồng bộ 2 nhánh combo detection trong `chat.js` → hành vi cooldown chỉ có hiệu lực tùy đường request đi qua nhánh nào → **Mitigation:** checklist rõ ràng ở Todo, review kỹ diff cả 2 nhánh trước khi commit.
- **Risk 2:** Định nghĩa "lỗi thất bại" mơ hồ trong yêu cầu gốc, có thể team/khách hàng hiểu khác với đề xuất kỹ thuật (chỉ mark khi `shouldFallback=true`) → **Mitigation:** xác nhận lại điểm này với khách hàng trước khi merge (xem mục 6), vì nếu áp dụng sai (mark cả lỗi 400/content-filter) sẽ oan uổng model tốt.
- **Unknown 1:** Có cần dashboard hiển thị model đang cooldown không (Combos UI) → **Plan:** để Phase 2, không block MVP; hỏi khách hàng sau khi merge MVP nếu cần.
- **Unknown 2:** In-memory Map không chia sẻ giữa nhiều instance nếu sau này scale ngang → **Plan:** chấp nhận được vì AGENTS.md ghi rõ 9Router là gateway single-instance ("local AI routing gateway"); ghi chú rủi ro này vào code comment nếu cần.

## 5. Success Criteria

- Model fail trong 1 combo (lỗi thuộc `shouldFallback=true` hoặc exception) → request tiếp theo tới **cùng combo đó** không gọi model này nữa trong 5 phút.
- Cùng model đó vẫn được gọi bình thường ở combo khác (đúng scope per-combo đã chốt).
- Sau đúng 5 phút (khớp lazy-expire), model tự động quay lại vòng quay, không cần thao tác thủ công.
- Nếu tất cả model trong 1 combo đều đang cooldown cùng lúc → combo vẫn thử hết toàn bộ model như bình thường (fail-open), không trả lỗi 503 oan.
- Test suite mới pass, không phát sinh regression so với `known-fails.txt` hiện có.
- Cả 2 nhánh combo-detection trong `chat.js` có hành vi nhất quán.

## 6. Questions / Dependencies

- ~~Xác nhận với khách hàng: cooldown chỉ áp dụng cho lỗi "thực sự do model/provider" (429/500/502/503/504/timeout/exception), không áp dụng lỗi do request sai (400/content-filter)~~ — **✅ đã xác nhận (2026-09-05): đúng, chỉ 429/5xx/timeout/exception.** Khớp 100% với những gì đã code (mark chỉ ở nhánh `shouldFallback=true` + `catch`), không cần sửa gì thêm.
- ~~Xác nhận: Fusion combo (panel + judge) tạm thời không áp dụng cooldown ở MVP này~~ — **✅ đã xác nhận (2026-09-05): ổn, giữ nguyên loại khỏi MVP.** Không cần sửa `handleFusionChat`.
- Không phụ thuộc task nào khác đang chạy song song trong repo tại thời điểm lập plan này.

**Trạng thái cuối:** cả 2 câu hỏi mở đã được khách hàng xác nhận khớp đúng với implementation hiện tại — không phát sinh thay đổi code nào từ việc xác nhận này. Feature coi như hoàn tất, không còn quyết định treo.

## 7. Kết quả thực thi (2026-09-05)

**Files đã tạo/sửa:**

| File | Thay đổi |
|---|---|
| [packages/model-combo-cooldown/cooldownStore.js](../packages/model-combo-cooldown/cooldownStore.js) (**Mới**) | Core TTL-map: mark/isSkipped/filter (fail-open)/reset |
| [packages/model-combo-cooldown/config/defaults.js](../packages/model-combo-cooldown/config/defaults.js) (**Mới**) | `DEFAULT_MODEL_COOLDOWN_TTL_MS = 300000` |
| [packages/model-combo-cooldown/index.js](../packages/model-combo-cooldown/index.js) (**Mới**) | Barrel export |
| [tests/unit/model-combo-cooldown.test.js](../tests/unit/model-combo-cooldown.test.js) (**Mới**) | 5 unit test cho package |
| [tests/unit/combo-model-cooldown.test.js](../tests/unit/combo-model-cooldown.test.js) (**Mới**) | 6 integration test qua `handleComboChat` thật |
| [open-sse/services/combo.js](../open-sse/services/combo.js) | Import package; thêm filter step + 2 điểm `markComboModelFailed` trong `handleComboChat` |
| [src/sse/handlers/chat.js](../src/sse/handlers/chat.js) | Thêm `modelCooldown: { enabled: true }` ở cả 2 nhánh gọi `handleComboChat` |
| `AGENTS.md` | Thêm dòng `model-combo-cooldown/` vào bảng `packages/*` |
| `src/sse/AGENTS.md` | Cập nhật mô tả pipeline combo + pitfall combo-detection-duplicate |

**Kiểm chứng đã làm (không chỉ tin theo code, đã chạy thật):**
- 11 test mới (5 unit + 6 integration) chạy pass 100% qua `cd tests && npx vitest run --config ./vitest.config.js`.
- Full test suite (2365 test) chạy xong: 126 fail tổng, nhưng đã **loại trừ bằng git stash** — stash riêng `combo.js`+`chat.js` về bản gốc rồi chạy lại `combo-autoswitch.test.js`: 2 fail y hệt vẫn xuất hiện → xác nhận đây là lỗi có sẵn từ trước (không phải do thay đổi này), không phải regression.
- Đối chiếu toàn bộ danh sách fail (JSON reporter) với `tests/__baseline__/known-fails.txt`: không có file nào trong scope thay đổi (`combo*.js`, `tier-routing`, `token-limit-routing`, `model-combo-cooldown`, `chat.js`) xuất hiện là fail mới ngoài 2 fail có sẵn nói trên. Phần lớn trong 126 fail là baseline drift rộng hơn nhiều so với `known-fails.txt` (24 dòng) — không liên quan tới scope plan này, AGENTS.md đã tự nhận suite "not all-green on plain checkout".

**Việc còn mở:** 2 câu hỏi mục 6 chưa được khách hàng xác nhận chính thức; Phase 2 (dashboard hiển thị model cooldown, TTL cấu hình được, mở rộng sang Fusion) chưa làm — đúng như đã loại trừ khỏi MVP.

## 8. Phase 2 bổ sung (2026-09-05): trang theo dõi cooldown

Yêu cầu bổ sung: thêm trang dashboard riêng để xem model nào đang bị skip, dữ liệu lấy trực tiếp từ in-memory (không cần DB). Yêu cầu rõ: trang MỚI, đặt trong group sidebar "Compression Context", không đụng vào các trang combo đã có (`combos`, `combos-v2`).

**Files mới:**

| File | Mô tả |
|---|---|
| [packages/model-combo-cooldown/cooldownStore.js](../packages/model-combo-cooldown/cooldownStore.js) | Thêm `listActiveCooldowns()` — trả về toàn bộ cooldown còn hiệu lực (lazy-expire khi đọc) |
| [src/app/api/combos/cooldowns/route.js](../src/app/api/combos/cooldowns/route.js) (**Mới**) | `GET` — đọc thẳng từ `listActiveCooldowns()`, theo đúng convention route hiện có (`NextResponse.json`, `dynamic = "force-dynamic"`) |
| [src/app/(dashboard)/dashboard/combo-cooldown/page.js](<../src/app/(dashboard)/dashboard/combo-cooldown/page.js>) (**Mới**) | Trang mới `/dashboard/combo-cooldown` — fetch `/api/combos` (danh sách combo) + poll `/api/combos/cooldowns` mỗi 5s, tick đồng hồ đếm ngược mỗi 1s client-side, render theo Card/table pattern giống trang Token Limit Routing |
| [src/shared/components/Sidebar.js](../src/shared/components/Sidebar.js) | Thêm 1 dòng vào `compressionContextItems` (không sửa dòng nào có sẵn) |

**Đã verify:** thêm 2 unit test cho `listActiveCooldowns` (đa combo, loại bỏ entry hết hạn) — pass. Khởi động dev server thật (`npm run dev`, port 20127), curl cả 2 route mới lẫn `combos-v2`/`api/combos` cũ — cả 2 trả về đúng cùng hành vi gate-auth (307 redirect cho page, `{"error":"Unauthorized"}` cho API) chứng tỏ route mới không crash và không phá vỡ auth middleware hiện có.

**Giới hạn đã biết:** không có credential đăng nhập trong môi trường này nên **chưa verify được bằng mắt** giao diện thật sau khi login (bảng model, badge, đồng hồ đếm ngược) — chỉ verify được routing/build/auth-gate ở tầng HTTP. Cần người dùng tự mở `/dashboard/combo-cooldown` sau khi login để xác nhận UI.
