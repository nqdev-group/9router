---
type: feature
complexity: medium
status: completed
related_issues: []
related_prs: []
estimated_hours: ~14-18
---

# Kế hoạch: Cấu hình max-token per model + tự động bypass model không đủ chỗ chứa prompt

> **Ngày lập kế hoạch:** 2026-08-03 (cập nhật cùng ngày sau khi chốt quyết định với user — xem mục 0)
> **Scope dự kiến:** `packages/token-limit-routing/` (mới), `src/lib/db/repos/modelTokenLimitsRepo.js` (mới), `packages/validation/`, `open-sse/services/combo.js`, `src/sse/handlers/chat.js`, `src/lib/db/repos/settingsRepo.js`, `src/app/api/settings/token-limit-routing/route.js` (mới), `src/app/api/model-token-limits/route.js` (mới), `src/app/(dashboard)/dashboard/settings/token-limits/page.js` (mới), `src/shared/components/Sidebar.js`, `tests/unit/`
> **Priority:** medium
> **Liên quan:** đây là phần mở rộng tự nhiên của [`input-tokens-optimization.md`](input-tokens-optimization.md) Phase 5 (cost-tier routing, `packages/tier-routing/`) — cùng một "combo pre-dispatch reorder/filter" pattern nhưng tiêu chí là **năng lực chứa token** thay vì **giá**.

## 0. Quyết định đã chốt với user (2026-08-03)

Trả lời cho 4 câu hỏi ở mục 6 (bản gốc) — đã cập nhật toàn bộ plan bên dưới theo các quyết định này:

1. **Ngữ nghĩa "max token":** giới hạn **input/prompt token riêng** (không phải tổng context window input+output). → field đặt tên `maxInputTokens`, so sánh trực tiếp với `promptTokens` ước lượng, không trừ hao cho output.
2. **Default:** `tokenLimitRoutingEnabled: false` (opt-in, giữ nguyên convention).
3. **Dashboard UI:** làm ngay trong đợt đầu (không để Phase 2 như tier-routing) — xem mục 2.7 (đã viết lại).
4. **Phạm vi wiring:** chỉ path chat chính (`src/sse/handlers/chat.js`), không đụng `fetch.js`/`search.js`/`imageGeneration.js`/`tts.js` trong đợt này.

## 0.1 Trạng thái triển khai (cập nhật 2026-08-03 — đã implement xong)

Toàn bộ Todo ở mục 3 đã hoàn thành đúng như thiết kế ở mục 2, với 1 điều chỉnh phát sinh lúc code (xem "Khác với plan gốc" bên dưới).

**Files đã tạo/sửa:**

| File | Thay đổi |
|---|---|
| [`packages/token-limit-routing/config/defaults.js`](../packages/token-limit-routing/config/defaults.js) (mới) | `DEFAULT_TOKEN_LIMIT_ROUTING_CONFIG` |
| [`packages/token-limit-routing/estimatePromptTokens.js`](../packages/token-limit-routing/estimatePromptTokens.js) (mới) | Ước lượng token char/4, đọc `messages`/`input`/`contents`/`request.contents`/`system`, tính **toàn bộ conversation** (không chỉ trailing turn — khác với `detectRequiredCapabilities`) |
| [`packages/token-limit-routing/filterByTokenLimit.js`](../packages/token-limit-routing/filterByTokenLimit.js) (mới) | `filterModelsByTokenLimit()` — pure, fail-open khi rỗng |
| [`packages/token-limit-routing/index.js`](../packages/token-limit-routing/index.js) (mới) | Barrel export |
| [`src/lib/db/repos/modelTokenLimitsRepo.js`](../src/lib/db/repos/modelTokenLimitsRepo.js) (mới) | KV scope `modelTokenLimits`, mirror `pricingRepo.js`; `getModelTokenLimitForModel()` fallback `getCapabilitiesForModel().contextWindow` |
| [`src/lib/db/index.js`](../src/lib/db/index.js) | Thêm barrel export cho `modelTokenLimitsRepo.js` |
| [`src/lib/localDb.js`](../src/lib/localDb.js) | Thêm re-export (shim) cho cùng bộ hàm |
| [`open-sse/services/combo.js`](../open-sse/services/combo.js) | Thêm param `tokenLimitRouting`, chèn bước filter đầu tiên (trước tier-routing reorder), log khi bypass |
| [`src/sse/handlers/chat.js`](../src/sse/handlers/chat.js) | Thêm `buildTokenLimitRoutingConfig(settings, body, comboModels)`, wire vào 2 call site `handleComboChat` |
| [`src/lib/db/repos/settingsRepo.js`](../src/lib/db/repos/settingsRepo.js) | `tokenLimitRoutingEnabled: false` trong `DEFAULT_SETTINGS` |
| [`packages/validation/tokenLimitSchemas.js`](../packages/validation/tokenLimitSchemas.js) (mới) | `validateTokenLimitRoutingConfig`, `validateModelTokenLimits` |
| [`packages/validation/index.js`](../packages/validation/index.js) | Export schema mới |
| [`src/app/api/settings/token-limit-routing/route.js`](../src/app/api/settings/token-limit-routing/route.js) (mới) | GET/PATCH toggle, mirror tier-routing route |
| [`src/app/api/model-token-limits/route.js`](../src/app/api/model-token-limits/route.js) (mới) | GET/PATCH/DELETE override per model, mirror pricing route |
| [`src/app/(dashboard)/dashboard/settings/token-limits/page.js`](<../src/app/(dashboard)/dashboard/settings/token-limits/page.js>) (mới) | Trang settings, mirror `provider-alert/page.js`; join `/api/models` (default `contextWindow`) + `/api/model-token-limits` (override) |
| [`src/shared/components/Sidebar.js`](../src/shared/components/Sidebar.js) | Thêm nav entry "Token Limit Routing" trong `compressionContextItems` |
| [`tests/unit/token-limit-routing.test.js`](../tests/unit/token-limit-routing.test.js) (mới) | Unit test `estimatePromptTokens` + `filterModelsByTokenLimit` (15 case) |
| [`tests/unit/combo-token-limit.test.js`](../tests/unit/combo-token-limit.test.js) (mới) | Wiring test `handleComboChat({ tokenLimitRouting })`: bypass đúng model, fail-open khi rỗng, no-op khi không truyền, chạy trước tier-routing reorder (4 case) |
| [`AGENTS.md`](../AGENTS.md) | Thêm `token-limit-routing/` vào bảng `packages/` |

**Khác với plan gốc:** `getMaxInputTokens` trong `tokenLimitRouting` config **không thể** là 1 async accessor gọi thẳng `getModelTokenLimitForModel()` mỗi lần như phác thảo ban đầu ở mục 2.4 — `filterModelsByTokenLimit()` trong `combo.js` gọi hàm này **đồng bộ**, trong khi `getModelTokenLimitForModel()` là async (đọc KV DB). Nếu giữ nguyên thiết kế gốc, mọi so sánh `limit >= promptTokens` sẽ luôn `false` (so sánh với 1 Promise) → filter luôn rỗng → fail-open luôn kích hoạt → **feature sẽ luôn no-op một cách âm thầm**, không lỗi rõ ràng. Đã sửa: `buildTokenLimitRoutingConfig(settings, body, comboModels)` giờ nhận thêm `comboModels`, resolve **trước** toàn bộ limit của các model trong combo bằng `Promise.all`, dựng 1 lookup map đồng bộ rồi mới trả về — cùng tinh thần với cách `buildTierRoutingConfig()` đã resolve `overBudget` bằng `await` trước khi trả config, chỉ khác là ở đây cần resolve N giá trị (N model) thay vì 1.

**Test:** `tests/unit/token-limit-routing.test.js` (15 case) + `tests/unit/combo-token-limit.test.js` (4 case) đều pass. Chạy kèm `combo-autoswitch`/`combo-fusion`/`combo-routing`/`tier-routing` — tổng 52 pass/2 fail; 2 fail đã xác nhận **pre-existing, không liên quan**: `detectRequiredCapabilities web_search tool -> search` fail vì code có comment "search: temporarily disabled in auto-switch (feature not wired yet)" (combo.js dòng ~131, không nằm trong diff của tôi); `reorderByCapabilities keeps order when no model matches` fail vì bug trong chính test (dùng `toBe` reference-equality trong khi `reorderByCapabilities` luôn trả về array mới qua `.map().sort().map()`) — không liên quan tới thay đổi của tôi. Đã thử chạy full suite qua `tests/__baseline__/verify-no-regression.mjs` theo đúng quy trình AGENTS.md nhưng script này so path dạng container (`/app/...`), không match được trên checkout Windows local nên không dùng được trực tiếp — xác nhận "không regression" bằng cách đối chiếu thủ công: diff của tôi chỉ thêm 1 import + 1 block mới vào `combo.js`, không đụng tới `detectRequiredCapabilities`/`reorderByCapabilities` hay bất kỳ file nào xuất hiện trong danh sách fail khác (Cursor protobuf codec, MITM lock file, xAI oauth, v.v. — hoàn toàn không liên quan).

Lúc chạy full suite, vitest tự ghi thêm ~536 dòng snapshot mới (provider chưa có golden snapshot từ trước) vào `tests/translator/__snapshots__/golden-url-header.test.js.snap` — đã revert lại (`git checkout --`) vì không thuộc phạm vi feature này, tránh lẫn vào diff.

**Việc cố ý chưa làm (nằm ngoài scope đã chốt ở mục 0):** wiring vào `fetch.js`/`search.js`/`imageGeneration.js`/`tts.js` (Q4); trừ hao `maxOutput` khi tính default limit (Q1).

---

## 1. Phân tích / Bối cảnh

**Yêu cầu người dùng (nguyên văn, diễn giải):**
1. Mỗi model của mỗi provider có một giới hạn token (max token) → cho phép cấu hình số này cho từng model.
2. Khi có request tới, tính tổng số token mà prompt đó dùng, rồi **bypass** (bỏ qua) những model có max-token nhỏ hơn số token của prompt.

**Hiện trạng liên quan đã khảo sát trong codebase:**

| Thành phần đã có | Vai trò | File |
|---|---|---|
| `getCapabilitiesForModel(provider, model)` | Trả về capability tĩnh (hard-code) cho ~300+ model/pattern, gồm sẵn `contextWindow` (input) và `maxOutput` — nhưng **không cấu hình được qua UI/API**, chỉ sửa trực tiếp trong code | `open-sse/providers/capabilities.js` |
| `packages/tier-routing/` | Package pure-function reorder combo models theo cost, dùng làm **template kiến trúc** trực tiếp cho feature này — cùng nhu cầu: đọc setting bật/tắt, inject 1 hàm lookup từ caller (không tự import DB/provider registry), wire vào `handleComboChat()` | `packages/tier-routing/*.js`, `open-sse/services/combo.js:236-273` |
| `handleComboChat()` | Nơi models trong combo được rotate → reorder theo cost (tier-routing) → reorder theo capability (vision/pdf) → thử lần lượt với fallback. **Không có bước nào từng "drop" hẳn 1 model** — chỉ reorder, luôn giữ nguyên fallback an toàn | `open-sse/services/combo.js:236-361` |
| `pricingRepo.js` | Template chính xác cho lưu trữ **override per-provider/per-model** dạng KV, merge với default tĩnh, cache 5s, API `get/update/reset` | `src/lib/db/repos/pricingRepo.js` |
| `src/app/api/pricing/route.js` | Template REST API GET/PATCH/DELETE cho per-model config | |
| `estimateTokensFromMessages()` | Heuristic char/4 để ước lượng token, đã tồn tại (dùng cho CMEM, không dùng cho combo/routing) | `packages/cmem/utils/tokens.js` |
| `detectRequiredCapabilities(body)` trong combo.js | Cách chuẩn để đọc prompt turn hiện tại qua 3 format (`messages`, `input`, `contents`) — sẽ là mẫu cho hàm ước lượng token đa-format | `open-sse/services/combo.js:106-134` |
| `settingsRepo.js` + `/api/settings/tier-routing/route.js` | Mẫu bật/tắt feature qua settings JSON + validation package + REST endpoint | `src/lib/db/repos/settingsRepo.js:111-114`, `src/app/api/settings/tier-routing/route.js` |

**Constraint bắt buộc (AGENTS.md):** toàn bộ logic mới phải nằm trong `packages/`, `src/app/api/` chỉ chứa route mỏng gọi vào `packages/`/`src/lib/`, `open-sse/` chỉ được sửa để **wire** (import + gọi), không viết business logic trực tiếp trong đó.

**Ràng buộc ngữ nghĩa (đã chốt với user — mục 0):**
- "Max token của model" là **giới hạn token đầu vào (prompt) riêng** — không phải `maxOutput` (giới hạn token sinh ra) đã có sẵn trong `capabilities.js`. Field đặt tên `maxInputTokens` để không đá nhau với `maxOutput` hiện có.
- Default value khi user chưa override: lấy thẳng `contextWindow` từ `capabilities.js`, **không trừ hao** cho output (đã xác nhận với user, không cần logic trừ hao thêm).

## 2. Approach / Strategy

**Kiến trúc: sao chép chính xác pattern của `packages/tier-routing/` + `pricingRepo.js`**, vì đây là 2 feature tương tự nhau ở mức kiến trúc (pre-dispatch, per-model config, opt-in, fail-open). Không phát minh pattern mới — giảm rủi ro, giữ codebase nhất quán, dễ review.

### 2.1 Package pure-function mới: `packages/token-limit-routing/`

```
packages/token-limit-routing/
  estimatePromptTokens.js   // ước lượng token của 1 request body (đa-format)
  filterByTokenLimit.js     // pure function: lọc/bypass models không đủ chỗ
  config/defaults.js        // DEFAULT_TOKEN_LIMIT_ROUTING_CONFIG
  index.js                  // barrel export
```

- **`estimatePromptTokens(body)`**: heuristic char/4 (đồng nhất với `cmem/utils/tokens.js` để không gây lệch số liệu giữa 2 subsystem), nhưng đọc cả 3 hình dạng request (`messages`, `input`, `contents`/`request.contents`) theo đúng cách `detectRequiredCapabilities()` đã làm trong `combo.js` — **không import `packages/cmem`** (cmem là subsystem nặng, có DB riêng, không phù hợp làm dependency của 1 hàm ước lượng thuần). Chấp nhận trùng lặp ~10 dòng heuristic, đúng tinh thần "pure, no cross-feature deps" mà `tier-routing` đã chọn (ghi chú trong `input-tokens-optimization.md` dòng 35).
- **`filterModelsByTokenLimit(models, promptTokens, getMaxInputTokens)`**: với mỗi model string `"provider/model"`, gọi `getMaxInputTokens(modelStr)` (hàm được caller inject, không tự import registry — giữ package độc lập với `open-sse/`/`src/`). Giữ lại model nếu `limit == null || limit >= promptTokens`.
  - **Fail-open bắt buộc:** nếu filter làm rỗng danh sách (mọi model đều bị bypass — ví dụ do cấu hình sai hoặc prompt cực lớn), **trả về danh sách gốc không đổi** thay vì combo rỗng. Lý do: đây là nguyên tắc xuyên suốt codebase — `reorderByCapabilities` (dòng docstring "Stable; never drops a model (fallback intact)"), `checkDailyBudget` (chỉ advisory, không hard-block) — 1 feature filter sai cấu hình không được phép làm sập toàn bộ routing. Model bị gửi vượt limit vẫn có thể tự trả lỗi context-length và combo fallback tiếp tục hoạt động bình thường như hiện tại.
  - Không đổi thứ tự các model còn lại (stable filter, giữ nguyên logic ordering từ các bước trước).

### 2.2 Lưu trữ config: `src/lib/db/repos/modelTokenLimitsRepo.js` (mới, sao chép `pricingRepo.js`)

- KV scope mới: `modelTokenLimits`, shape `{ [providerAlias]: { [modelId]: number } }` (đơn giản hơn pricing vì chỉ có 1 con số, không cần object `{input,output,...}`).
- `getModelTokenLimits()` — toàn bộ override của user.
- `getModelTokenLimitForModel(provider, model)` — trả `userOverride ?? getCapabilitiesForModel(provider, model).contextWindow` (default lấy từ dữ liệu đã có sẵn trong `capabilities.js`, không cần nhập tay cho hơn 300 model đã biết).
- `updateModelTokenLimits(data)` / `resetModelTokenLimit(provider, model)` / `resetAllModelTokenLimits()` — atomic read-modify-write y hệt `pricingRepo.js`.
- Cache 5s giống `pricingRepo.js` (tránh query KV mỗi request).

### 2.3 Wiring vào `open-sse/services/combo.js`

- Thêm param `tokenLimitRouting = null` vào `handleComboChat({ ... })`.
- **Thứ tự bước quan trọng** — khác với tier-routing (chỉ reorder, không drop): filter theo token-limit nên chạy **đầu tiên**, trước cả tier-routing reorder và capability auto-switch, vì đây là điều kiện cứng (model không đủ chỗ chứa prompt gần như chắc chắn lỗi ngay) — lọc trước để các bước reorder phía sau chỉ làm việc trên tập model còn hợp lệ:

  ```
  rotate (round-robin)
    → [MỚI] filter theo token-limit (drop, fail-open nếu rỗng)
    → tier-routing reorder theo cost (không drop)
    → capability auto-switch reorder (vision/pdf, không drop)
    → thử lần lượt (fallback loop hiện có)
  ```
- Log khi có model bị bypass: `log.info("COMBO", "token-limit: bypass <model> (limit=<n> < prompt=<m>)")` — theo đúng style logging đã có cho tier-routing/auto-switch (dòng 258, 269 trong combo.js).
- Fusion combo (`handleFusionChat`) **không áp dụng** bước này trong đợt đầu — cùng quyết định như tier-routing (dòng 38 trong `input-tokens-optimization.md`: "Fusion strategy không áp dụng tier-routing... theo thiết kế") vì fusion fan-out tới toàn bộ panel có chủ đích.

### 2.4 Wiring vào `src/sse/handlers/chat.js`

- Thêm `buildTokenLimitRoutingConfig(settings, body)` cạnh `buildTierRoutingConfig()` đã có (dòng 33-59):
  ```js
  async function buildTokenLimitRoutingConfig(settings, body) {
    if (!settings.tokenLimitRoutingEnabled) return null;
    const promptTokens = estimatePromptTokens(body); // tính 1 lần, không tính lại mỗi model
    return {
      enabled: true,
      promptTokens,
      getMaxInputTokens: (modelStr) => {
        const slash = modelStr.indexOf("/");
        const provider = slash > 0 ? modelStr.slice(0, slash) : "";
        const model = slash > 0 ? modelStr.slice(slash + 1) : modelStr;
        return getModelTokenLimitForModel(provider, model);
      },
    };
  }
  ```
- Gọi và truyền vào **cả 2 call site** hiện có của `handleComboChat` (dòng 166 và 221) — giống hệt cách `tierRouting` đã được truyền vào 2 chỗ này.
- **Ngoài scope đợt đầu** (giống tier-routing): không wire vào `fetch.js`/`search.js`/`imageGeneration.js`/`tts.js` — chỉ path chat chính.

### 2.5 Settings (bật/tắt qua config)

Thêm vào `DEFAULT_SETTINGS` trong `settingsRepo.js` (cạnh block `tierRouting*` dòng 111-114):
```js
tokenLimitRoutingEnabled: false, // opt-in, giống tier-routing/privacy/cmem convention
```

### 2.6 Validation + API

- `packages/validation/tokenLimitSchemas.js` — mirror `tierRoutingSchemas.js`, validate `{ tokenLimitRoutingEnabled: boolean }` cho settings, và validate `{ [provider]: { [model]: number>0 } }` cho model-limit payload (mirror validate logic trong `src/app/api/pricing/route.js:39-73`).
- `src/app/api/settings/token-limit-routing/route.js` — GET/PATCH bật tắt feature, mirror y hệt `src/app/api/settings/tier-routing/route.js`.
- `src/app/api/model-token-limits/route.js` — GET (merged limits, gồm cả default suy ra từ `capabilities.js`) / PATCH (set override per model) / DELETE (reset), mirror y hệt `src/app/api/pricing/route.js`.

### 2.7 Dashboard UI — làm ngay trong đợt đầu (theo quyết định mục 0)

**Không mirror `PricingModal.js`/`src/app/dashboard/settings/pricing/page.js`** — đã kiểm tra, cặp file này nằm ngoài route group `(dashboard)` (`src/app/dashboard/...` chứ không phải `src/app/(dashboard)/dashboard/...`) và **không được link từ `Sidebar.js`** → đây là trang mồ côi/legacy, không phải convention hiện hành. Trang settings đang sống thực tế nằm ở `src/app/(dashboard)/dashboard/settings/{provider-alert,response-cache,rtk-engine,caveman-engine,cmem-engine,models-dev,privacy}/page.js`, dùng chung 1 pattern: full page (không phải modal) build từ `Card` component (`@/shared/components/Card`), toggle bật/tắt ở header, các section cấu hình chỉ render khi bật. Mirror pattern này, cụ thể lấy `src/app/(dashboard)/dashboard/settings/provider-alert/page.js` làm template gần nhất (cũng có toggle + editable list + save button + trạng thái "disabled" fallback UI).

- **File mới:** `src/app/(dashboard)/dashboard/settings/token-limits/page.js`
  - Header: tiêu đề + toggle `tokenLimitRoutingEnabled` (gọi `PATCH /api/settings/token-limit-routing` ngay khi đổi, giống `handleToggleEnabled` trong `provider-alert/page.js`).
  - Khi bật: hiển thị 1 `Card` mô tả cơ chế (ngắn gọn: "Model có max-input-token nhỏ hơn số token ước lượng của prompt sẽ bị bỏ qua khi chọn model trong combo"), sau đó danh sách `Card` theo từng provider — mỗi provider 1 bảng `model | max input tokens (input number, editable) | default (từ capabilities.js, hiển thị dạng placeholder/hint khi user chưa override)`.
  - Nút "Save Changes" gọi `PATCH /api/model-token-limits` với toàn bộ override đã sửa (đồng bộ style `handleSave` trong `provider-alert/page.js` — không cần optimistic per-cell save như style cũ của `PricingModal.js`, chọn theo pattern mới hơn: sửa nhiều ô rồi 1 lần Save).
  - Nút "Reset to defaults" (per-model hoặc toàn bộ) gọi `DELETE /api/model-token-limits`.
  - Khi tắt: hiển thị block "disabled" đơn giản như `provider-alert/page.js` dòng 272-277.
  - Danh sách model để hiển thị bảng lấy từ nguồn nào đã có sẵn model catalog (`PROVIDER_MODELS`/`/api/models`) join với `GET /api/model-token-limits` (trả cả override lẫn default suy ra) — cần khảo sát thêm khi code (xem mục 4, Risk 4 mới).
- **Sửa `src/shared/components/Sidebar.js`:** thêm 1 entry nav mới cạnh các mục settings khác (dòng 49-65 hiện tại, ví dụ đặt cạnh `rtk-engine`/`response-cache`):
  ```js
  { href: "/dashboard/settings/token-limits", label: "Token Limit Routing", icon: "rule" }, // hoặc icon phù hợp khác trong bộ Material Symbols đang dùng
  ```

## 3. Công việc cần thực hiện (Todo)

- [x] Tạo `packages/token-limit-routing/config/defaults.js` (`DEFAULT_TOKEN_LIMIT_ROUTING_CONFIG`)
- [x] Tạo `packages/token-limit-routing/estimatePromptTokens.js` (đa-format: messages/input/contents)
- [x] Tạo `packages/token-limit-routing/filterByTokenLimit.js` (pure, fail-open khi rỗng)
- [x] Tạo `packages/token-limit-routing/index.js` (barrel export)
- [x] Tạo `src/lib/db/repos/modelTokenLimitsRepo.js` (mirror `pricingRepo.js`, default fallback = `getCapabilitiesForModel().contextWindow`)
- [x] Sửa `open-sse/services/combo.js`: thêm param `tokenLimitRouting`, chèn bước filter (đầu tiên, trước tier-routing reorder), log khi bypass
- [x] Sửa `src/sse/handlers/chat.js`: thêm `buildTokenLimitRoutingConfig()`, wire vào 2 call site `handleComboChat` (đã điều chỉnh signature — xem mục 0.1 "Khác với plan gốc")
- [x] Sửa `src/lib/db/repos/settingsRepo.js`: thêm `tokenLimitRoutingEnabled: false` vào `DEFAULT_SETTINGS`
- [x] Tạo `packages/validation/tokenLimitSchemas.js`, export qua `packages/validation/index.js`
- [x] Tạo `src/app/api/settings/token-limit-routing/route.js` (GET/PATCH)
- [x] Tạo `src/app/api/model-token-limits/route.js` (GET/PATCH/DELETE)
- [x] Khảo sát nguồn model catalog dùng cho bảng UI — dùng `/api/models` (đã có sẵn `routedModel` + `caps.contextWindow`), không cần thêm endpoint mới (xem Risk 4)
- [x] Tạo `src/app/(dashboard)/dashboard/settings/token-limits/page.js` (mirror `provider-alert/page.js`: toggle + per-provider `Card` table + save/reset)
- [x] Sửa `src/shared/components/Sidebar.js`: thêm nav entry `Token Limit Routing` → `/dashboard/settings/token-limits`
- [x] Test: `tests/unit/token-limit-routing.test.js` — pure functions (`estimatePromptTokens` đa-format, `filterModelsByTokenLimit` gồm case fail-open khi rỗng) — 15 case, pass
- [x] Test: `tests/unit/combo-token-limit.test.js` (file riêng) — kiểm tra thứ tự bước đúng (filter chạy trước tier-routing reorder), fail-open, no-op khi không truyền config — 4 case, pass
- [x] Chạy test suite liên quan (`combo-autoswitch`/`combo-fusion`/`combo-routing`/`tier-routing`/2 file test mới) — 52 pass/2 fail, 2 fail xác nhận pre-existing không liên quan (xem mục 0.1). `verify-no-regression.mjs` không dùng được trực tiếp trên local Windows (path format khác container) — xác nhận thủ công thay thế.
- [x] Cập nhật `AGENTS.md` — thêm `token-limit-routing/` vào bảng `packages/`

## 4. Risks & Unknowns

- **Risk 1: Heuristic ước lượng token (char/4) không chính xác** với nhiều ngôn ngữ (đặc biệt tiếng Việt/CJK dùng nhiều byte hơn/token khác biệt) → có thể bypass sai (bỏ qua model đủ chỗ, hoặc ngược lại cho qua model không đủ chỗ). **Mitigation:** đây là heuristic đã dùng sẵn cho CMEM trong codebase (chấp nhận được ở mức hiện tại), và vì filter là **fail-open + advisory** (dropped model coi như "được," không phải "chặn cứng bảo mật"), sai số không gây hậu quả nghiêm trọng — model bị gửi nhầm vẫn tự trả lỗi context-length, combo tiếp tục fallback bình thường.
- **Risk 2: Default limit lấy từ `contextWindow` có thể quá sát** (không trừ hao chỗ cho output token, theo đúng quyết định mục 0) — trong thực tế provider thường tự trả lỗi context-length nếu tổng input+output vượt quá, nên model có thể bị bypass sát ngưỡng hoặc ngược lại vẫn lọt qua rồi lỗi ở phía provider khi response dài. Chấp nhận trade-off này theo quyết định của user; user có thể tự set `maxInputTokens` thấp hơn `contextWindow` qua UI nếu muốn chừa chỗ cho output.
- **Risk 3: Conflict thứ tự với tier-routing/capability reorder** — nếu filter token-limit chạy sau capability reorder, có thể loại bỏ đúng model duy nhất thỏa capability cứng (vision/pdf), tạo ra request lỗi vì thiếu modal cần thiết. **Mitigation:** đã quyết định filter token-limit chạy **trước** (mục 2.3) — nhưng cần review kỹ để đảm bảo capability auto-switch ở bước sau vẫn hoạt động đúng trên tập đã lọc (không có model nào thỏa capability bị lọc mất oan uổng nếu limit cấu hình sai — lại nhờ fail-open ở filter mà giảm rủi ro này).
- **Risk 4 (mới): nguồn dữ liệu model catalog cho bảng UI chưa xác định rõ.** Trang `token-limits/page.js` cần liệt kê toàn bộ model (theo provider) để user set `maxInputTokens`, nhưng khác với pricing (chỉ hiện model **đã có** override hoặc đã biết giá), ở đây cần hiện **toàn bộ model khả dụng** (kể cả chưa override) kèm default suy ra từ `capabilities.js` để user biết đang áp dụng ngưỡng nào. Cần khảo sát `PROVIDER_MODELS` (`open-sse/providers/index.js`) hoặc `/api/models` khi bắt tay code để chọn nguồn liệt kê đúng — chưa chốt trong plan này, sẽ xác định lúc code trang UI (không block các phần backend/package/routing).

*(Q1-Q4 gốc đã được xác nhận với user — xem mục 0 ở đầu file. Không còn open question chặn việc bắt đầu code.)*

## 5. Success Criteria

- Người dùng có thể set/override max-token cho từng `provider/model` qua API (`PATCH /api/model-token-limits`), giá trị mặc định hợp lý tự suy ra từ `capabilities.js` khi chưa cấu hình.
- Khi `tokenLimitRoutingEnabled = true` và 1 combo có nhiều model, model nào có limit < số token ước lượng của prompt sẽ bị bypass (không được thử) — trừ khi bypass hết sạch (fail-open, giữ nguyên danh sách gốc).
- Không phá vỡ test suite hiện có (`combo-autoswitch`, `combo-fusion`, `combo-routing`, `tier-routing` đều pass như baseline).
- Test mới cho `token-limit-routing` cover: ước lượng đa-format, filter cơ bản, fail-open khi rỗng, thứ tự đúng khi kết hợp với tier-routing + capability auto-switch.
- Feature mặc định tắt (`tokenLimitRoutingEnabled: false`) — không đổi hành vi routing hiện tại cho user chưa bật.

## 6. Questions / Dependencies

Đã chốt toàn bộ 4 câu hỏi ban đầu với user — xem mục 0. Câu hỏi còn mở duy nhất (không chặn code): nguồn model catalog cho bảng UI (Risk 4, mục 4) — sẽ tự quyết định lúc code trang `token-limits/page.js` dựa trên khảo sát `PROVIDER_MODELS`/`/api/models` thực tế, không cần hỏi lại user trừ khi phát sinh trade-off đáng kể.
