---
type: bug-fix
complexity: medium
impact: high
related_issues: []
related_prs: []
time_spent_hours: ~1.5
status: completed
---

# Kế hoạch: Fix Docker build failure — duplicate `rtkStats` declaration + 2 bug ăn kèm trong `chatCore.js`

> **Ngày:** 2026-09-22
> **Phạm vi:** [open-sse/handlers/chatCore.js](../open-sse/handlers/chatCore.js), [open-sse/handlers/chatCore/requestDetail.js](../open-sse/handlers/chatCore/requestDetail.js)
> **Trạng thái:** ✅ Đã hoàn thành

---

## 1. Bối cảnh

User dán log GitHub Actions build Docker: `npm run build` fail ở bước `next build --webpack` với lỗi:

```
Module parse failed: Identifier 'rtkStats' has already been declared (285:10)
```

tại `open-sse/handlers/chatCore.js`, import trace qua `open-sse/index.js` → `src/app/api/translator/send/route.js`. Đây là lỗi parse-time (SWC), nên build fail cứng — không phải lỗi runtime hay lỗi môi trường CI.

## 2. Công việc đã thực hiện

### 2.1 Root cause: `chatCore.js` có 2 khối code gần như trùng lặp

`git blame` cho thấy commit gần nhất chạm file này, `c933eefc2` (fix(cursor): stop AgentService empty turns and silent tool hangs, 2026-09-16), thêm cơ chế `preTranslateRtk` (RTK chạy trước khi translate cho provider `cursor`, vì translator của Cursor viết lại `tool_result` thành text) và sửa 1 bản `const rtkStats = ...` — nhưng codebase đã có SẴN một bản `const rtkStats = compressMessages(translatedBody, tokenSaverEnabled && rtkEnabled, rtkConfig)` khác (từ commit `1ecd7bdd9`, 2026-07-17) ở một vị trí gần đó (giữa block Caveman "before RTK" và block Headroom). Commit `c933eefc2` chỉ sửa 1 trong 2 vị trí này → 2 khai báo `const rtkStats` cùng scope → `SyntaxError` khi parse.

Đi sâu hơn phát hiện code khu vực này (RTK/Caveman/Headroom, dòng ~279-320) có tới **3 lỗi lồng nhau**, tất cả đều là hậu quả của việc các commit trước merge/rebase không dọn code cũ:

1. **Duplicate declare `rtkStats`** (lỗi chính, block build).
2. **`xf` dùng trước khi khai báo** (`const xf = []` nằm SAU đoạn code `xf.push(...)` cho RTK savings — temporal dead zone, sẽ `ReferenceError` ngay khi có request RTK compress được ít nhất 1 hit, một khi build qua được bước parse).
3. **Caveman bị inject 2 lần** khi `tokenSaverEnabled` true: 1 block cũ (dòng ~283, không check `tokenSaverEnabled`, chỉ check `cavemanEnabled && cavemanLevel`) và 1 block mới hơn (dòng ~311, có check `tokenSaverEnabled`, dùng để track vào `xf`). Hậu quả: khi client gửi header `x-9router-token-saver: off`, request VẪN bị inject caveman prompt (do block cũ không tôn trọng header opt-out) — bug bị phát hiện qua test `headroom-chat-core.test.js` fail ngay sau khi sửa xong lỗi build.

### 2.2 Fix

Gộp lại thành đúng 1 khối, giữ đúng cả 2 tính năng gần đây (preTranslateRtk skip cho cursor + `rtkConfig` param) và tôn trọng `tokenSaverEnabled` cho MỌI đường injection, không chỉ đường log:

```js
// Token-saver flags accumulator — khai báo TRƯỚC RTK/Caveman vì cả 2 đều push vào.
const xf = [];

// Caveman: inject trước RTK (để RTK có thể compress luôn text vừa inject).
// Gate bằng tokenSaverEnabled Ở ĐÂY (không chỉ ở dưới) để header opt-out
// thực sự chặn injection, không chỉ chặn dòng log "⚙".
if (tokenSaverEnabled && cavemanEnabled && cavemanLevel) {
  injectCaveman(translatedBody, finalFormat, cavemanLevel);
  log?.debug?.("CAVEMAN", `${cavemanLevel} | ${finalFormat}`);
  xf.push(`CAVEMAN:${cavemanLevel}`);
}

// RTK: compress tool_result. Bỏ qua (dùng lại preTranslateRtk, đã log ở trên)
// nếu đã compress trước khi translate (cursor).
const rtkStats = preTranslateRtk || compressMessages(translatedBody, tokenSaverEnabled && rtkEnabled, rtkConfig);
if (!preTranslateRtk) {
  const rtkLine = formatRtkLog(rtkStats);
  if (rtkLine) console.log(rtkLine);
}
if (rtkStats?.hits?.length) xf.push(`RTK:${rtkStats.hits.length}`);
```

Xoá 2 block cũ (Caveman-không-gate + rtkStats-thừa + rtkLine-thừa + xf.push-byte-savings-thừa). Giữ format log `RTK:${hits.length}` (không phải `RTK −XB(Y%)`) vì test `rtk-cursor-pretranslate.test.js:127` đã chốt format này là hành vi mong đợi hiện tại.

Cũng sửa `preTranslateRtk` để truyền `rtkConfig` (bị thiếu ở bản gốc — cursor request pre-translate compress không áp dụng config tuỳ biến, chỉ non-cursor mới có):
```js
const preTranslateRtk = provider === "cursor"
  ? compressMessages(body, tokenSaverEnabled && rtkEnabled, rtkConfig)  // +rtkConfig
  : null;
```

### 2.3 Bug thứ 4 phát hiện khi chạy full regression: `saveUsageStats` tự tham chiếu chính nó

Chạy toàn bộ test liên quan `chatCore` (17 file test có import/mock `chatCore`) phát hiện 3 test fail thêm ở `cline-free-models-envelope.test.js` với `ReferenceError: Cannot access 'rtkStats' before initialization` — nhưng lần này lỗi nằm ở **`open-sse/handlers/chatCore/requestDetail.js:103`**, không liên quan gì tới `chatCore.js` vừa sửa:

```js
export function saveUsageStats({ ..., rtkStats = rtkStats }) {   // default tự tham chiếu chính nó!
```

`git blame` cho thấy bug này có từ commit `50b067597` (2026-07-13) — và đã được **chính người dùng ghi lại trong [plans/2026-07-29-token-saver-report.md](../plans/2026-07-29-token-saver-report.md)** §Phase 1 là việc "cần sửa" (thêm param `rtkStats` cho `saveUsageStats()`), nhưng bản fix thực tế bị lỗi copy-paste (`rtkStats = rtkStats` thay vì `rtkStats = null`). Lỗi này KHÔNG liên quan gì tới lỗi build hôm nay (khác file, khác commit, có từ 2 tháng trước) — chỉ bị lộ ra vì tests không chạy được trước đó do build fail ở bước parse.

Đã tự sửa luôn (rủi ro thấp, 1 dòng, đã có test bao phủ sẵn):
```js
export function saveUsageStats({ ..., rtkStats = null }) {
```

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [open-sse/handlers/chatCore.js](../open-sse/handlers/chatCore.js) | Gộp 2 khai báo `rtkStats` trùng lặp thành 1; di chuyển `const xf = []` lên trước mọi chỗ dùng; gộp 2 block inject Caveman thành 1, gate bằng `tokenSaverEnabled`; thêm `rtkConfig` vào lệnh gọi `compressMessages` cho nhánh `preTranslateRtk` (cursor). |
| [open-sse/handlers/chatCore/requestDetail.js](../open-sse/handlers/chatCore/requestDetail.js) | `saveUsageStats()`: default param `rtkStats = rtkStats` (tự tham chiếu, luôn throw khi caller không truyền) → `rtkStats = null`. |

## 4. Trạng thái hiện tại

Chưa commit — đang chờ người dùng review. Verify đã chạy:
- `node --check` cả 2 file → OK (không còn lỗi parse).
- 17 file test có đụng tới `chatCore` (rtk-cursor-pretranslate, qoder-billing, opencode-session, opencode-zen-models, opencode-go-muse-spark-responses, opencode-go-models, cline-free-models-envelope, opencode-go-session, extract-usage-cache-shapes, minimax-transport-target-format, openai-responses-nonstream, continuity-strip, codex-native-passthrough-thinking, antigravity-nonstream-usage-3260, kiro-nonstream-error, headroom-chat-core, force-stream-config) + `rtk.test.js` + `system-inject.test.js` → **242/246 pass**.
- 4 fail còn lại xác nhận là **pre-existing, không liên quan** tới lỗi build hôm nay hoặc tới 2 file đã sửa:
  - `force-stream-config.test.js` × 2 — mock riêng của test này cho `open-sse/rtk/headroom.js` thiếu export `formatHeadroomSizeLog` (đã được `chatCore.js` gọi từ commit `fb543a1f3`, 2026-06-26 — mock chưa update theo).
  - `rtk.test.js` × 2 — test `compressMessages` cho Claude tool_result string/array-form, gọi trực tiếp `open-sse/rtk/index.js` (file không đụng tới trong lần sửa này).
- Chưa thử lại `npm run build` / Docker build thật (môi trường Windows local gặp lỗi EPERM scandir không liên quan khi chạy `next build` toàn cục — không phải do fix này, không tái hiện được trên Linux CI).

## 5. Việc còn mở (chưa làm, để quyết định sau)

- [ ] `force-stream-config.test.js` — mock `headroom.js` thiếu `formatHeadroomSizeLog`. Không liên quan tới hôm nay, để riêng.
- [ ] `rtk.test.js` — 2 test `compressMessages` cho Claude tool_result đang fail thật trong `open-sse/rtk/index.js` (không phải do 2 file mình sửa). Cần điều tra riêng nếu người dùng muốn.
- [ ] Chưa verify lại bằng CI/Docker thật — nên push và xem GitHub Actions build lại trước khi coi là "chắc chắn xanh".

## 6. Bài học rút ra

- Lỗi `Identifier 'X' has already been declared` ở build luôn là dấu hiệu 1 commit trước đó thêm code mới ở VỊ TRÍ KHÁC thay vì THAY THẾ code cũ cùng chức năng — luôn `git blame`/`git show <commit> -- <file>` để tìm bản diff gốc trước khi tự đoán cách gộp.
- Khi sửa 1 lỗi parse-time trong 1 file lâu năm nhiều người cùng sửa, luôn chạy lại TOÀN BỘ test có đụng tới file đó (không chỉ file vừa sửa) — vì trước khi fix, file không parse được nên mọi lỗi runtime/logic ẩn bên trong (TDZ, self-referential default...) chưa từng bị test phát hiện.
