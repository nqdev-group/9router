---
type: feature
complexity: low
status: planning
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

- [ ] Xác nhận URL chính xác của trang tạo API key trên dashboard Vilao (dùng cho `display.notice.apiKeyUrl`) — hỏi user hoặc suy ra từ `https://vilao.ai` + đường dẫn console thực tế.
- [ ] Đọc `open-sse/providers/index.js` để xác nhận cách `modelsFetcher.type: "openai"` được parse, và cách `models` tĩnh + `modelsFetcher` động phối hợp (ưu tiên cái nào, có merge không).
- [ ] Copy `REGISTRY_TEMPLATE.js` → `open-sse/providers/registry/vilao.js`, điền theo strategy ở mục 2.
- [ ] Thêm import cho `vilao.js` vào `open-sse/providers/registry/index.js` đúng vị trí alphabet.
- [ ] Kiểm tra `open-sse/config/providerModels.js` xem có cần thêm gì thủ công không (theo AGENTS.md, file này re-export `PROVIDER_MODELS` từ `providers/index.js` — có thể không cần sửa tay).
- [ ] Chạy `tests/__baseline__/verify-no-regression.mjs` và `verify-*.mjs` liên quan tới provider registry để đảm bảo không phá baseline snapshot hiện có (theo AGENTS.md mục Tests).
- [ ] Test thực tế: tạo 1 API key Vilao thật (`RUN_REAL=1`), gọi thử `/v1/chat/completions` không-stream và có-stream qua 9router để xác nhận response format khớp.
- [ ] Test `GET /v1/models` qua `modelsFetcher` để xác nhận danh sách model động hiển thị đúng trên dashboard 9router (trang combos/model select).
- [ ] Cân nhắc thêm `provider-alert` support (Discord alert khi account down) nếu Vilao dễ bị lỗi 402 (hết số dư) — kiểm tra `packages/provider-alert/` có tự động support mọi provider `apikey` hay cần khai báo riêng.

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

- Cần user xác nhận URL console/tạo key thật của Vilao (không có trong docs public đã fetch).
- Cần user có sẵn 1 API key Vilao thật (đã subscribe ≥1 model) để test `RUN_REAL=1`.
- Có cần hỗ trợ `provider-alert` (Discord) ngay từ đầu hay để sau — quyết định nghiệp vụ của user.
