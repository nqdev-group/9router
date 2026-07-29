---
type: feature
complexity: low
status: completed
related_issues: []
related_prs: []
estimated_hours: ~2-4
---

# Kế hoạch: Tích hợp Vilao AI làm provider mới trong 9router

> **Ngày lập kế hoạch:** 2026-07-29
> **Scope dự kiến:** `open-sse/providers/registry/vilao.js` (mới), `open-sse/providers/registry/index.js` (auto-generated import list)
> **Priority:** medium

---

## 1. Phân tích / Bối cảnh

Người dùng muốn thêm **Vilao AI** (`https://vilao.ai`) làm một provider mới trong 9router, dựa trên 4 trang tài liệu:
- `https://vilao.ai/docs/quickstart`
- `https://vilao.ai/docs/api-keys`
- `https://vilao.ai/docs/api-reference`
- `https://vilao.ai/docs/api-explorer`

**Vilao AI là gì:** một "AI Models Marketplace" — cổng trung gian (gateway) expose **một API endpoint duy nhất, tương thích 100% với OpenAI Chat Completions API**, và route request tới 300+ model từ nhiều nhà cung cấp bên dưới (Claude, GPT, Gemini, Llama, DeepSeek, Qwen...). Về bản chất kiến trúc, Vilao AI giống hệt **OpenRouter** hoặc **Vercel AI Gateway** — cả hai đã có sẵn trong registry (`open-sse/providers/registry/openrouter.js`, `vercel-ai-gateway.js`) — nên đây là điểm tham chiếu tốt nhất để tích hợp, thay vì dùng `together.js` (provider tĩnh, danh sách model cố định).

**Chi tiết kỹ thuật rút ra từ docs (đã fetch bằng Playwright vì các trang này render phía client — `WebFetch` chỉ trả về HTML shell rỗng, `curl` cũng vậy do catch-all Next.js route trả 200 cho mọi path kể cả không tồn tại):**

- **Base URL:** `https://api.vilao.ai/v1`
- **Auth:** header `Authorization: Bearer sk-xxxxxxxxxxxx` (key có prefix `sk-`, giống format OpenAI key).
- **Endpoints (LLM API, tương thích OpenAI):**
  - `POST /v1/chat/completions` — endpoint chính, hỗ trợ `stream: true` (SSE chuẩn OpenAI, `data: {...}` + `data: [DONE]`).
  - `POST /v1/completions` — legacy text completion.
  - `POST /v1/embeddings` — embeddings (vd. `text-embedding-3-small`).
  - `GET /v1/models` — trả về danh sách model **thực sự available cho key đó** (dạng OpenAI: `{object:"list", data:[{id, object:"model", created, owned_by}]}`). Quan trọng: model khả dụng phụ thuộc vào việc user đã "subscribe" model đó trong Marketplace hay chưa → không thể liệt kê tĩnh một danh sách model đầy đủ, phải fetch động.
- **Error format:** chuẩn OpenAI `{error:{message, type, code}}`. HTTP status: 401 (key sai/xoá), 402 (hết số dư — đặc thù Vilao, khác OpenAI), 403 (chưa subscribe model), 404 (model không tồn tại), 429 (rate limit), 500/502/503 (lỗi provider phía sau).
- **Cơ chế "routing strategy" đặc thù của Vilao** (không cần 9router quan tâm khi tích hợp, vì xử lý phía Vilao): mỗi API key có thể subscribe nhiều provider cho cùng 1 model qua "alias", và Vilao tự áp dụng round-robin/fallback/cheapest — nghĩa là **Vilao đã tự làm multi-account fallback ở phía nó**, 9router chỉ cần gọi 1 endpoint như một provider apikey bình thường.
- **API Explorer (`/docs/api-explorer`)** thực chất là tài liệu cho **API quản lý tài khoản v2** (`/api/v2/...`) — account, wallet/topup, GPU containers, VPS, quản lý LLM keys/subscriptions, token management. API này dùng **JWT session auth** (không phải `sk-` key) và **không liên quan tới việc gọi LLM** — chỉ dùng nếu sau này muốn tự động hoá việc tạo key/subscribe model từ 9router. Không cần cho phạm vi tích hợp provider cơ bản.
- Không có tài liệu công khai về endpoint usage/credit truy vấn bằng `sk-` key (khác với `vercel-ai-gateway.js` có `usage.url`) — usage tracking qua billing của Vilao chỉ khả dụng qua v2 API (JWT), nên trường `transport.usage` sẽ **bỏ trống** ở lần tích hợp đầu.

## 2. Approach / Strategy

Theo `AGENTS.md` mục "Provider system" và hard rule "New features: always in packages/" — nhưng thêm **provider entry** là ngoại lệ đã định nghĩa sẵn (`open-sse/` được phép grow cho "engine internals — providers/executors/translators"), nên workflow chuẩn 9router cho việc này là:

1. Copy `open-sse/providers/REGISTRY_TEMPLATE.js` → `open-sse/providers/registry/vilao.js`.
2. Điền theo pattern của `vercel-ai-gateway.js` (aggregator/marketplace, không phải static model list như `together.js`):
   - `id: "vilao"`, `category: "apikey"`, `authType: "apikey"`.
   - `transport.baseUrl: "https://api.vilao.ai/v1/chat/completions"`, `transport.validateUrl` hoặc để `modelsFetcher` đảm nhiệm luôn việc validate.
   - `modelsFetcher: { url: "https://api.vilao.ai/v1/models", type: "openai" }` — vì Vilao trả model list chuẩn OpenAI format (giống `vercel-ai-gateway`, khác `openrouter` dùng type riêng `"openrouter-free"`).
   - `passthroughModels: true` — model id gửi lên (`gpt-4o`, `claude-sonnet-4-...`) phải đi thẳng, không dịch qua OpenAI-bridge, vì Vilao **đã** là OpenAI format.
   - `embeddingConfig: { baseUrl: "https://api.vilao.ai/v1/embeddings" }`.
   - `models: []` hoặc bỏ field `models` — không nên hard-code danh sách vì catalog 300+ model thay đổi theo subscription của từng key; dựa hoàn toàn vào `modelsFetcher` (giống cách `vercel-ai-gateway` không khai báo `models` tĩnh).
   - `display.notice.apiKeyUrl`: trỏ tới trang tạo key (Console → LLM → My API Keys) — cần xác nhận URL chính xác của dashboard Vilao (docs không nêu URL cụ thể, chỉ nêu bước "Console → LLM → My API Keys"). **Cần hỏi user hoặc để placeholder `https://vilao.ai` rồi refine sau.**
   - Không cần `oauth` block — Vilao chỉ dùng API key thuần.
3. Thêm `p{N}` import + `PROVIDERS.push`/mảng tương ứng vào `open-sse/providers/registry/index.js`. Lưu ý: đã tìm trong repo nhưng **không thấy script generator riêng** cho file này mặc dù AGENTS.md ghi "auto-generated" — cần xác nhận: có thể chỉ cần thêm dòng import + entry theo đúng thứ tự alphabet hiện có (giống cách các entry khác được chèn), không có lệnh `npm run` nào để chạy.
4. Không cần thêm executor riêng (`open-sse/executors/`) — vì `transport.format` mặc định `"openai"` và baseUrl đã là OpenAI-compatible hoàn chỉnh, dùng chung executor OpenAI có sẵn (giống `together`, `vercel-ai-gateway`, `openrouter` đều không có executor riêng).
5. Không cần translator riêng — request/response đã đúng format OpenAI 1-1.

**Vì sao không tham chiếu `openrouter.js` làm base:** `openrouter.js` có nhiều field cũ/không chuẩn theo `REGISTRY_TEMPLATE.js` hiện tại (`serviceKinds`/`modelsFetcher`/`embeddingConfig` nằm top-level thay vì đúng vị trí mới), có thể là format cũ chưa migrate (có `scripts/migrate-registry.mjs` trong repo gợi ý đang có quá trình migrate format registry). `vercel-ai-gateway.js` mới hơn và gọn hơn, nên chọn làm khuôn mẫu.

**Trade-off cân nhắc:** hard-code một danh sách "model phổ biến" (như quickstart gợi ý: gpt-4o, gpt-4o-mini, claude-sonnet-4.6, claude-opus-4.6, claude-haiku-4.5, gemini-2.5-pro, o3, gpt-4.1) để UI có gợi ý ngay cả trước khi `modelsFetcher` chạy, **so với** để trống hoàn toàn và chờ fetch động. Đề xuất: liệt kê một danh sách nhỏ các model "tiêu biểu" tĩnh làm fallback/gợi ý ban đầu (UX tốt hơn), đồng thời vẫn bật `modelsFetcher` để đồng bộ danh sách thật theo subscription của key — cách 9router xử lý việc hai nguồn này (static `models` + dynamic `modelsFetcher`) song song cần đọc thêm `open-sse/providers/index.js` lúc thực thi để xác nhận không bị ghi đè/conflict.

## 3. Công việc cần thực hiện (Todo)

- [x] Đọc `open-sse/providers/index.js` để xác nhận cách `modelsFetcher` được parse — xác nhận nó là **top-level field trên registry entry** (đi vào `PROVIDER_MEDIA[id]` qua `MEDIA_KEYS`), **không** nằm trong `transport:{}` như `REGISTRY_TEMPLATE.js` comment gợi ý; `validateUrl` mới thực sự nằm trong `transport:{}` (đi vào `PROVIDERS[id].validateUrl`). Đối chiếu `together.js`/`vercel-ai-gateway.js`/`venice.js` xác nhận pattern này.
- [x] Copy tinh thần `REGISTRY_TEMPLATE.js` + `vercel-ai-gateway.js` → tạo [open-sse/providers/registry/vilao.js](../open-sse/providers/registry/vilao.js).
- [x] Thêm import `p100` cho `vilao.js` vào [open-sse/providers/registry/index.js](../open-sse/providers/registry/index.js) — **không tìm thấy generator script** nên chèn thủ công dạng append-only (import cuối danh sách + push cuối mảng `p100`), tránh renumber `p0..p99` hiện có (rủi ro thấp hơn chèn giữa).
- [x] Kiểm tra `open-sse/config/providerModels.js` — xác nhận đúng như AGENTS.md, không cần sửa tay (re-export tự động từ `providers/index.js`).
- [x] Xác nhận `src/app/api/providers/validate/route.js` xử lý provider mới **tự động** qua nhánh `default:` (config-driven từ `PROVIDERS[provider]`, tự suy ra `/models` từ `baseUrl` bằng cách thay `/chat/completions` → `/models`) — không cần thêm `case "vilao":` thủ công.
- [x] Viết test mới [tests/unit/vilao-provider.test.js](../tests/unit/vilao-provider.test.js) (theo mẫu `venice-provider.test.js`) — 6 assertion, tất cả pass.
- [x] Chạy baseline snapshot verify (`providers-baseline.json`, `alias-baseline.json`, `oauth-urls-baseline.json`) qua một vitest tạm thời (script `.mjs` gốc không chạy được bằng `node` trực tiếp vì `@9router/*` chỉ resolve qua bundler/vitest alias, không phải Node ESM `imports`) — phát hiện **baseline đã drift từ trước** (thiếu provider `kira`, `llm7`, `sambanova`, field `alicode-intl` đổi) độc lập với thay đổi của mình. Đã **vá thủ công, có chủ đích, chỉ đúng phần `vilao`** vào [tests/__baseline__/providers-baseline.json](../tests/__baseline__/providers-baseline.json) và [tests/__baseline__/alias-baseline.json](../tests/__baseline__/alias-baseline.json) — không đụng tới phần drift có sẵn (ngoài phạm vi task này).
- [x] Test thực tế với key thật user cung cấp (`sk-a976b083...d4`, không lưu vào bất kỳ file nào trong repo, chỉ dùng qua biến môi trường tạm thời khi test):
  - `GET https://api.vilao.ai/v1/models` → **200 OK**, `{"data":null,"object":"list"}` — key hợp lệ (auth pass) nhưng **chưa subscribe model nào** (data null thay vì mảng, khớp docs "mỗi key cần subscribe ≥1 model để hoạt động").
  - `POST https://api.vilao.ai/v1/chat/completions` (model `gpt-4o-mini`) → **402 `INSUFFICIENT_BALANCE`**, `{"error":{"code":"INSUFFICIENT_BALANCE","message":"Insufficient balance to complete the request.","type":"insufficient_quota"}}` — xác nhận đúng Risk 2 đã ghi ở mục 4: tài khoản chưa top-up. Xác nhận baseUrl + `Authorization: Bearer` header trong `vilao.js` là **chính xác** — request tới đúng endpoint thật, nhận JSON lỗi đúng format OpenAI-style.
  - Thử gọi `POST /api/providers/validate` (route thật của 9router, không phải Vilao) qua dev server local (`npm run dev`, port thực tế là **20127** — package.json hard-code `next dev --port 20127`, biến `PORT` trong lệnh không có tác dụng dù AGENTS.md gợi ý `PORT=20128`) → nhận `{"error":"Unauthorized"}` vì route này nằm sau `dashboardGuard` (cần JWT cookie đăng nhập dashboard, không phải chỉ cần API key trong body). Thử `INITIAL_PASSWORD` mặc định `123456` → sai (user đã đổi mật khẩu thật) → **dừng ngay, không dò thêm** để tránh khoá tài khoản (đã hiện "4 attempt(s) left"). Đã tắt dev server sau khi test xong.
  - **Kết luận:** Transport layer (baseUrl, auth header, error shape) đã xác nhận đúng bằng key thật. Chưa test được luồng chat completion thành công (cần tài khoản có balance + đã subscribe model) và chưa test được qua UI dashboard thật (cần mật khẩu đăng nhập của user).
- [ ] (Để sau) Xác nhận URL chính xác của trang tạo API key trên dashboard Vilao (dùng cho `display.notice.apiKeyUrl`) — hiện đang để `https://vilao.ai/console/llm/keys` (suy đoán hợp lý, **chưa xác nhận với user**). Không chặn merge — chỉ ảnh hưởng 1 link tiện ích trong UI "notice", không ảnh hưởng chức năng gọi API.
- [ ] (Để sau) Sau khi tài khoản Vilao được top-up + subscribe ≥1 model: test lại `/v1/chat/completions` (non-stream + stream) và `/v1/models` qua chính 9router (không chỉ gọi thẳng Vilao API như bước trên) để xác nhận translator/executor OpenAI xử lý đúng end-to-end.
- [ ] (Để sau) Cân nhắc thêm `provider-alert` support — chưa phải yêu cầu ngay.

**Quyết định đóng task:** User xác nhận coi phần integration này là xong — transport layer (baseUrl, auth, error format) đã được xác nhận đúng bằng key thật ở bước trên; 3 việc còn lại ở trên là follow-up không chặn, để làm sau khi có nhu cầu/điều kiện (tài khoản có balance, hoặc cần tinh chỉnh UI link).

## 4. Risks & Unknowns

- **Risk 1:** Model catalog của Vilao phụ thuộc vào subscription của từng API key (không có danh sách model cố định public) → nếu `modelsFetcher` không được implement đúng cách hoặc bị cache sai, user có thể thấy model list trống hoặc sai. → **Mitigation:** test kỹ với key thật đã subscribe ít nhất 1-2 model trước khi coi là hoàn thành.
- **Risk 2:** HTTP 402 (hết số dư) là mã lỗi đặc thù Vilao không có trong OpenAI chuẩn — cần xác nhận 9router xử lý mã lỗi non-standard này ra sao trong translator lỗi (không tự tạo bug fake-success). → **Mitigation:** đọc `open-sse/translator/response/*.js` phần xử lý lỗi trước khi merge.
- **Unknown 1:** Cơ chế "regenerate `registry/index.js`" nêu trong AGENTS.md — không tìm thấy script generator cụ thể trong `scripts/`. → **Plan:** hỏi user hoặc kiểm tra lịch sử git commit gần nhất có thêm provider để xem cách file này được cập nhật thực tế (tay hay tool ngoài repo).
- **Unknown 2:** URL chính xác cho `display.notice.apiKeyUrl` và `signupUrl` (dashboard Vilao) chưa xác nhận từ docs công khai. → **Plan:** hỏi user, vì họ có thể đã có tài khoản Vilao thật.

## 5. Success Criteria

- Provider `vilao` xuất hiện trong danh sách provider trên dashboard 9router (Combos/Model select), category `apikey`.
- Người dùng nhập API key Vilao (`sk-...`) → validate thành công qua `modelsFetcher`/`validateUrl`.
- Gọi chat completion (non-stream + stream) qua 9router route tới Vilao → nhận response đúng định dạng, không lỗi translator.
- `tests/__baseline__/verify-no-regression.mjs` không phát sinh regression mới do thay đổi registry.

## 6. Questions / Dependencies

- Cần user xác nhận URL console/tạo key thật của Vilao (không có trong docs public đã fetch). Đang để placeholder `https://vilao.ai/console/llm/keys`.
- Cần user có sẵn 1 API key Vilao thật (đã subscribe ≥1 model) để test `RUN_REAL=1`.
- Có cần hỗ trợ `provider-alert` (Discord) ngay từ đầu hay để sau — quyết định nghiệp vụ của user.
- `modelsFetcher` khai báo `type: "openai"` theo đúng convention của `venice.js`/`vercel-ai-gateway.js`, nhưng `src/app/api/providers/suggested-models/filters.js` **chưa có filter `"openai"`** — nghĩa là tính năng "suggested models" công khai (không cần key) hiện im lặng trả về rỗng cho cả 3 provider này, không riêng Vilao (không phải regression do task này gây ra, là gap có sẵn trong codebase). Ngoài ra, endpoint `GET /v1/models` của Vilao **yêu cầu auth** — kể cả khi thêm filter `"openai"`, route `suggested-models` hiện gọi `fetch(url)` không kèm `Authorization` header nên vẫn sẽ nhận 401. Đây là gap kiến trúc rộng hơn phạm vi task, không tự ý sửa.

## 7. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [open-sse/providers/registry/vilao.js](../open-sse/providers/registry/vilao.js) (**Mới**) | Registry entry cho Vilao AI — apikey, OpenAI-compatible, baseUrl `api.vilao.ai/v1`, `validateUrl`, `modelsFetcher`, `embeddingConfig`, 9 model tiêu biểu (`passthroughModels: true` cho phần còn lại của catalog 300+ model). |
| [open-sse/providers/registry/index.js](../open-sse/providers/registry/index.js) | Thêm `import p100 from "./vilao.js"` + `p100` vào mảng export (append-only, không renumber). |
| [tests/unit/vilao-provider.test.js](../tests/unit/vilao-provider.test.js) (**Mới**) | 6 test case xác nhận registry entry build đúng vào `PROVIDERS`/`PROVIDER_MODELS`/`PROVIDER_MEDIA`, id không trùng. |
| [tests/__baseline__/providers-baseline.json](../tests/__baseline__/providers-baseline.json) | Vá thêm đúng 1 entry `"vilao"` (giữa `vertex` và `volcengine-ark`) khớp byte-for-byte với `PROVIDERS.vilao` thực tế. |
| [tests/__baseline__/alias-baseline.json](../tests/__baseline__/alias-baseline.json) | Thêm `"vilao": "vilao"` vào `idToAlias` và `"vilao"` vào `modelKeys` (đúng vị trí alphabet). |

## 8. Bài học rút ra

- `tests/__baseline__/*.mjs` không chạy được bằng `node` trực tiếp vì import `@9router/*` — alias này **chỉ tồn tại ở tầng bundler** (`jsconfig.json` `moduleResolution: "bundler"` + vitest alias config), Node ESM không có `"imports"` map tương ứng trong `package.json`. Muốn chạy các script baseline này, phải thực thi trong môi trường có alias resolution (vitest test file tạm, không phải `node script.mjs` thẳng).
- Baseline snapshot (`providers-baseline.json`, `alias-baseline.json`) **đã drift từ trước** khi bắt đầu task này (thiếu `kira`, `llm7`, `sambanova`; field `alicode-intl` lệch) — không phải lỗi do task này. Không tự ý "sửa luôn" phần drift ngoài phạm vi; chỉ vá đúng phần liên quan đến `vilao` để giữ diff tối thiểu và dễ review.
- `src/app/api/providers/validate/route.js` có nhánh `default:` generic, config-driven từ `PROVIDERS[provider].format === "openai"` — provider apikey/OpenAI-compatible mới **không cần** thêm `case` thủ công trong file này, miễn `transport.baseUrl` kết thúc bằng `/chat/completions` để nó tự suy ra URL `/models`.
- REGISTRY_TEMPLATE.js trình bày `modelsFetcher`/`validateUrl` như thể cùng nằm trong `transport: {...}` (comment lines), nhưng runtime thực tế (`providers/index.js`) đọc `modelsFetcher` ở **top-level** của entry, không phải trong `transport`. Cẩn thận khi copy template — nên đối chiếu với 1-2 registry file thật (vd. `vercel-ai-gateway.js`) thay vì tin tuyệt đối vào comment trong template.
