---
type: bug-fix
complexity: high
impact: high
related_issues: []
related_prs: []
time_spent_hours: ~4
status: completed
---

# Kế hoạch: Rà soát & sửa hàng loạt bug ở provider Kira AI (registry, video, TTS, suggested-models)

> **Ngày:** 2026-09-18
> **Phạm vi:** `packages/providers/registry/kira.js`, `packages/providers/pricing.js`, `packages/providers/suggested-models/filters.js` (mới), `src/app/api/providers/suggested-models/filters.js`, `open-sse/handlers/ttsProviders/kira.js`, `open-sse/handlers/videoProviders/kira.js` (mới), `open-sse/handlers/videoProviders/index.js`
> **Trạng thái:** ✅ Đã hoàn thành (trừ 1 mục cố ý để mở — xem mục 5)

---

## 1. Bối cảnh

Bắt đầu từ yêu cầu "review lại cấu hình kira" đơn giản, nhưng qua nhiều vòng người dùng phản hồi ("không lấy được Available Models", "add model không hiện lên", "ko hiện được cái nào lên hết"), việc này mở rộng thành một chuỗi điều tra dài phát hiện **5 bug độc lập, không liên quan nhân-quả với nhau** (chỉ tình cờ chồng lấp triệu chứng lên nhau, khiến người dùng tưởng là 1 bug). Ghi lại đầy đủ ở đây để phiên sau không lặp lại quá trình điều tra hoặc vô tình revert các fix tưởng như "thừa"/"không cần thiết".

## 2. Công việc đã thực hiện

### 2.1. Viết lại `kira.js` theo dữ liệu live thật (không đoán mò)

Thay vì tin vào tool tóm tắt AI (WebFetch từng trả kết quả sai/thiếu khi thử fetch trang marketing `/models/`), quyết định `curl` thẳng `https://kiraai.vn/api/v1/models` để lấy JSON gốc — tránh đúng loại lỗi mà bản thân file này từng mắc phải trước đó (id bị diễn giải sai qua tóm tắt).

- Xóa các model id đã chết, không còn tồn tại trên live API: `deepseek-v4-pro-free`, `deepseek-v4-flash-free`, `deepseek-v4-flash-1b-free`, `qwen-3.8-27b-free`, `qwen-3.8-max-free`.
- Sửa `kira-mini-2.0` → `kira-2.0` (id thật hiện tại; model này giờ đã miễn phí, trước đó là trả phí).
- Thêm `videoConfig.baseUrl: "https://kiraai.vn/api/v1/videos"` — trước đó thiếu hẳn dù `serviceKinds` có `"video"` và có 2 model video khai báo sẵn (video generation sẽ luôn fail với lỗi "Provider 'kira' does not support video generation").
- URL notice/usage: người dùng chỉnh qua 2-3 vòng — chốt lại `apiKeyUrl` và `usage.url` = `https://kiraai.vn/developer/`, `usage.pricingUrl` = `https://kiraai.vn/bang-gia/` (đã thử `https://kiraai.vn/models/` theo yêu cầu ban đầu nhưng người dùng revert lại `bang-gia/` — **giữ nguyên `bang-gia/`, đừng đổi lại `models/` ở phiên sau trừ khi được yêu cầu rõ**).

### 2.2. Đồng bộ `packages/providers/pricing.js` (block `kira`)

Áp lại `discount_percent` đúng theo % hiện tại lấy từ live API thay vì tin số cũ trong file. Phát hiện quan trọng: **discount của Kira thay đổi theo thời gian** (khuyến mãi, không cố định) — ví dụ `kimi-k3` từ giảm 40% (giá $9.00/$45.60) xuống còn giảm 30% (giá $10.50/$53.20) chỉ trong vài tuần. Nghĩa là bảng giá này **không thể fetch một lần rồi để yên** — cần re-sync định kỳ. Nhân dịp này cũng xóa các id chết trùng với mục 2.1 và thêm id chat mới xuất hiện trên live catalog.

### 2.3. Fix default TTS model sai trong handler

`open-sse/handlers/ttsProviders/kira.js`: default `ttsModel` fallback (dùng khi client gọi TTS chỉ truyền voice, không truyền model) là `"kira-2.5-flash"` — đây là **model chat**, không phải TTS, nên chắc chắn fail khi gửi lên endpoint `/api/v1/audio/speech`. Đổi thành `"kira-3.0-flash-tts"` (model TTS thật, có trong `ttsConfig.models`).

### 2.4. Đọc thêm tài liệu chính thức Kira, phát hiện 2 bug nữa

Đọc `https://kiraai.vn/documents/`, `/developer/`, `/notifications/` theo yêu cầu người dùng "đọc các link trên và bổ sung":

- **Video polling path sai:** cấu hình cũ giả định poll tại `{baseUrl}/{id}` (giống khuôn mẫu xAI mà `videoCore.js` dùng làm mặc định chung cho mọi provider), nhưng path thật của Kira là `{baseUrl}/operations/{id}`. Xác nhận bằng HTTP probe trực tiếp (không đoán): `GET .../videos/{id}` → 404 (sai), `GET .../videos/operations/{id}` → 401 "Authentication required" (đúng, route tồn tại thật, chỉ thiếu key).
  - **Quyết định:** không thể sửa chỉ bằng đổi `baseUrl` trong config vì `videoCore.js` dùng chung 1 khuôn mẫu URL (`{base}/{action}` cho POST, `{base}/{id}` cho GET) cho tất cả provider không có adapter riêng. Đã có sẵn cơ chế adapter (`open-sse/handlers/videoProviders/{openrouter,vertex}.js`) cho đúng trường hợp này → tạo `open-sse/handlers/videoProviders/kira.js` mới, đăng ký vào `index.js`. Đây là cách làm nhất quán với pattern đã có, không phải giải pháp vá tạm.
- **TTS voices list sai:** registry cũ liệt kê thẳng tên engine nội bộ (`Kore`, `Fenrir`, `Puck`, `Charon`, `Aoede`) làm voice id công khai. `GET https://kiraai.vn/api/v1/audio/voices` (endpoint thật, verify trực tiếp) cho thấy voice id công khai đúng là kiểu OpenAI: `alloy/echo/fable/onyx/nova/shimmer`, Kira tự map nội bộ sang tên engine. Sửa `ttsConfig.voices` trong `kira.js` sang đúng 6 id chuẩn (bao gồm `shimmer` — trước đó thiếu hoàn toàn), và bổ sung `shimmer: "Kore"` còn thiếu vào `VOICE_MAP` trong `open-sse/handlers/ttsProviders/kira.js`.
- **Cố ý KHÔNG wire** 2 nhóm endpoint phát hiện thêm từ tài liệu, dù đã biết chúng tồn tại:
  - `POST /api/v1/responses` (OpenAI Responses API, docs gọi là "Codex Integration", có SSE + tool calling) — muốn dùng được cần một executor riêng như `open-sse/executors/github.js` đang làm cho field `responsesUrl` (không phải chỉ khai báo URL là chạy được).
  - `GET /user/profile`, `GET /user/usage/logs`, `GET|POST /user/keys` — chưa có API key thật để xác nhận chính xác shape JSON trả về (tên field balance/cost...). Đoán mò rồi wire sai sẽ làm hỏng usage dashboard, rủi ro hơn lợi ích lúc này.
  - Cả 2 mục này đã ghi chú rõ trong comment của `kira.js` để phiên sau biết mà làm tiếp, không phải bị bỏ sót.

### 2.5. Bug hệ thống: "Available Models" luôn trống — thiếu filter `"openai"`

Người dùng báo: không lấy được Available Models, add model không hiện lên.

**Nguyên nhân:** `src/app/api/providers/suggested-models/filters.js` có object `FILTERS` chỉ định nghĩa 4 loại `"-free"` (`openrouter-free`, `opencode-free`, `mimo-free`, `airforce-free`) — **thiếu hẳn key `"openai"`** mà `kira.js` và `aimlapi.js` dùng cho `modelsFetcher.type`. Route trả 400 "Unknown filter type", và `src/shared/utils/providerModelsFetcher.js` nuốt lỗi (`if (!res.ok) return []`) → danh sách suggested models luôn rỗng, không báo lỗi gì cho người dùng thấy. Đây là bug hệ thống, ảnh hưởng mọi provider dùng `type: "openai"`, không riêng Kira (cả vài provider upstream open-sse: `perplexity-agent`, `tokenrouter`, `vercel-ai-gateway`, `venice`).

**Quyết định vị trí đặt code (theo yêu cầu người dùng):** không sửa trực tiếp trong `src/app/api/providers/suggested-models/filters.js`. Thay vào đó tạo `packages/providers/suggested-models/filters.js` (file mới) chứa filter `openai`, theo đúng convention "custom/extra layer" mà `packages/providers/pricing.js` (`EXTRA_PROVIDER_PRICING`) và `packages/providers/registry/index.js` đang dùng — tách biệt rõ "logic của open-sse gốc" và "phần mở rộng riêng của 9router". `src/app/api/.../filters.js` giờ `import { FILTERS as EXTRA_FILTERS } from "@9router/providers/suggested-models/filters.js"` và spread `...EXTRA_FILTERS` vào cuối object `FILTERS` gốc (giữ nguyên tên biến `FILTERS`, **không** tạo biến trung gian `BASE_FILTERS` — bản nháp đầu có tạo biến này nhưng người dùng yêu cầu bỏ, giữ tên gốc cho gọn diff).

Verify bằng cách chạy thử logic filter với dữ liệu JSON thật (curl) của cả Kira (có field `type`, cần lọc loại `image/video/audio`) và Venice (field `type: "text"`, không phải `"chat"`, để đảm bảo filter không loại nhầm toàn bộ catalog của Venice).

### 2.6. Bug riêng của `kira.js`: TOÀN BỘ model chat bị ẩn — `type: "chat"` sai

Sau khi fix mục 2.5, người dùng báo tiếp "ko hiện được cái nào lên hết" — tức là **kể cả danh sách tĩnh hard-code sẵn** cũng không hiện, không chỉ suggested models động. Điều tra sâu hơn phát hiện đây là **bug thứ 2, hoàn toàn độc lập, có từ trước session này** (đã tồn tại từ lần đọc file đầu tiên, không phải do các sửa đổi trong session này gây ra).

**Nguyên nhân:** Dashboard "Available Models" (`src/app/(dashboard)/dashboard/providers/[id]/page.js`, dùng `getModelKind()` từ `src/shared/constants/models.js`) chỉ hiện model có `kind` falsy hoặc **đúng bằng `"llm"`**. Mọi model chat trong `kira.js` lại khai `type: "chat"` (literal string "chat", không phải "llm", không phải để trống) → bị filter loại sạch 100%. Model image/video không bị ảnh hưởng vì chúng hiện ở section khác dựa trên `type` riêng của chúng (`"image"`/`"video"`).

**Fix:** bỏ hẳn field `type: "chat"` khỏi 12 entry model chat trong `kira.js` — không cần set gì thay thế, vì `kind` mặc định tự là `"llm"` khi bỏ trống (`MODEL_DEFAULTS.kind` trong `open-sse/providers/models/schema.js`), đúng convention mọi file registry khác đang dùng (`meta-llm.js`, `aimlapi.js` đều không set `type` cho model chat).

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [packages/providers/registry/kira.js](../packages/providers/registry/kira.js) | Viết lại gần như toàn bộ: xóa id chết, sửa id sai, thêm `videoConfig`, sửa `ttsConfig.voices`, cập nhật URL notice/usage, **bỏ `type: "chat"` khỏi 12 model chat** |
| [packages/providers/pricing.js](../packages/providers/pricing.js) | Đồng bộ lại block `kira`: discount %, giá, id theo live catalog |
| [packages/providers/suggested-models/filters.js](../packages/providers/suggested-models/filters.js) (**Mới**) | Filter `openai` — full catalog, loại non-chat khi có field `type` |
| [src/app/api/providers/suggested-models/filters.js](../src/app/api/providers/suggested-models/filters.js) | Import + spread `EXTRA_FILTERS` từ package mới vào `FILTERS` gốc |
| [open-sse/handlers/ttsProviders/kira.js](../open-sse/handlers/ttsProviders/kira.js) | Default `ttsModel` sửa từ model chat sang model TTS thật; thêm `shimmer` vào `VOICE_MAP` |
| [open-sse/handlers/videoProviders/kira.js](../open-sse/handlers/videoProviders/kira.js) (**Mới**) | Adapter poll đúng path `{baseUrl}/operations/{id}` |
| [open-sse/handlers/videoProviders/index.js](../open-sse/handlers/videoProviders/index.js) | Đăng ký adapter `kira` |

## 4. Trạng thái hiện tại

Chưa commit — toàn bộ thay đổi đang ở working tree, chờ người dùng review/test lại trên dashboard thật rồi mới commit. Đã `node --check` toàn bộ file `.js` thay đổi/tạo mới, không lỗi cú pháp. Đã verify logic bằng cách chạy thử với dữ liệu live thật (curl trực tiếp), nhưng **chưa test được end-to-end qua UI thật** (không có session/API key để gọi các route yêu cầu auth từ ngoài).

## 5. Việc còn mở (chưa làm, để quyết định sau)

- [ ] `packages/providers/registry/hhtechapi.js` dính **đúng bug `type: "chat"` y hệt mục 2.6** — 27 chỗ. Nhiều khả năng provider HHTechAPI cũng đang bị "không hiện model nào" giống Kira trước khi fix. Đang chờ người dùng xác nhận có muốn sửa luôn không (đã hỏi, chưa có câu trả lời tại thời điểm ghi log này).
- [ ] `packages/providers/pricing.js` cần cơ chế/nhắc nhở re-sync định kỳ — catalog Kira đổi khá nhanh (60 → 43 model chỉ trong ~2 tuần giữa 2 lần kiểm tra), discount % cũng đổi liên tục. Hiện tại vẫn là quy trình thủ công (curl + so sánh tay), chưa có gì tự động hóa.
- [ ] `POST /api/v1/responses` và nhóm endpoint `/user/*` của Kira — đã biết tồn tại, có ghi chú trong code, nhưng chưa implement (xem lý do ở mục 2.4).
- [ ] Chưa test thật trên UI dashboard sau khi fix bug `type: "chat"` — nên nhờ người dùng xác nhận "Available Models" đã hiện đủ 12 model chat của Kira chưa trước khi coi là đóng hẳn issue này.

## 6. Bài học rút ra

- **Không tin tool tóm tắt AI (WebFetch) cho dữ liệu cần chính xác tuyệt đối** (model id, path endpoint) — nó dùng model nhỏ để tóm tắt HTML/JSON và có thể diễn giải sai hoặc bỏ sót entry. Với API trả JSON, luôn ưu tiên `curl` trực tiếp rồi tự parse.
- **Đừng suy luận hành vi endpoint chỉ từ "giống provider khác"** — giả định ban đầu rằng video polling của Kira giống hệt khuôn mẫu xAI (`{base}/{id}`) là sai; phải probe HTTP thật (404 vs 401) mới lộ ra path thật khác (`{base}/operations/{id}`).
- **Một triệu chứng người dùng báo có thể là nhiều bug chồng lên nhau** — "Available Models không hiện" hóa ra là 2 bug hoàn toàn độc lập (thiếu filter `"openai"` + `type: "chat"` sai). Sửa bug đầu không đủ; phải hỏi lại "còn tái hiện không" sau mỗi fix thay vì coi là xong.
- **`type`/`kind` trong model entry của registry có ý nghĩa hành vi thật (ảnh hưởng hiển thị UI), không chỉ là metadata trang trí** — set sai giá trị (`"chat"` thay vì để trống/`"llm"`) là bug im lặng, không có lỗi console, không crash, chỉ đơn giản là model biến mất khỏi UI.
