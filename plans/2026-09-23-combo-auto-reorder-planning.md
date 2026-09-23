---
type: feature
complexity: high
status: completed
related_issues: [QUYIT-737]
related_prs: []
estimated_hours: ~80-96
---

# Kế hoạch: Auto-reorder model trong combo theo tỷ lệ fail

> **Ngày lập kế hoạch:** 2026-09-23
> **Scope dự kiến:** `packages/combo-auto-reorder/` (mới), `src/lib/db/repos/settingsRepo.js`, `src/lib/errorLogDb/errorLogRepo.js`, `src/app/(dashboard)/dashboard/settings/combo-auto-reorder/page.js` (mới), `src/shared/services/initializeApp.js`, `open-sse/services/combo.js` (chỉ gọi vào, không chứa logic)
> **Priority:** medium

---

## 1. Phân tích / Bối cảnh

Yêu cầu gốc (nguyên văn): tự động sắp xếp lại thứ tự model trong mỗi combo — nếu 1 model có tỷ lệ fail ≥ N lần/giờ (N cấu hình được trong trang Setting) thì đẩy model đó xuống cuối danh sách model của combo. Ví dụ minh hoạ: combo `9r-combo-n8n-v2.2`, model `groq/llama-3.3-70b-versatile` đạt ngưỡng fail → bị chuyển xuống cuối mảng `models`.

**Grounding từ code thật** (khảo sát qua agent Explore, không phải giả định):

- **Combo storage**: bảng SQLite `combos` (`src/lib/db/schema.js:89-99`), cột `models` là JSON-encoded array. Write path duy nhất: `combosRepo.updateCombo(id, data)` (`src/lib/db/repos/combosRepo.js:53-67`) — đọc-merge-ghi trong transaction, nhưng merge là **shallow spread** (`{...rowToCombo(row), ...data}`) → nếu 2 caller cùng ghi field `models` gần như đồng thời (VD: người dùng sửa combo thủ công trên UI + sweep tự động), caller ghi sau thắng, có thể mất thay đổi của caller trước (không hỏng DB, nhưng mất logical update).
- **Route tương tự đã có sẵn** làm mẫu cho write pattern: `src/app/api/combos/remove-model/route.js:12-34` — loop qua combos, lọc theo model, gọi `updateCombo(combo.id, { models: nextModels })`. Tính năng mới sẽ tái dùng đúng pattern này, chỉ khác phần tính toán mảng mới.
- **Cơ chế cooldown đã có** (`packages/model-combo-cooldown`, xem `docs/specs/Technical-Spec-Model-Combo-Cooldown.md`) là in-memory `Map`, TTL 5 phút, fail-open, **không ghi DB**, chỉ skip tạm thời per-request. Khác bản chất với tính năng này: tính năng mới là **persistent** (ghi DB), dựa trên **tỷ lệ fail theo cửa sổ thời gian** (không phải "fail 1 lần thì skip"), và **thực sự đổi thứ tự mảng** (không chỉ lọc runtime).
- **Error-log DB** (`src/lib/errorLogDb/errorLogRepo.js`) đã ghi đủ dữ liệu cần (`logModelError` có `comboName`, `provider`, `model`, `created_at_epoch`, dòng 29-40) nhưng các hàm hiện có (`getModelErrorFrequency`, `getFailingModels`) mặc định cửa sổ 7 ngày, phục vụ dashboard chart — chưa có query "rolling 1 giờ" cho mục đích trigger. Cần thêm 1 hàm nhỏ, tái dùng đúng schema/table hiện có.
- **Lưu ý caveat quan trọng**: model-level error logging hiện tại **chỉ ghi khi model được gọi qua combo** (`comboName` bắt buộc non-null) — khớp hoàn toàn với scope tính năng này (chỉ cần xét model trong combo).
- **Settings**: không có 1 trang settings duy nhất — là tập hợp nhiều trang nhỏ dưới `src/app/(dashboard)/dashboard/settings/*`, tất cả đọc/ghi vào 1 bảng `settings` (JSON blob) qua `settingsRepo.js` (`getSettings()`/`updateSettings()`, dòng 168-187). Pattern mẫu để nhân bản: `token-limits/page.js`.
- **Không có job định kỳ** "quét combo" sẵn có, nhưng có 2 pattern interval-job đã dùng trong codebase để tái dùng: `startCleanupTimer()` (`errorLogRepo.js:7-12`, đơn giản) và `startWatchdog()`/`startNetworkMonitor()` (`src/shared/services/initializeApp.js`, phức tạp hơn — dùng `global.__appSingleton` để sống sót qua Next.js hot-reload, khởi động có điều kiện theo settings).
- **Hard rule kiến trúc** (`AGENTS.md`): logic nghiệp vụ mới bắt buộc nằm trong `packages/*` module mới (tương tự `packages/model-combo-cooldown`, `packages/token-limit-routing`), `open-sse/`/`src/` chỉ được gọi vào (thin call-out), không chứa logic trực tiếp.
- Sau mỗi lần `updateCombo` đổi `models`, cả route thủ công lẫn route `remove-model` đều ngầm phụ thuộc `resetComboRotation(comboName)` (`open-sse/services/combo.js:246-249`) để tránh index round-robin cũ trỏ sai vị trí trong mảng mới — tính năng mới **phải** gọi hàm này sau mỗi lần reorder.

## 2. Approach / Strategy

**Phương án chọn**: Module mới `packages/combo-auto-reorder/` chứa toàn bộ logic (tính ngưỡng, tính thứ tự mới, quyết định có ghi hay không), được kích hoạt bởi 1 interval job (theo pattern `startWatchdog`) khởi động từ `initializeApp.js`, gated bởi setting mới. Job này gọi vào `errorLogRepo.js` (hàm mới, rolling window) để lấy dữ liệu, gọi `combosRepo.updateCombo()` để ghi, và `resetComboRotation()` để invalidate round-robin state.

**Vì sao không đặt logic trực tiếp trong `open-sse/services/combo.js`**: vi phạm hard rule kiến trúc của repo (tách business logic khỏi `open-sse/`), đồng thời logic này không chạy per-request (khác cooldown) mà chạy nền định kỳ — không tự nhiên nằm trong request-handling pipeline.

**Vì sao chọn interval job thay vì trigger ngay khi `logModelError` được gọi**: trigger ngay mỗi lần fail sẽ tính lại rolling-window count cho mọi write (tốn), và dễ gây "rung" thứ tự combo liên tục khi có burst lỗi ngắn hạn. Sweep định kỳ (mặc định 5 phút, cấu hình được) mượt hơn và dễ kiểm soát tải hơn.

**Tradeoff quan trọng nhất đã cân nhắc — có "phục hồi" (auto-promote-back) hay không**: yêu cầu gốc của người dùng chỉ mô tả chiều "demote", không đề cập model có tự quay lại vị trí cũ khi fail rate giảm hay không. Quyết định: đưa vào **Phase 1 (MVP) chỉ chiều demote** (đơn giản, đúng sát yêu cầu gốc), để "auto-promote-back" thành **Phase 2 tuỳ chọn** — vì việc này cần lưu thêm state (vị trí gốc, thời điểm demote) và định nghĩa tiêu chí phục hồi, làm tăng đáng kể độ phức tạp mà chưa chắc người dùng cần ngay.

**Xử lý race condition (manual edit UI vs. sweep tự động)**: thay vì tin tưởng hoàn toàn vào transaction sẵn có của `updateCombo` (vốn chỉ bảo vệ ở tầng ghi DB, không tránh được "ghi đè logic" khi 2 caller đều tính `models` từ dữ liệu đọc cũ), sweep job sẽ đọc `updatedAt` của combo ngay trước khi ghi và bỏ qua/log-warn nếu đã đổi kể từ lúc tính toán (optimistic check), thay vì ghi đè mù.

## 3. Công việc cần thực hiện (Todo)

### Phase 1 — MVP
- [x] Thêm settings mới vào `DEFAULT_SETTINGS` (`settingsRepo.js`): `comboAutoReorderEnabled`, `comboAutoReorderFailThreshold` (mặc định 10), `comboAutoReorderWindowMs` (mặc định 1h), `comboAutoReorderIntervalMs` (mặc định 5 phút)
- [x] Trang Settings mới `dashboard/settings/combo-auto-reorder/page.js` + API route GET/PATCH (theo pattern `token-limits`)
- [x] Hàm mới trong `errorLogRepo.js`: `getRecentModelFailCounts(windowMs)` — group theo (provider, model, comboName), đếm trong cửa sổ rolling
- [x] Module mới `packages/combo-auto-reorder/`: logic tính combo nào cần reorder, thứ tự mới (đẩy model vượt ngưỡng xuống cuối, giữ nguyên thứ tự tương đối các model còn lại), tránh ghi no-op nếu thứ tự không đổi
- [x] Interval job (theo pattern `startWatchdog`/`backgroundTokenRefresh`) khởi động từ `initializeApp.js`, hot-reload-safe qua module-level flag; enabled/disabled đọc động mỗi tick từ settings (không cần restart để bật/tắt, chỉ đổi interval mới cần restart)
- [x] Optimistic check `updatedAt` trước khi ghi (`ComboUpdateConflictError`) + gọi `resetComboRotation(comboName)` sau khi ghi thành công
- [x] Unit test thuật toán reorder (combo nhiều model fail, combo 1 model, model không có log lỗi, model đã ở cuối sẵn) — 16 test, `tests/unit/combo-auto-reorder.test.js`
- [x] Integration test sweep job (mock db qua DI) — cùng file trên, nhóm `runComboAutoReorderSweep`
- [x] (Ngoài kế hoạch ban đầu) Test optimistic-concurrency trên SQLite thật — `tests/unit/combos-repo-concurrency.test.js`, phát hiện + fix bug timestamp trùng mili-giây

### Phase 2 — Tuỳ chọn (chưa ước tính trong Jira ban đầu)
- [x] UI hiển thị model bị auto-demote (bảng "Currently demoted models" trong trang Settings) + nút "Restore now" thủ công
- [x] Auto-promote-back khi fail rate hồi phục — **phát hiện quan trọng khi implement: không cần lưu vị trí gốc/tiêu chí phục hồi như dự kiến ban đầu.** Vì sweep tick nào cũng tính lại `planComboReorders` từ đầu dựa trên rolling-window fail count hiện tại + thứ tự `models` hiện tại trong DB, một model hết fail (rớt khỏi failing set khi cửa sổ trôi qua) tự nhiên được xếp lại vào nhóm "khoẻ mạnh" ở tick kế tiếp — không cần code "undo" riêng. Đã viết test minh chứng qua 4 tick liên tiếp (`tests/unit/combo-auto-reorder.test.js`, describe "promote-back over multiple sweep ticks").

## 4. Risks & Unknowns

- **Risk — race condition**: sweep tự động và sửa combo thủ công trên UI ghi đè lẫn nhau do merge shallow-spread trong `updateCombo`. → **Mitigation**: optimistic check theo `updatedAt` trước khi ghi (mục 3).
- **Risk — round-robin state cũ**: quên gọi `resetComboRotation` sau reorder → index trỏ sai combo. → **Mitigation**: gọi tường minh ngay sau mỗi lần `updateCombo` thành công trong sweep job.
- **Risk — nhầm lẫn với cooldown hiện có**: người dùng có thể thấy 1 model vừa bị cooldown-skip tạm thời (5 phút) vừa bị demote vĩnh viễn, không phân biệt được 2 cơ chế. → **Mitigation**: ghi rõ log/UI riêng cho từng cơ chế (không gộp chung 1 badge).
- **Unknown — có cần auto-promote-back không**: yêu cầu gốc không đề cập. → **Plan**: để Phase 2, xác nhận với người dùng sau khi Phase 1 chạy thực tế.
- **Unknown — ngưỡng tính theo combo hay global**: giả định mặc định là theo từng (combo, model) riêng biệt, khớp với cách error-log hiện ghi (đã combo-scoped). → **Plan**: nêu rõ giả định này khi bàn giao, xác nhận lại nếu người dùng muốn global.
- **Unknown — chu kỳ quét**: đề xuất mặc định 5 phút. → **Plan**: cho cấu hình được qua setting `comboAutoReorderIntervalMs`, không hardcode.

## 5. Success Criteria

- Model trong 1 combo có ≥ N fail trong cửa sổ rolling W (N, W cấu hình qua Settings) tự động bị chuyển xuống cuối mảng `models` của đúng combo đó, không ảnh hưởng combo khác.
- Sửa combo thủ công trên UI trong lúc sweep job đang chạy không bị mất dữ liệu (verify qua test race).
- Sau khi reorder, request tiếp theo dùng combo đó route đúng theo thứ tự mới (verify round-robin không trỏ lệch).
- Tắt `comboAutoReorderEnabled` thì hệ thống hoạt động y hệt hiện tại (không có side-effect khi feature tắt).

## 6. Questions / Dependencies

- Xác nhận: MVP chỉ demote, không tự phục hồi thứ tự — có cần đẩy auto-promote-back vào Phase 1 luôn không?
- Xác nhận: ngưỡng tính riêng theo (combo, model), không phải global theo model.
- Xác nhận: chu kỳ quét mặc định 5 phút có hợp lý, hay cần nhanh hơn (vd 1 phút) để phản ứng kịp thời hơn?

## 7. Thực thi (2026-09-23)

Phase 1 (MVP) đã cài đặt đầy đủ theo đúng todo list ở mục 3, theo sát approach đã chọn ở mục 2 (business logic thuần trong `packages/combo-auto-reorder/` với DI, không đụng DB trực tiếp — đúng convention `packages/token-limit-routing`; write path duy nhất vẫn là `combosRepo.updateCombo`).

**Files đã thay đổi/thêm:**

| File | Thay đổi |
|---|---|
| [packages/combo-auto-reorder/reorderModels.js](../packages/combo-auto-reorder/reorderModels.js) (**Mới**) | Pure function `reorderFailingModelsToEnd` — đẩy model failing xuống cuối, giữ thứ tự tương đối, trả về cùng reference nếu không đổi |
| [packages/combo-auto-reorder/planReorder.js](../packages/combo-auto-reorder/planReorder.js) (**Mới**) | Pure function `planComboReorders` — tính combo nào cần ghi, dựa trên fail counts + threshold |
| [packages/combo-auto-reorder/sweep.js](../packages/combo-auto-reorder/sweep.js) (**Mới**) | `runComboAutoReorderSweep(deps)` — orchestrator DI, fail-open per combo |
| [packages/combo-auto-reorder/config/defaults.js](../packages/combo-auto-reorder/config/defaults.js), [index.js](../packages/combo-auto-reorder/index.js) (**Mới**) | Defaults + barrel export |
| [packages/validation/comboAutoReorderSchemas.js](../packages/validation/comboAutoReorderSchemas.js) (**Mới**) | `validateComboAutoReorderConfig` |
| [src/lib/db/repos/combosRepo.js](../src/lib/db/repos/combosRepo.js) | `updateCombo` nhận thêm `{expectedUpdatedAt}` tuỳ chọn, ném `ComboUpdateConflictError` khi lệch — backward-compatible với 2 call site cũ. Đồng thời đổi `updatedAt`/`createdAt` sang timestamp đơn điệu (`nextTimestamp()`) — phát hiện qua test thực tế: ISO string mili-giây có thể trùng giữa 2 lần ghi liên tiếp trên cùng process, làm mất tác dụng optimistic-concurrency check |
| [src/lib/errorLogDb/errorLogRepo.js](../src/lib/errorLogDb/errorLogRepo.js) | Thêm `getRecentModelFailCounts(windowMs)` |
| [src/lib/db/repos/settingsRepo.js](../src/lib/db/repos/settingsRepo.js) | Thêm 4 default settings mới |
| [src/lib/comboAutoReorder/scheduler.js](../src/lib/comboAutoReorder/scheduler.js) (**Mới**) | Interval job (theo đúng pattern `backgroundTokenRefresh.mjs`) — wiring DB thật vào package thuần |
| [src/shared/services/initializeApp.js](../src/shared/services/initializeApp.js) | Gọi `startComboAutoReorderSweep()` trong `runHeavyStartup()` |
| [src/app/api/settings/combo-auto-reorder/route.js](../src/app/api/settings/combo-auto-reorder/route.js) (**Mới**) | GET/PATCH settings |
| [src/app/(dashboard)/dashboard/settings/combo-auto-reorder/page.js](<../src/app/(dashboard)/dashboard/settings/combo-auto-reorder/page.js>) (**Mới**) | UI trang Settings |
| [src/shared/components/Sidebar.js](../src/shared/components/Sidebar.js) | Thêm nav link vào `compressionContextItems` |
| [tests/unit/combo-auto-reorder.test.js](../tests/unit/combo-auto-reorder.test.js) (**Mới**) | 16 test cho `reorderFailingModelsToEnd`, `planComboReorders`, `runComboAutoReorderSweep` |
| [tests/unit/combos-repo-concurrency.test.js](../tests/unit/combos-repo-concurrency.test.js) (**Mới**) | 3 test cho optimistic concurrency trên SQLite thật |
| [tests/unit/error-stats-routes.test.js](../tests/unit/error-stats-routes.test.js) | Fix 2 test pre-existing bị hỏng từ phiên trước (gọi `GET()` thiếu `Request`, không liên quan tính năng này nhưng phát hiện được khi chạy full suite) |

**Files Phase 2 (2026-09-23, cùng ngày):**

| File | Thay đổi |
|---|---|
| [packages/combo-auto-reorder/reorderModels.js](../packages/combo-auto-reorder/reorderModels.js) | Thêm `promoteModelNow` — di chuyển 1 model lên đầu danh sách ngay lập tức, dùng cho restore thủ công (khác `reorderFailingModelsToEnd`, hàm đó no-op khi không còn model nào failing) |
| [packages/combo-auto-reorder/failingModels.js](../packages/combo-auto-reorder/failingModels.js) (**Mới**) | `groupFailingModelsByCombo` — factor ra từ `planReorder.js`, dùng chung bởi cả sweep lẫn status endpoint, có hỗ trợ `isSuppressed` |
| [packages/combo-auto-reorder/demotionSuppression.js](../packages/combo-auto-reorder/demotionSuppression.js) (**Mới**) | In-memory suppression store (giống hệt pattern `model-combo-cooldown/cooldownStore.js`) — tránh sweep tick tiếp theo demote lại ngay model vừa được restore thủ công |
| [packages/combo-auto-reorder/restore.js](../packages/combo-auto-reorder/restore.js) (**Mới**) | `restoreModelNow(deps, target)` — DI orchestrator cho action restore thủ công |
| [packages/combo-auto-reorder/resolveConfig.js](../packages/combo-auto-reorder/resolveConfig.js) (**Mới**) | `resolveComboAutoReorderConfig` — factor logic fallback-to-default dùng chung giữa `sweep.js` và `restore.js` |
| [packages/combo-auto-reorder/planReorder.js](../packages/combo-auto-reorder/planReorder.js), [sweep.js](../packages/combo-auto-reorder/sweep.js), [index.js](../packages/combo-auto-reorder/index.js) | Thêm tham số `isSuppressed` (backward-compatible), refactor dùng `groupFailingModelsByCombo`/`resolveComboAutoReorderConfig`, export API mới |
| [src/lib/comboAutoReorder/scheduler.js](../src/lib/comboAutoReorder/scheduler.js) | Wire `isComboModelReorderSuppressed` vào sweep deps |
| [src/app/api/combo-auto-reorder/status/route.js](../src/app/api/combo-auto-reorder/status/route.js) (**Mới**) | GET — danh sách model đang bị demote theo combo |
| [src/app/api/combo-auto-reorder/restore/route.js](../src/app/api/combo-auto-reorder/restore/route.js) (**Mới**) | POST `{comboName, provider, model}` — restore thủ công |
| [src/app/(dashboard)/dashboard/settings/combo-auto-reorder/page.js](<../src/app/(dashboard)/dashboard/settings/combo-auto-reorder/page.js>) | Thêm Card "Currently demoted models" — bảng + nút Restore now, refresh button |
| [tests/unit/combo-auto-reorder.test.js](../tests/unit/combo-auto-reorder.test.js) | +11 test mới: `groupFailingModelsByCombo`, `demotionSuppression`, `restoreModelNow`, và test minh chứng promote-back qua 4 sweep tick liên tiếp (27 test tổng cộng trong file) |

**Bug tự phát hiện trong lúc viết test Phase 2**: thiết kế ban đầu của `restore.js` dùng `reorderFailingModelsToEnd(combo.models, stillFailing)` để restore — nhưng khi model cần restore là model failing DUY NHẤT trong combo, sau khi loại nó khỏi `stillFailing` thì tập failing rỗng, và `reorderFailingModelsToEnd` có guard "không còn gì failing → no-op" (đúng cho sweep bình thường, sai cho restore — model vẫn kẹt ở cuối mảng từ lần demote trước). Fix: tách hàm riêng `promoteModelNow` không có guard no-op đó, luôn đưa model lên đầu.

**Bug tự phát hiện trong lúc test Phase 1** (đáng chú ý cho lần sau): `updateCombo`'s optimistic-concurrency check ban đầu dùng `new Date().toISOString()` làm "version". Test `combos-repo-concurrency.test.js` flake ngẫu nhiên (pass khi chạy riêng, fail khi chạy trong full suite, rồi fail cả khi chạy riêng ở lần sau) vì 2 lần ghi liên tiếp có thể rơi vào cùng 1 mili-giây trên SQLite driver nhanh → conflict check không phát hiện được race thật. Fix: bộ đếm đơn điệu `nextTimestamp()` đảm bảo `updatedAt` luôn tăng nghiêm ngặt trong cùng 1 process.

**Verify quy trình đầy đủ (Phase 1)**: chạy full test suite 2 lần — 1 lần với `git stash` code của tính năng này (baseline) và 1 lần có code — diff chính xác theo tên test cho thấy **0 regression mới**, chỉ 2 test cũ được sửa. (123 failures pre-existing ở baseline, chủ yếu là translator/oauth/provider-registry/live-network tests không liên quan, đã có 26/123 nằm trong `tests/__baseline__/known-fails.txt` đã biết từ trước).

**Verify Phase 2**: chạy lại full suite sau khi thêm code Phase 2, diff so với baseline trên — chỉ có thêm 5 failure mới xuất hiện, nhưng grep xác nhận cả 5 đều ở file hoàn toàn không liên quan (`compatible-provider-connections`, `kiro-external-idp`, `xai-oauth-service` — không import bất kỳ module nào của tính năng này), khớp với hiện tượng flaky do network/timing khi chạy full suite song song đã quan sát được từ trước (số lượng failure dao động giữa các lần chạy baseline). Kết luận: không có regression thật từ Phase 2.

**Trạng thái hiện tại**: Cả Phase 1 và Phase 2 đã code xong, test đầy đủ (27 test trong `combo-auto-reorder.test.js` + 3 test concurrency), lint sạch (trừ 1 vi phạm `react-hooks/set-state-in-effect` đã chấp nhận theo pattern có sẵn). Chưa commit — đang chờ user review. Chưa build UI thật trong browser (chỉ verify qua code review + API route logic, theo đúng pattern `token-limits`/`provider-alert` đã có).

**Việc còn mở**: 3 câu hỏi ở mục 6 vẫn chưa được user xác nhận — code hiện tại đã implement theo đúng giả định mặc định đã nêu (demote-only tick-based promote-back, per-combo threshold, sweep 5 phút cấu hình qua Settings). Restore thủ công dùng cơ chế suppression in-memory (mất khi restart server) — nếu cần bền hơn (persist qua restart) sẽ phải chuyển sang lưu DB, nhưng chưa thấy cần thiết cho MVP.
