---
type: bug-fix
complexity: high
impact: high
related_issues: [QUYIT-735]
related_prs: []
time_spent_hours: ~8
status: in_progress
---

# Kế hoạch: Sửa combo `9r-combo-opencode` fail hàng loạt + 3 bug CMEM injection

> **Ngày:** 2026-09-21 → 2026-09-22
> **Phạm vi:** `open-sse/services/accountFallback.js`, `open-sse/config/errorConfig.js`, `open-sse/services/combo.js`, `packages/cmem/core/memoryStore.js`
> **Trạng thái:** 🚧 Code + test xong, **chưa deploy lên server thật** — 1 việc còn mở cần user thao tác (xem mục 5)

---

## 1. Bối cảnh

User cung cấp log thật từ combo `9r-combo-opencode` (6 model, round-robin, sticky 10), tự phân tích thành 7 nhóm vấn đề. Trước khi sửa, đọc code thật (`combo.js`, `accountFallback.js`, `errorConfig.js`, `memoryStore.js`, 2 `AGENTS.md` liên quan, 2 plan cũ: `2026-09-05-model-combo-cooldown-planning.md`, `2026-09-18-kira-provider-fixes.md`) để xác nhận/bác bỏ từng giả thuyết bằng file:line cụ thể thay vì paraphrase log.

**Root cause thật của `deepseek-v4-flash-free` fail liên tục không dừng** (phát hiện quan trọng nhất, đổi hẳn hướng fix so với đề xuất ban đầu của user): `checkFallbackError` (`open-sse/services/accountFallback.js:23-64`, dùng chung bởi combo lẫn account fallback qua `ERROR_RULES` ở `open-sse/config/errorConfig.js:59-76`) không có rule nào khớp status 400 hay text "model is unavailable" — rơi vào nhánh mặc định: **mọi status 4xx trừ 401/402/403/429 bị coi là "lỗi do request" → `shouldFallback: false, cooldownMs: 0`** (quyết định có chủ đích, tránh khóa nhầm account khỏe chỉ vì request tự nó sai — context overflow, param không hỗ trợ...). OpenCode Zen lại dùng **400** để báo "Model is unavailable" — lỗi thật sự *phía model*, không phải *phía request* — bị phân loại nhầm. Hệ quả ở `combo.js:403-406`: combo return ngay, không thử model tiếp, và **không gọi `markComboModelFailed`** → cooldown không bao giờ được set → mỗi request mới chạm đúng model này là dừng hẳn, lặp vô hạn.

Ngược lại `nemotron-3-super-free` (401 "not supported") khớp đúng rule có sẵn `{status: 401, cooldownMs: COOLDOWN.long}` → cooldown 5 phút (`modelCooldown.ttlMs`, từ plan 2026-09-05) đã hoạt động đúng thiết kế từ trước — không phải bug.

**Các phát hiện khác** (chi tiết đầy đủ + cách verify từng cái xem trong Git history của file này nếu cần, tóm tắt kết quả cuối ở mục 2):
- 2 model đã bị đánh dấu chết từ trước ở tầng registry/suggested-models (`providerModels.js`, `suggested-models/filters.js`) nhưng gap là **không có gì lọc chúng khỏi việc thực thi** 1 combo đã lưu sẵn — không cần thêm blacklist mới, cần dùng đúng cơ chế fallback/cooldown sẵn có.
- "Log desync" (dòng "Trying model X" / dòng lỗi ghi model Y): đọc kỹ vòng lặp `combo.js`, biến `modelStr` là `const` per-iteration, không có bug state/closure thật. `log.info`/`log.warn` trong `combo.js` không mang request-id nào — giả thuyết nhiều khả năng đúng hơn: log của nhiều request đồng thời bị xen kẽ trên console.
- `Cannot access 'a6' before initialization` (`big-pickle`): xác nhận đây là model free hợp lệ (không phải model chết), lỗi TDZ thật trong code xử lý response — tên biến đã bị minify nên không trace tiếp được chỉ từ source tĩnh, cần stack trace thật.
- CMEM `fts5: syntax error near ","`: root cause rõ ràng — `memoryStore.js`'s `search()` chỉ strip `'`/`"` khỏi query trước khi bind vào FTS5 `MATCH`, không strip các ký tự có ý nghĩa cú pháp FTS5 khác (dấu phẩy, hai chấm, ngoặc, dấu trừ, dấu sao...).
- CMEM `no such column: conversation`: **không tái hiện được từ source** — grep toàn bộ `packages/cmem/`, `src/lib/db/` + `git log -p` toàn lịch sử `memoryStore.js`, cột này chưa từng tồn tại trong bất kỳ version nào của schema. Giả thuyết: schema drift giữa code và 1 DB file cụ thể trên máy user.
- Kiro `401 Bad credentials`, Cline/ClinePass `invalid_grant`: lỗi refresh-token hết hạn/bị revoke ở tầng account — cần user tự re-login/re-authorize, không phải bug code.

## 2. Công việc đã thực hiện

### 2.1. Fix classification lỗi 400 "model unavailable" (`open-sse/config/errorConfig.js`)

Thêm 1 rule text-based vào `ERROR_RULES`: `{ text: "model is unavailable", cooldownMs: COOLDOWN.long }`. Chỉ dùng đúng chuỗi này (không dùng thêm `"is not supported"` như dự tính ban đầu) vì `"is not supported"` trùng với 1 check nội bộ khác của executor `github.js:157` (`"The requested model is not supported"`, dùng để quyết định chuyển sang `/responses` endpoint) — scope hẹp lại để tránh match nhầm case đó. `nemotron-3-super-free` không cần sửa gì, 401 đã khớp rule sẵn có.

Sửa ở `ERROR_RULES` thay vì thêm field mới trong `combo.js` vì đúng kiến trúc sẵn có — đây là nơi duy nhất định nghĩa "lỗi nào coi là gì", dùng chung bởi cả combo lẫn account fallback (`open-sse/services/AGENTS.md`), không đụng vòng lặp `combo.js` đã test kỹ ở plan cooldown trước.

**Rủi ro đã cân nhắc:** rule match theo substring toàn cục có thể trùng lỗi của provider khác — đã grep review toàn repo, không thấy văn bản lỗi tương tự nơi khác đang dựa vào hành vi `shouldFallback: false` cũ. Đánh đổi khác: model giờ sẽ luôn cooldown 5 phút ngay lần lỗi đầu tiên — hợp lý cho model chết dài hạn (deepseek đã chết từ 2026-09-02, ~19 ngày tính tới lúc sửa) nhưng cần cân nhắc lại nếu áp dụng cho lỗi thoáng qua.

Test mới: `tests/unit/account-fallback-4xx.test.js` — case "falls back and cools down a 400 that actually reports a dead model".

### 2.2. Request-correlation-id cho log combo (`open-sse/services/combo.js`)

Thêm `reqId` (random 6 ký tự, sinh 1 lần mỗi `handleComboChat` call) prefix `[reqId]` vào toàn bộ `log.info`/`log.warn` trong try-loop. Đọc `src/sse/utils/logger.js` xác nhận `log.info(tag, message, data)` không mang request-context nào — khác cơ chế `tagForSession`/`log.line(reqTag, ...)` đã có sẵn ở tầng thấp hơn (`chatCore.js:77`, cho log per-single-model-attempt) nhưng chưa từng được thread lên `combo.js`. Không tái dùng `reqTag` đó được vì nó tính lại theo `scope: provider` mỗi lần gọi 1 model (đổi theo từng model trong combo), trong khi log cấp combo cần 1 tag ổn định suốt cả request — nên sinh `reqId` riêng, đơn giản, không đổi signature/callers.

### 2.3. Fix CMEM FTS5 comma bug (`packages/cmem/core/memoryStore.js`)

Thay vì liệt kê từng ký tự đặc biệt cần strip (danh sách metachar FTS5 dài, dễ sót), bọc toàn bộ query đã sanitize thành 1 **FTS5 phrase literal có quote** trước khi bind vào `MATCH ?` (escape `"` bên trong thành `""`). Bên trong phrase literal, FTS5 không còn parse ký tự nào là operator nữa — fix triệt để, không đổi hành vi search (vẫn match nguyên văn, chỉ khác là ký tự đặc biệt giờ literal thay vì operator).

Viết test bằng **SQLite thật** (`better-sqlite3 :memory:`) thay vì mock tay có sẵn trong `cmem.test.js` — mock không parse SQL nên không bắt được lỗi FTS5 thật. Phải `npm rebuild better-sqlite3` 1 lần trước đó (native binary trên máy dev build lệch Node ABI — vấn đề môi trường, không liên quan bug).

### 2.4. Phát hiện phụ: CMEM search luôn trả 0 kết quả — fix bằng trigger SQL

Khi viết test FTS5 thật, lộ ra bug độc lập: `MemoryStore.search()` với query không rỗng **luôn** trả `{observations: [], total: 0}`, im lặng, không throw. Nguyên nhân: `cmem_observations_fts` là external-content FTS5 table (`content='cmem_observations'`) — loại bảng này **không tự động đồng bộ dữ liệu**, và toàn bộ `memoryStore.js` (`saveObservation`/`deleteObservation`/`clearAllObservations`/`init()`) không có trigger hay INSERT/DELETE thủ công nào nhắm vào nó. Bug có từ ngày đầu tính năng CMEM được thêm (commit `899e36e5`). Mock test tự viết tay không parse SQL nên chưa từng bắt được.

Đề xuất 3 hướng, user chọn **Hướng A — trigger SQL** (2 hướng còn lại: bỏ external-content để FTS5 tự chứa content — trùng lặp dữ liệu, phải drop+recreate virtual table; hoặc bỏ FTS5 dùng `LIKE` thuần — an toàn nhất nhưng mất ranking relevance):

- Thêm 2 trigger vào `init()`: `cmem_observations_ai` (AFTER INSERT) ghi row mới vào `cmem_observations_fts`; `cmem_observations_ad` (AFTER DELETE) dùng cú pháp xóa đặc biệt của external-content FTS5 (`INSERT INTO fts(fts, rowid, ...) VALUES('delete', ...)`). Chỉ 2 trigger, không phải 3 — `saveObservation` chỉ dùng `INSERT OR REPLACE` (không có `UPDATE` thuần trong toàn file), và SQLite thực thi `INSERT OR REPLACE` khi trùng key bằng cách xóa-rồi-insert nội bộ, nên không cần `AFTER UPDATE`.
- **Backfill dữ liệu cũ (self-heal):** ban đầu định so sánh `COUNT(*)` giữa 2 bảng để quyết định có cần rebuild không — **sai**, verify trực tiếp bằng `better-sqlite3` phát hiện `COUNT(*)` trên external-content FTS5 table chỉ phản ánh số dòng ở content table, không phản ánh index thật đã build hay chưa — 2 count luôn bằng nhau bất kể index rỗng hay không, cách này không detect được gì. Đổi sang cách đúng: query `sqlite_master` xem trigger `cmem_observations_ai` đã tồn tại **trước khi** tạo nó — nếu chưa (lần đầu chạy fix này trên 1 DB file) → chạy `INSERT INTO cmem_observations_fts(cmem_observations_fts) VALUES('rebuild')` đúng 1 lần. Các lần `init()` sau (trigger đã tồn tại) bỏ qua bước này, không tốn cost mỗi request.

Test mới: insert→tìm được (trigger INSERT), xóa→hết tìm thấy (trigger DELETE), `INSERT OR REPLACE` cùng id→chỉ match nội dung mới, và 1 test mô phỏng "dữ liệu cũ trước khi có fix" (tạo bảng thủ công + insert thẳng, không qua trigger, rồi mới gọi `init()` lần đầu) xác nhận self-heal đúng.

Không động tới `src/lib/db/repos/cmemRepo.js`'s `initCmemTables()` — bản DDL trùng lặp, xác nhận là dead code (không nơi nào gọi tới, per `packages/cmem/AGENTS.md`), không sửa code chết không cần thiết.

### 2.5. Code-first schema self-heal — thay thế chẩn đoán thủ công `no such column: conversation`

Thay vì chờ `PRAGMA table_info` thủ công trên container (không tự làm được từ môi trường code), user yêu cầu làm `init()` tự khớp schema theo code — đúng tinh thần code-first, cùng pattern đã dùng cho self-heal FTS index ở mục 2.4.

- Thêm `TABLE_COLUMNS` — danh sách cột (tên + type) cho 3 bảng `cmem_observations`/`cmem_sessions`/`cmem_context_cache`, soi theo đúng `CREATE TABLE` hiện có.
- Thêm `ensureColumns(db, table, columns)`: đọc `PRAGMA table_info(<table>)`, so với danh sách trên, `ALTER TABLE ... ADD COLUMN ...` cho cột thiếu. Mỗi cột bọc try/catch riêng (fail-open) — 1 cột lỗi không chặn cột khác hay chặn `init()`. Gọi ngay sau mỗi `CREATE TABLE IF NOT EXISTS`.
- **Cố ý loại trừ:** primary key (`id`) — không thể "thêm" PK cho bảng đã tồn tại an toàn; và cột `NOT NULL` không có default gốc (`content`, `created_at_epoch`, `started_at_epoch`) — `ALTER TABLE ADD COLUMN NOT NULL` không có default hợp lệ sẽ lỗi trên bảng đã có data, đây là giới hạn thật của SQLite.

**Giới hạn cần hiểu rõ:** cơ chế này chỉ heal cột **code hiện tại có định nghĩa**. Cột `conversation` từ lỗi gốc chưa từng tồn tại trong code (đã xác nhận qua grep + `git log`) — nên `ensureColumns()` sẽ không tự tạo ra nó. Cái nó giải quyết là lớp bug tổng quát hơn (DB thật thiếu cột so với code, do fork/version cũ). Nếu sau khi deploy mà lỗi `no such column: conversation` **vẫn còn xuất hiện**, đó là bằng chứng khá chắc nguồn gốc nằm ngoài `packages/cmem` hoàn toàn — lúc đó mới cần quay lại introspect DB thật.

Test mới: tạo bảng thiếu cột `provider` + có sẵn 1 row → `init()` → cột được thêm, row cũ còn nguyên (giá trị mới `NULL`), cột dùng được ngay cho row mới; test idempotent (`init()` gọi 2 lần không lỗi).

### 2.6. `big-pickle` TDZ crash — đóng, không sửa

Không cần trace tiếp: model `big-pickle` đã bị gỡ khỏi mọi combo (xem mục 2.7), lỗi không còn khả năng tái hiện. Nếu sau này dùng lại, cần re-test trước.

### 2.7. Provider OpenCode Zen — user tự xóa 1 phần (2026-09-22)

User xóa provider **`opencode-zen`** (`packages/providers/registry/opencode-zen.js`, alias `opencode-zen`/`opencodezen`/`zen`) và gỡ model của nó (gồm `big-pickle`) khỏi mọi combo. **Lưu ý quan trọng đã đính chính:** đây là 1 trong **2 provider riêng biệt** cùng trỏ upstream `opencode.ai/zen/...` — provider còn lại, `opencode` (alias `oc`, `open-sse/providers/registry/opencode.js`), **chưa bị xóa** và vẫn đang serve `nemotron-3-super-free`/`deepseek-v4-flash-free` (xác nhận qua log thật 09:10-09:11 ngày 2026-09-22, combo giờ còn 4 model — giảm từ 6, nhưng 2 model "chết" gốc vẫn còn). Vì vậy việc "dọn combo" **chưa xong**, xem mục 5.

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [open-sse/config/errorConfig.js](../open-sse/config/errorConfig.js) | Thêm rule `{ text: "model is unavailable", cooldownMs: COOLDOWN.long }` vào `ERROR_RULES` |
| [open-sse/services/combo.js](../open-sse/services/combo.js) | Thêm `reqId` (random 6 ký tự/request), prefix `[reqId]` vào log trong try-loop |
| [packages/cmem/core/memoryStore.js](../packages/cmem/core/memoryStore.js) | `search()`: quote-wrap FTS5 phrase literal; `init()`: 2 trigger đồng bộ FTS + self-heal backfill; `ensureColumns()` tự thêm cột thiếu (code-first) |
| [tests/unit/account-fallback-4xx.test.js](../tests/unit/account-fallback-4xx.test.js) | Test cho rule "model is unavailable" |
| [tests/unit/cmem.test.js](../tests/unit/cmem.test.js) | Describe block dùng SQLite thật (`better-sqlite3 :memory:`) cho: comma bug, trigger sync (insert/delete/replace), self-heal FTS backfill, self-heal cột thiếu |

**Không revert `errorConfig.js`/`combo.js` dù nguồn gốc bug quan sát được (OpenCode Zen) chỉ còn 1 phần:** cả 2 fix đều generic, không gắn riêng 1 provider — rule "model is unavailable" áp dụng cho bất kỳ provider nào dùng đúng wording, `[reqId]` giúp đọc log combo của mọi provider. Giữ lại có giá trị phòng ngừa, rủi ro gần như bằng 0 (đã grep review).

## 4. Trạng thái hiện tại

Chưa commit. Test suite liên quan (`cmem*`, `combo*`, `account-fallback*`, `model-combo-cooldown`) — 88 test `cmem*` pass, chỉ còn 2 fail pre-existing không liên quan ở `combo-autoswitch.test.js` (xác nhận bằng `git stash` — fail cả trước khi có thay đổi phiên này).

**Chưa deploy lên server thật** — `docker-compose.yml` dùng `image: decolua/9router:latest` (image kéo từ registry, không build từ repo local này). Container thật hoàn toàn tách biệt khỏi working directory — user gửi log mới (09:10-09:11) vẫn thấy đúng hành vi lỗi cũ (không `[reqId]`, `deepseek-v4-flash-free` vẫn "no fallback", vẫn `fts5: syntax error`), **user xác nhận trực tiếp đây là log của version cũ, chưa deploy fix**, không phải bug mới. Đã hỏi user có muốn hướng dẫn build local để test ngay không — **user chọn chưa cần deploy lúc này**.

## 5. Việc còn mở

- [ ] **Dọn combo `9r-combo-opencode`:** `nemotron-3-super-free` + `deepseek-v4-flash-free` vẫn còn trong combo (qua provider `opencode`/alias `oc`, khác provider `opencode-zen` đã xóa). `nemotron-3-super-free` vẫn cooldown đúng cách ngay cả trên code cũ (401, cơ chế có từ trước) — chỉ `deepseek-v4-flash-free` (400) là còn lặp vô hạn thật sự cho tới khi có 1 trong 2: (a) image mới được build+deploy (mang theo fix `ERROR_RULES`), hoặc (b) user tự gỡ model này khỏi combo qua UI ngay trong lúc chờ.
- [ ] Deploy image mới (nếu user muốn) — cần build từ repo local + push lên registry `decolua/9router` (hoặc sửa tạm `docker-compose.yml` để build local), rồi `docker-compose pull && up -d`.
- [ ] Nhắc user re-login/re-authorize Kiro (`401 Bad credentials`) và Cline/ClinePass (`invalid_grant`) — việc của user, không phải bug code.
- [ ] `[HEADROOM] skipped: request failed: ... timeout (http://192.168.1.67:10018/v1/compress)` — service nén token cục bộ timeout ở hầu hết request trong log mới nhất, nhưng fail-open (chỉ skip nén, không chặn request) nên không cấp bách — chưa điều tra, để mở.

## 6. Bài học rút ra

- **`COUNT(*)` trên external-content FTS5 table không phản ánh trạng thái index thật** — nó chỉ phản ánh số dòng ở content table gốc, dùng nó để detect "index có rỗng không" sẽ luôn sai (2 count trùng nhau bất kể index đã build hay chưa). Cách đúng để detect "lần đầu migrate": kiểm tra `sqlite_master` xem trigger/đối tượng migration đã tồn tại chưa.
- **Mock DB tự viết tay (`createMockDb()` trong test) không parse SQL thật** — che giấu mất 2 bug FTS5 (comma-escaping và search-luôn-rỗng) suốt từ đầu vì mock không tôn trọng ngữ nghĩa FTS5/external-content-table. Với logic phụ thuộc cú pháp SQL thật, cần test bằng driver SQLite thật (`better-sqlite3 :memory:`), không chỉ mock.
- **"Code-first tự heal schema" có giới hạn rõ ràng:** chỉ vá được cột mà code hiện tại có định nghĩa — nếu lỗi thật liên quan 1 cột chưa từng tồn tại trong bất kỳ version code nào (như `conversation` ở đây), cơ chế additive-column không giải thích/sửa được, cần introspect DB thật.
- **2 provider khác nhau có thể cùng trỏ 1 upstream endpoint** (`opencode-zen` và `opencode`/`oc` cùng gọi `opencode.ai/zen/...`) — tên gọi thông thường của user ("oc-zen") không nhất thiết ánh xạ 1-1 với tên provider thật trong registry, cần verify qua log/registry trước khi kết luận "đã xóa hết".

## 7. Jira

Issue theo dõi tạo qua `/jira-nqdev-insight-create-issue`:

| Field | Giá trị |
|---|---|
| Key | [QUYIT-735](https://nhquydev.atlassian.net/browse/QUYIT-735) |
| Summary | 9router: Fix combo fallback classification bug (model 4xx unavailable loop) + CMEM FTS5 injection error |
| Epic | QUYIT-563 |
| Labels | NQDEV |
| Sprint | QUYIT Sprint 34 (active) |
| Fix version | Tháng 9/2026 |
| Original Estimate | 2d |
