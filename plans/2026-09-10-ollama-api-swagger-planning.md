---
type: feature
complexity: high
status: completed
related_issues: [QUYIT-727, QUYIT-728, QUYIT-729, QUYIT-730]
related_prs: []
estimated_hours: ~272-320 (34-40 person-days) dự tính ban đầu; thực tế thấp hơn đáng kể vì Phase 4 chọn tier nhẹ (~6-8d thay vì 15d) và nhiều phần tái dùng code có sẵn nhiều hơn dự tính (xem mục 8-11)
---

# Kế hoạch: Bộ API chat chuẩn Ollama + Swagger docs (public + internal)

> **Ngày lập kế hoạch:** 2026-09-10
> **Scope dự kiến:** `src/app/api/v1/ollama/**` (mới), `open-sse/utils/ollamaTransform.js`, `open-sse/config/ollamaModels.js`, hạ tầng Swagger mới (`docs/openapi/*`, 1 trang public + 1 trang dashboard mới)
> **Priority:** high

---

## 1. Phân tích / Bối cảnh

Yêu cầu khách hàng: (1) nghiên cứu & phát triển thêm bộ API chat theo chuẩn Ollama (tham khảo `https://docs.ollama.com/api/introduction`), (2) bổ sung tài liệu API dạng Swagger.

**Hiện trạng thực tế đã kiểm tra trong code** (không đoán — đã đọc trực tiếp):
- `docs/guide/04-api-reference.md` ghi `/v1/api/chat` là "Ollama-compatible", nhưng path này **sai chuẩn** — client Ollama thật (ollama-js, LangChain `ChatOllama`, Continue.dev...) gọi thẳng `/api/chat` ở root, không có tiền tố `/v1`.
- [open-sse/utils/ollamaTransform.js](../open-sse/utils/ollamaTransform.js) luôn trả NDJSON dù client gửi `"stream": false` — sai theo spec (non-stream phải trả 1 JSON object duy nhất).
- [open-sse/config/ollamaModels.js](../open-sse/config/ollamaModels.js) — `/api/tags` trả 2 model giả cứng (`llama3.2`, `qwen2.5`), không phản ánh catalog thật hàng trăm model của 9Router.
- `/api/version` đã bị chiếm bởi tính năng check-update của dashboard (shape khác hoàn toàn: `{currentVersion, latestVersion, hasUpdate}`).
- Không có `POST /api/generate`, `POST /api/embed` (dạng Ollama), `GET /api/ps`, `POST /api/show` nào cả.
- **Không có Swagger/OpenAPI nào trong repo** — đã grep toàn bộ `package.json` + source, xác nhận 0 package (`swagger-*`, `redoc`, `next-swagger-doc`...), 0 spec file, 0 route UI. Phải dựng mới từ đầu, không phải "bổ sung" vào cái có sẵn.

Đã fetch spec chính thức `docs.ollama.com/openapi.yaml` (không đoán schema) để lấy đúng danh sách endpoint + request/response fields cho toàn bộ so sánh trên.

## 2. Approach / Strategy

### 2.1 Path convention — quyết định đã chốt với khách hàng

Mount toàn bộ API dưới `/api/v1/ollama/*` (file path Next.js), **giữ nguyên path gốc Ollama phía sau** (không rút gọn). **Đã verify bằng curl (2026-09-10):** repo có rewrite sẵn `/v1/:path*` → `/api/v1/:path*` (`next.config.mjs`), nên path public/client-facing thật sự **ngắn hơn** file path:

```
/v1/ollama/api/chat        (file: src/app/api/v1/ollama/api/chat/route.js)
/v1/ollama/api/generate
/v1/ollama/api/embed
/v1/ollama/api/tags
/v1/ollama/api/ps
/v1/ollama/api/show
/v1/ollama/api/version
```

**Lý do giữ `/api/` lặp lại:** hầu hết SDK/CLI nói chuẩn Ollama cho phép override base URL (biến `OLLAMA_HOST` hoặc tương đương) nhưng tự nội bộ append `/api/chat`, `/api/generate`... Set `OLLAMA_HOST=https://<host>/v1/ollama` → client tự ghép ra đúng `/v1/ollama/api/chat` → **drop-in compatible thật**, không chỉ giống trên danh nghĩa. Cách này giải quyết luôn xung đột với `/api/version` cũ (namespace khác hoàn toàn, không cần đổi route cũ).

### 2.2 Ranh giới rõ với hướng ngược lại (đã có sẵn, KHÔNG đụng)

`open-sse/executors/ollama-local.js`, `open-sse/providers/registry/ollama*.js`, `open-sse/translator/request/openai-to-ollama.js`/`response/ollama-to-openai.js` là để **9Router gọi RA một Ollama server làm provider** (hướng ngược). Việc này là 9Router **TRỞ THÀNH** một Ollama-compatible server cho client bên ngoài gọi VÀO — hai concern độc lập, không tái cấu trúc code cũ.

### 2.3 Swagger — tách 2 spec vì lý do bảo mật

Quyết định ban đầu là "public toàn bộ" nhưng phát sinh mâu thuẫn: document toàn bộ ~150 route (kể cả route quản trị nội bộ: auth/oauth/settings/providers credentials...) mà lại public không login sẽ lộ attack surface nội bộ cho người chưa xác thực. Đã chốt lại với khách hàng phương án an toàn:
- **Spec public (không login):** chỉ Ollama API mới + các route `/v1/*` dành cho end-user tích hợp (chat/completions, messages, responses, models, embeddings, images, audio, web/fetch, search, mcp — ~41 route).
- **Spec nội bộ (sau login dashboard):** ~110-120 route quản trị còn lại, trang mới trong dashboard, tái dùng component Swagger UI đã build ở spec public.
- Cả 2 dùng Swagger UI (không Redoc) vì cần nút "Authorize" nhập API key (Bearer) để Try-it-out thật — Swagger UI hỗ trợ native qua `securitySchemes`, không cần tự chế UX riêng.

### 2.4 Các phương án đã xem xét và loại

- **Redoc thay Swagger UI:** an toàn hơn (read-only, không thể vô tình gọi API thật) nhưng khách hàng cần Try-it-out thật → chọn Swagger UI.
- **1 spec public duy nhất cho toàn bộ 150 route:** loại vì lý do bảo mật (mục 2.3).
- **Giữ path Ollama đúng chuẩn ở root `/api/chat`:** loại vì xung đột `/api/version` hiện có; đổi tên route cũ rủi ro ảnh hưởng UI check-update đang chạy.

## 3. Công việc cần thực hiện (Todo)

### Phase 1 — Ollama Core ([QUYIT-727](https://nhquydev.atlassian.net/browse/QUYIT-727), ~7.75d) — ✅ Đã hoàn thành 2026-09-10
- [x] M1: Convention mount `/api/v1/ollama/*` — 4 route Next.js tạo tại [src/app/api/v1/ollama/api/{chat,tags,ps,version}/route.js](../src/app/api/v1/ollama/api/chat/route.js); doc trong [AGENTS.md](../AGENTS.md) (bảng packages/), [packages/AGENTS.md](../packages/AGENTS.md), [src/app/api/AGENTS.md](../src/app/api/AGENTS.md).
- [x] M2: `POST /v1/ollama/api/chat` — [packages/ollama-compat/requestTranslate.js](../packages/ollama-compat/requestTranslate.js) + [responseTranslate.js](../packages/ollama-compat/responseTranslate.js). Non-stream trả 1 JSON object (không NDJSON); stream vẫn NDJSON qua `TransformStream` viết lại (không tái dùng `ollamaTransform.js` cũ — file cũ giữ nguyên cho `/v1/api/chat` legacy). Có `total_duration`/`load_duration`/`prompt_eval_count`/`eval_count`/`eval_duration`/`done_reason`; `tool_calls[].function.arguments` là object; `images` (base64) map sang OpenAI multimodal `content` array.
- [x] M4: `GET /v1/ollama/api/tags` — [tags/route.js](../src/app/api/v1/ollama/api/tags/route.js) tái dùng `buildModelsList()` export từ `v1/models/route.js` (catalog thật, đã verify bằng curl trả về đúng model kira/tokenrouter/alitp-intl... thay vì 2 model giả cứng cũ). `size`/`digest`/`quantization_level` dùng placeholder rõ ràng ([modelCatalog.js](../packages/ollama-compat/modelCatalog.js)).
- [x] M6: `GET /v1/ollama/api/ps` → `{ models: [] }` — [psResponse.js](../packages/ollama-compat/psResponse.js), verify bằng curl.
- [x] M8: `GET /v1/ollama/api/version` → `{ version }` — [versionInfo.js](../packages/ollama-compat/versionInfo.js), verify bằng curl trả `{"version":"0.5.69"}`, không đụng `/api/version` cũ.
- [x] Test: 14 unit test mới ([tests/unit/ollama-compat.test.js](../tests/unit/ollama-compat.test.js)) — pass 14/14. Smoke-test qua curl thật (không phải chỉ tự đọc lại output nội bộ) tới dev server đang chạy — xem mục 7.

### Phase 2 — Ollama Extended ([QUYIT-728](https://nhquydev.atlassian.net/browse/QUYIT-728), ~5d, phụ thuộc Phase 1) — ✅ Đã hoàn thành 2026-09-10
- [x] M3: `POST /v1/ollama/api/generate` — [generate/route.js](../src/app/api/v1/ollama/api/generate/route.js) dựng `messages[]` từ `system`+`prompt` (`suffix` nối thêm best-effort, `raw` là no-op), tái dùng `handleChat` giống `/api/chat`.
- [x] M5: `POST /v1/ollama/api/embed` — [embed/route.js](../src/app/api/v1/ollama/api/embed/route.js) adapter mỏng qua `handleEmbeddings`, dịch `{data[].embedding}` → `{embeddings: [[...]]}`.
- [x] M7: `POST /v1/ollama/api/show` — [show/route.js](../src/app/api/v1/ollama/api/show/route.js): thay vì tự gọi `capabilities.js`, tái dùng thẳng kết quả `buildModelsList()` (đã có field `capabilities` sẵn từ `/v1/models`) — đơn giản hơn dự tính ban đầu. `parameters`/`license`/`template` trả rỗng có ghi chú rõ trong code.
- [x] M9: `create`/`copy`/`pull`/`push`/`delete` → 5 route stub `501`, message rõ lý do ([notImplemented.js](../packages/ollama-compat/notImplemented.js)). `delete` dùng method `DELETE` (đúng chuẩn Ollama), 4 route còn lại dùng `POST`.

### Phase 3 — Swagger PUBLIC ([QUYIT-729](https://nhquydev.atlassian.net/browse/QUYIT-729), ~2.75d, phụ thuộc Phase 1+2) — ✅ Đã hoàn thành 2026-09-10
- [x] M10a: Viết OpenAPI 3.1 spec — thực tế 12 route Ollama (không phải 13, xem mục 10) + 20 route `/v1/*` + 3 route `/v1beta/*` (Gemini) = 35 path, tại [public/openapi/ollama-public.json](../public/openapi/ollama-public.json).
- [x] Wire Swagger UI qua CDN `swagger-ui-dist@5` (không thêm npm dependency) vào route public mới [src/app/docs/api/page.js](../src/app/docs/api/page.js), verify KHÔNG cần login (curl trả 200 trực tiếp, không redirect `/login`).
- [x] Cấu hình `securitySchemes.bearerAuth` (type `http`/scheme `bearer`) trong spec cho nút Authorize Try-it-out nhập API key thật — không load `swagger-ui-standalone-preset.js` (tránh lộ thanh nhập URL spec tuỳ ý, chỉ dùng đúng spec cố định của 9Router).

### Phase 4 — Swagger INTERNAL ([QUYIT-730](https://nhquydev.atlassian.net/browse/QUYIT-730), ~6-8d sau khi chốt độ sâu nhẹ) — ✅ Đã hoàn thành 2026-09-10
- [x] **Đã chốt với khách hàng (2026-09-10):** độ sâu "path + summary + auth requirement" (tier nhẹ, ~6-8d) — không viết request/response schema chi tiết từng field.
- [x] M10b: Document 152 route quản trị (thực tế nhiều hơn ước tính ~110-120, vì đếm hết mọi `route.js` ngoài `v1/`/`v1beta/`, kể cả các route rất nhỏ như `pxpipe/*`, `tunnel/*`) — sinh tự động bằng [scripts/generate-internal-openapi.mjs](../scripts/generate-internal-openapi.mjs), không viết tay 152 entry.
- [x] Trang mới trong dashboard [src/app/(dashboard)/dashboard/api-docs/page.js](<../src/app/(dashboard)/dashboard/api-docs/page.js>) (yêu cầu login — verify bằng curl: bị redirect `/login` khi chưa auth), thêm sidebar entry vào nhóm `systemItems` (không phải `compressionContextItems` — nhóm đó dành riêng cho tính năng tối ưu token, không phù hợp với API docs).
- [x] Tái dùng component Swagger UI từ Phase 3 — đã refactor thành `packages/components/swagger/SwaggerUIEmbed.js` dùng chung cho cả trang public (`/docs/api`) và trang dashboard mới, thay vì copy-paste logic CDN loading.

## 4. Risks & Unknowns

- **Risk 1 (R4):** Chưa có conformance test chuẩn Ollama chính thức → phải tự smoke-test bằng client thật thay vì chỉ test 9Router tự đọc lại output của chính nó. → **Mitigation:** bắt buộc bước smoke-test trong Phase 1 trước khi coi module M2 là "done".
- **Risk 2 (R2):** Field giả (`size`/`digest`/`quantization_level`) trong `/api/tags`, `/api/show` cho model API-based có thể đánh lừa tool client dựa vào field đó ra quyết định sai (vd. check dung lượng đĩa). → **Mitigation:** dùng placeholder rõ ràng (không bịa số "giống thật"), ghi chú giới hạn trong doc.
- **Risk 3:** M10b (Phase 4) chiếm hơn 1/3 tổng effort (15/37 person-days) — rủi ro trễ nếu gộp chung timeline với Phase 1-3. → **Mitigation:** đã tách issue riêng ([QUYIT-730](https://nhquydev.atlassian.net/browse/QUYIT-730)), đề xuất sprint/timeline riêng, không block release Phase 1-3.
- **Unknown 1 (R7):** Độ sâu tài liệu Phase 4 chưa chốt (full schema vs path+summary) → chênh effort ~2x (15d vs 6-8d). → **Plan:** quyết định trước khi bắt đầu Phase 4, sau khi Phase 1-3 đã release và có phản hồi thực tế về việc ai dùng trang internal docs này nhiều tới đâu.

## 5. Success Criteria

- 1 client Ollama thật (vd `ollama-js`, hoặc LangChain `ChatOllama` set `baseUrl` tới `/api/v1/ollama`) gọi được `/api/chat` và `/api/tags` thành công, nhận đúng shape response theo spec chính thức (không chỉ 9Router tự test).
- `/api/tags` trả catalog model thật của 9Router (không còn 2 model giả cứng).
- Trang Swagger public: mở không cần login, Try-it-out gọi thành công với API key thật, KHÔNG hiển thị bất kỳ route quản trị nội bộ nào.
- Trang Swagger internal: chỉ truy cập được sau khi login dashboard, hiển thị đầy đủ ~110-120 route quản trị.
- Toàn bộ 5 route CRUD model cục bộ (`create/copy/pull/push/delete`) trả `501` rõ nghĩa, không silent-fail hay giả lập thành công.

## 6. Questions / Dependencies (đã trả lời hết)

Đã hỏi và chốt với khách hàng (2026-09-10):
1. ✅ Phạm vi: toàn bộ Ollama API surface (không chỉ chat).
2. ✅ Path: `/api/v1/ollama/*`.
3. ✅ `/api/ps` trả rỗng `[]` — chấp nhận.
4. ✅ `create/copy/pull/push/delete` — xác nhận out-of-scope.
5. ✅ Swagger UI (không Redoc) + Try-it-out nhập API key; document toàn bộ (không chỉ Ollama API).
6. ✅ Đã resolve mâu thuẫn public/internal: spec public chỉ Ollama+`/v1/*` client API; route quản trị tách riêng sau login.
7. ✅ Độ sâu tài liệu Phase 4: "path + summary + auth requirement" (tier nhẹ, ~6-8d) — không cần full schema.

**Còn mở:** độ sâu tài liệu Phase 4 (xem Risk/Unknown 1 ở mục 4) — quyết định trước khi bắt đầu Phase 4.

## 7. Jira

Đã tạo 4 issue dưới Epic [QUYIT-563](https://nhquydev.atlassian.net/browse/QUYIT-563), Labels=`NQDEV`, Sprint=`QUYIT Sprint 34` (active, id 145), Fix version=`Tháng 9/2026` (id 10050):

| Issue | Phase | Original Estimate | Status |
|---|---|---|---|
| [QUYIT-727](https://nhquydev.atlassian.net/browse/QUYIT-727) | Phase 1 — Ollama Core | 7d 6h | ✅ Done |
| [QUYIT-728](https://nhquydev.atlassian.net/browse/QUYIT-728) | Phase 2 — Ollama Extended | 5d | ✅ Done |
| [QUYIT-729](https://nhquydev.atlassian.net/browse/QUYIT-729) | Phase 3 — Swagger Public | 2d 6h | ✅ Done |
| [QUYIT-730](https://nhquydev.atlassian.net/browse/QUYIT-730) | Phase 4 — Swagger Internal | 15d ước tính ban đầu (thực tế ~6-8d sau khi chốt tier nhẹ) | ✅ Done |

## 8. Kết quả thực thi Phase 1 (2026-09-10)

### Files đã tạo

| File | Nội dung |
|---|---|
| [packages/ollama-compat/requestTranslate.js](../packages/ollama-compat/requestTranslate.js) | Ollama chat request → OpenAI shape (images→content parts, options→flat fields, format→response_format, stream_options.include_usage) |
| [packages/ollama-compat/responseTranslate.js](../packages/ollama-compat/responseTranslate.js) | OpenAI JSON (non-stream) / SSE (stream) → Ollama JSON / NDJSON, timing fields (ns), tool_calls arguments parse thành object, fallback ước lượng token (~4 chars/token) khi upstream không trả usage trong chunk cuối |
| [packages/ollama-compat/modelCatalog.js](../packages/ollama-compat/modelCatalog.js) | `/api/tags` response builder — pure function, nhận `models[]` đã fetch sẵn (không tự import `buildModelsList`, tránh packages/→src/ dependency theo packages/AGENTS.md pitfall) |
| [packages/ollama-compat/psResponse.js](../packages/ollama-compat/psResponse.js) | `{models:[]}` |
| [packages/ollama-compat/versionInfo.js](../packages/ollama-compat/versionInfo.js) | `{version}` từ root `package.json` |
| [packages/ollama-compat/index.js](../packages/ollama-compat/index.js) | Barrel export |
| [src/app/api/v1/ollama/api/chat/route.js](../src/app/api/v1/ollama/api/chat/route.js) | Thin route — build `Request` mới với body đã translate (body chỉ đọc được 1 lần), gọi `handleChat()`, rẽ nhánh stream/non-stream |
| [src/app/api/v1/ollama/api/tags/route.js](../src/app/api/v1/ollama/api/tags/route.js) | Thin route — gọi `buildModelsList()` (export từ `v1/models/route.js`) + `buildOllamaTagsResponse()` |
| [src/app/api/v1/ollama/api/ps/route.js](../src/app/api/v1/ollama/api/ps/route.js), [.../version/route.js](../src/app/api/v1/ollama/api/version/route.js) | Thin route, trivial |
| [tests/unit/ollama-compat.test.js](../tests/unit/ollama-compat.test.js) | 14 test case: request translate (5), non-stream response (2), streaming NDJSON transform (3, gồm usage thật + fallback estimate + tool_calls accumulate), model catalog/ps/version (4) |

### Files đã sửa (doc only, không đụng logic)

- [AGENTS.md](../AGENTS.md) — thêm dòng `ollama-compat/` vào bảng packages/.
- [packages/AGENTS.md](../packages/AGENTS.md) — thêm mục `ollama-compat/` vào Directory map, ghi rõ lý do `modelCatalog.js` không tự import `buildModelsList`.
- [src/app/api/AGENTS.md](../src/app/api/AGENTS.md) — thêm mục `v1/ollama/api/` vào Directory map, ghi rõ lý do mount prefix và ranh giới với route cũ.
- [docs/guide/04-api-reference.md](../docs/guide/04-api-reference.md) — sửa dòng ghi sai `/v1/api/chat` là "Ollama-compatible", thêm dòng đúng cho endpoint mới, giữ dòng cũ với chú thích "legacy".

### Phát hiện quan trọng lúc thực thi (khác với dự tính ban đầu trong mục 2.1)

Repo đã có sẵn rewrite `/v1/:path*` → `/api/v1/:path*` (`next.config.mjs`). Nghĩa là path public/client-facing thật là `/v1/ollama/api/chat` (ngắn hơn), không phải `/api/v1/ollama/api/chat` như viết ban đầu ở mục 2.1 — đã verify bằng curl và sửa lại mục 2.1 cho khớp. Client set `OLLAMA_HOST=https://<host>/v1/ollama` là đúng, không cần thêm `/api` ở giữa.

Ngoài ra, `src/sse/handlers/chat.js` → `open-sse/handlers/chatCore.js` đã có sẵn nhánh non-streaming hoàn chỉnh (`stream = body.stream !== false`, trả JSON `chat.completion` thật với `usage` đầy đủ) — không cần tự viết logic buffer-SSE-thành-JSON như dự tính, chỉ cần forward đúng `stream:false` trong body dịch sang OpenAI shape và đọc JSON response bình thường. Điều này làm M2 đơn giản hơn ước tính ban đầu.

### Verification

- **Unit test:** `cd tests && npx vitest run --config ./vitest.config.js ollama-compat.test.js` → 14/14 pass.
- **Smoke-test qua dev server thật đang chạy** (không phải giả lập nội bộ):
  - `curl /v1/ollama/api/tags` → trả đúng danh sách model thật (kira/*, tokenrouter/*, alitp-intl/*...), không còn 2 model giả cứng.
  - `curl /v1/ollama/api/version` → `{"version":"0.5.69"}`.
  - `curl /v1/ollama/api/ps` → `{"models":[]}`.
  - `curl -X POST /v1/ollama/api/chat` (không kèm API key) → `401 {"error":{"message":"Missing API key",...}}` — đúng hành vi (chạm tới đúng auth gate của `handleChat`, không crash, không lộ stack trace).
- **Giới hạn đã biết:** KHÔNG verify được đường thành công thật (chat completion trả lời từ 1 model thật) vì không có API key hợp lệ trong môi trường này (không có quyền đăng nhập dashboard để tạo key, và không muốn thử mật khẩu default nhiều lần để tránh lockout — cùng giới hạn đã ghi nhận ở các plan trước). Cũng chưa test bằng 1 client Ollama SDK thật (`ollama-js`) — chỉ test bằng curl tay. **Đây là việc còn để mở, người dùng cần tự verify sau khi có API key thật.**
- Route cũ `/v1/api/chat` (+ `open-sse/utils/ollamaTransform.js`, `open-sse/config/ollamaModels.js`) và `/api/version` (app-update-check) — **không đụng, không sửa, không xoá**, đúng theo quyết định ở mục 2.1/2.4.

## 9. Kết quả thực thi Phase 2 (2026-09-10)

### Files đã tạo

| File | Nội dung |
|---|---|
| [packages/ollama-compat/generateTranslate.js](../packages/ollama-compat/generateTranslate.js) | OpenAI JSON/SSE → Ollama `/api/generate` response (`response` field thay `message.content`, không có tool_calls) |
| [packages/ollama-compat/embedTranslate.js](../packages/ollama-compat/embedTranslate.js) | OpenAI embeddings JSON → Ollama `{embeddings:[[...]]}` |
| [packages/ollama-compat/showResponse.js](../packages/ollama-compat/showResponse.js) | `/api/show` response builder — nhận thẳng 1 model entry từ `buildModelsList()`, map `capabilities` camelCase (`vision`/`tools`) sang array string Ollama (`["completion","vision","tools"]`) |
| [packages/ollama-compat/notImplemented.js](../packages/ollama-compat/notImplemented.js) | Message 501 chung cho 5 route CRUD model cục bộ |
| [src/app/api/v1/ollama/api/generate/route.js](../src/app/api/v1/ollama/api/generate/route.js) | Thin route, giống cấu trúc `chat/route.js` |
| [src/app/api/v1/ollama/api/embed/route.js](../src/app/api/v1/ollama/api/embed/route.js) | Thin route, wrap `handleEmbeddings` |
| [src/app/api/v1/ollama/api/show/route.js](../src/app/api/v1/ollama/api/show/route.js) | Thin route, tìm model trong `buildModelsList()` theo id, 404 nếu không thấy |
| [src/app/api/v1/ollama/api/{create,copy,pull,push}/route.js](../src/app/api/v1/ollama/api/create/route.js) | 4 route stub `POST` → 501 |
| [src/app/api/v1/ollama/api/delete/route.js](../src/app/api/v1/ollama/api/delete/route.js) | Stub `DELETE` (đúng method theo spec Ollama, không phải `POST`) → 501 |
| [tests/unit/ollama-compat-phase2.test.js](../tests/unit/ollama-compat-phase2.test.js) | 11 test case: generate request/response (4), embed request/response (3), show (2), not-implemented message (1), streaming NDJSON (1) |

### Files đã sửa (doc + barrel, không đổi hành vi cũ)

- [packages/ollama-compat/requestTranslate.js](../packages/ollama-compat/requestTranslate.js) — refactor nhỏ (tách `mapOllamaFormatToResponseFormat` dùng chung), thêm `ollamaGenerateRequestToOpenAI`/`ollamaEmbedRequestToOpenAI`. Hàm cũ `ollamaChatRequestToOpenAI` không đổi hành vi (test Phase 1 vẫn pass nguyên).
- [packages/ollama-compat/index.js](../packages/ollama-compat/index.js) — barrel thêm 6 export mới.
- [packages/AGENTS.md](../packages/AGENTS.md), [src/app/api/AGENTS.md](../src/app/api/AGENTS.md) — cập nhật mục `ollama-compat/`/`v1/ollama/api/` cho khớp Phase 2.

### Phát hiện lúc thực thi (khác dự tính ban đầu ở mục 3)

- M7 dự tính "tái dùng `open-sse/providers/capabilities.js`" trực tiếp — thực tế đơn giản hơn: `buildModelsList()` (đã dùng lại từ Phase 1 cho `/api/tags`) **đã tự gắn sẵn field `capabilities`** vào mỗi model entry khi tính được (xem `src/app/api/v1/models/route.js` dòng gắn `model.capabilities = caps`), nên `/api/show` chỉ cần tìm entry theo id và map field có sẵn — không cần tự gọi `getCapabilitiesForModel`/`capabilitiesFromServiceKind` thêm lần nữa.
- 5 route stub (`create/copy/pull/push/delete`) **không đi qua `requireApiKey` gate** như các route khác (chúng không gọi `handleChat`/`handleEmbeddings`, chỉ trả tĩnh 501) — chấp nhận được vì không có dữ liệu nhạy cảm lộ ra, nhưng đã ghi rõ điểm không đồng nhất này vào `src/app/api/AGENTS.md` để phiên sau biết nếu cần siết lại.

### Verification

- **Unit test:** `cd tests && npx vitest run --config ./vitest.config.js ollama-compat` → **25/25 pass** (14 Phase 1 + 11 Phase 2 mới, không có regression).
- **Smoke-test qua dev server thật đang chạy:**
  - `POST /v1/ollama/api/show {"model":"kira/kira-mini-1.0"}` → 200, `capabilities:["completion"]` (model này chưa có capability data trong catalog — đúng, không bịa).
  - `POST /v1/ollama/api/show {"model":"nope/does-not-exist"}` → 404 `{"error":"model 'nope/does-not-exist' not found"}`.
  - `POST /v1/ollama/api/generate`, `POST /v1/ollama/api/embed` (không kèm API key) → 401 `Missing API key` — đúng, chạm tới đúng auth gate, không crash.
  - `POST /v1/ollama/api/pull`, `DELETE /v1/ollama/api/delete` → 501 với message rõ lý do.
- **Giới hạn còn mở (giống Phase 1):** chưa verify được đường thành công thật của `/generate`/`/embed` (cần API key hợp lệ) và chưa test bằng client Ollama SDK thật — chỉ curl tay.

## 10. Kết quả thực thi Phase 3 (2026-09-10)

### Files đã tạo

| File | Nội dung |
|---|---|
| [public/openapi/ollama-public.json](../public/openapi/ollama-public.json) | OpenAPI 3.1 spec, 35 path: 12 route Ollama (chat/generate/embed/tags/ps/show/version + 5 stub) + 20 route `/v1/*` client-facing (chat/completions, messages, messages/count_tokens, responses, responses/compact, models×3, embeddings, images/generations, audio×3, videos×4, web/fetch, search, mcp) + 3 route `/v1beta/*` Gemini format. `components.securitySchemes.bearerAuth` (`type:http, scheme:bearer`) áp global qua `security`. |
| [src/app/docs/api/page.js](../src/app/docs/api/page.js) | Trang public (route `/docs/api`) — client component tự load CSS/JS `swagger-ui-dist@5` qua CDN (jsdelivr), gọi `SwaggerUIBundle({url:"/openapi/ollama-public.json", layout:"BaseLayout"})`. **Không** load `swagger-ui-standalone-preset.js` (tránh hiện thanh nhập URL spec tuỳ ý — chỉ khoá cứng vào spec của 9Router). |
| [tests/unit/ollama-public-openapi-spec.test.js](../tests/unit/ollama-public-openapi-spec.test.js) | 4 test: JSON hợp lệ (guard đúng lỗi vừa gặp lúc viết tay — xem bên dưới), có `bearerAuth`, đủ 12 route Ollama, KHÔNG chứa bất kỳ route quản trị nội bộ nào (`/api/settings`, `/api/providers`, `/api/keys`, `/api/oauth`, `/api/usage`, `/api/cli-tools`). |

### Files đã sửa

- [AGENTS.md](../AGENTS.md) — thêm dòng `src/app/docs/api/` vào bảng "Key boundaries".

### Quyết định kỹ thuật lúc thực thi

- **Không thêm npm dependency** (`swagger-ui-react`/`swagger-ui-dist`) — load qua CDN jsdelivr trong client component, đúng phương án đầu tiên đã liệt kê ở mục 3 ("CDN `swagger-ui-dist` hoặc npm package"). Tránh rủi ro cần `npm install` (mạng/offline) và giữ `package.json` gọn.
- **Route page ở `src/app/docs/api/page.js` (ngoài `(dashboard)` và không bắt đầu bằng `/api/`)** — verify trực tiếp bằng đọc `src/dashboardGuard.js`: middleware chỉ gate path bắt đầu `/api/` hoặc `/dashboard`, path khác rơi qua `NextResponse.next()` mặc định — nên route này public thật, không cần thêm bất kỳ allow-list nào.
- **Spec là static file trong `public/`, không phải 1 API route** — vì nội dung là data/doc tĩnh, không phải "feature logic" theo hard rule `packages/`; `public/` đã là nơi 9Router phục vụ static asset có sẵn (favicon, i18n, sw.js...), nhất quán với convention hiện có.
- **1 bug tự phát hiện:** lần viết JSON tay đầu tiên (không qua Write tool kiểm chứng cấu trúc) bị dư 1 dấu `}` khiến `JSON.parse` "thành công" nhưng cắt cụt phần cuối object — phải viết lại bằng 1 script Node dựng object JS thật rồi `JSON.stringify` (đảm bảo cân ngoặc bởi chính JS engine) thay vì gõ tay JSON text. Đã thêm test regression cho đúng lớp lỗi này (mục "is valid, parseable JSON").

### Verification

- **Unit test:** `cd tests && npx vitest run --config ./vitest.config.js ollama` → **44/44 pass** (25 cũ + 4 spec test mới + 15 test ollama khác đã có từ trước trong repo, không có test nào fail).
- **Smoke-test qua dev server thật đang chạy:**
  - `curl /openapi/ollama-public.json` → 200, parse được, 35 path (bao gồm `/v1beta/*` được thêm sau khi phát hiện thiếu).
  - `curl -L /docs/api` → 200, **không redirect** `/login` — xác nhận đúng là trang public.
  - HTML trả về server-side có chứa `<h1>...Public API Docs</h1>` và `<div id="swagger-ui">` — xác nhận trang render đúng nội dung tĩnh.
  - CDN `swagger-ui-dist@5` CSS + JS bundle → cả 2 trả `200` khi curl trực tiếp — xác nhận asset thật sự tồn tại và tải được.
- **Giới hạn đã biết (KHÔNG verify được trong môi trường này):** không có browser/Playwright MCP khả dụng (`playwright`/`playwright-local` MCP server bị lỗi kết nối) nên **chưa xác nhận bằng mắt** Swagger UI thực sự render/tương tác được sau khi JS chạy trên client (chỉ verify HTML tĩnh + asset CDN tồn tại, chưa verify hành vi runtime của `SwaggerUIBundle`). Chưa test nút Authorize + Try-it-out bằng API key thật (cùng giới hạn thiếu API key hợp lệ như Phase 1/2). **Người dùng cần tự mở `http://localhost:<port>/docs/api` trên browser để xác nhận UI hiển thị đúng.**

## 11. Kết quả thực thi Phase 4 (2026-09-10)

### Quyết định mở đã chốt trước khi bắt đầu

Đã hỏi lại đúng câu hỏi mở còn lại ở mục 6 (độ sâu tài liệu) trước khi code — khách hàng chọn **"path + summary + auth requirement"** (tier nhẹ, ~6-8d), không chọn full schema (~15d).

### Files đã tạo

| File | Nội dung |
|---|---|
| [scripts/generate-internal-openapi.mjs](../scripts/generate-internal-openapi.mjs) | Script sinh spec tự động — quét toàn bộ `route.js` dưới `src/app/api/` (trừ `v1/`/`v1beta/` đã có ở Phase 3), trích method (`export function METHOD` và `export const METHOD =`), map file path → URL path (`[id]`→`{id}`, `[...path]`→`{path}` + đánh dấu `x-9router-note` catch-all), phân loại auth theo đúng 4 nhóm của `dashboardGuard.js` (Public/Protected/Always-protected/Local-only, copy nguyên logic từ đó vì các list không export). Chạy lại: `node scripts/generate-internal-openapi.mjs`. |
| [src/app/api/docs/internal-openapi/spec.json](../src/app/api/docs/internal-openapi/spec.json) | Output của script trên — **152 path, 237 operation** (nhiều hơn ước tính ~110-120 vì đếm hết mọi route.js, kể cả route rất nhỏ). |
| [src/app/api/docs/internal-openapi/route.js](../src/app/api/docs/internal-openapi/route.js) | Thin route `GET` trả `spec.json` — path bắt đầu `/api/` và không có trong allow-list public của `dashboardGuard.js` nên **tự động** yêu cầu JWT/CLI token, không cần code auth riêng. |
| [packages/components/swagger/SwaggerUIEmbed.js](../packages/components/swagger/SwaggerUIEmbed.js) | Component share (refactor từ code Phase 3) — nhận prop `specUrl`/`domId`, dùng cho cả trang public và trang dashboard mới. |
| [src/app/(dashboard)/dashboard/api-docs/page.js](<../src/app/(dashboard)/dashboard/api-docs/page.js>) | Trang dashboard mới (yêu cầu login), dùng `SwaggerUIEmbed`. |
| [tests/unit/ollama-internal-openapi-spec.test.js](../tests/unit/ollama-internal-openapi-spec.test.js) | 5 test: JSON hợp lệ, có `bearerAuth`, KHÔNG chứa path `/v1`/`/v1beta` nào (ranh giới ngược với test Phase 3), sanity floor >100 path, phân loại auth đúng cho 3 route mẫu đã biết trước (`/api/health`=Public, `/api/shutdown`=Always-protected, `/api/settings`=Protected), route catch-all có đúng note. |

### Files đã sửa

- [src/app/docs/api/page.js](../src/app/docs/api/page.js) — refactor dùng `SwaggerUIEmbed` thay code CDN-loading trùng lặp (hành vi không đổi).
- [packages/components/index.js](../packages/components/index.js) — thêm export `SwaggerUIEmbed`.
- [src/shared/components/Sidebar.js](../src/shared/components/Sidebar.js) — thêm entry `API Docs` vào `systemItems` (không phải `compressionContextItems` — nhóm đó chỉ dành cho tính năng tối ưu token).
- [AGENTS.md](../AGENTS.md), [packages/AGENTS.md](../packages/AGENTS.md), [src/app/api/AGENTS.md](../src/app/api/AGENTS.md) — cập nhật cho khớp Phase 4.

### 2 bug tự phát hiện và sửa ngay trong lúc build script

1. **Method-detection thiếu 1 pattern:** regex ban đầu chỉ bắt `export async function GET`, bỏ sót 2 route dùng `export const GET = handlerFn` (`headroom/proxy/[...path]`, `pxpipe/health`). Phát hiện qua unit test tự viết (assert route catch-all phải có mặt) → thêm pattern thứ 2 vào `METHOD_EXPORT_PATTERNS`.
2. **Catch-all detection sai thời điểm check:** code kiểm tra `urlPath.includes("...")` NHƯNG `urlPath` đã bị hàm `filePathToUrlPath` xoá `"..."` từ trước khi check chạy tới — luôn `false`. Sửa bằng cách check trên path gốc (`relative(API_ROOT, file)`) trước khi transform. Cả 2 bug đều bị bắt bởi cùng 1 lượt test, không phải do người dùng report.

### Verification

- **Unit test:** `cd tests && npx vitest run --config ./vitest.config.js ollama` → **50/50 pass** (44 cũ + 5 test mới của Phase 4 + regenerate không phá test Phase 3 do đổi tên biến `isCatchAll` logic).
- **Smoke-test qua dev server thật đang chạy:**
  - `GET /api/docs/internal-openapi` (không auth) → `401 {"error":"Unauthorized"}` — đúng, path này không nằm trong allow-list public của `dashboardGuard.js`.
  - `GET /dashboard/api-docs` (không cookie login) → redirect `/login` — đúng, xác nhận trang được gate đúng như route dashboard khác.
- **Giới hạn còn mở (giống Phase 1-3):** chưa verify được bằng browser thật (không có Playwright MCP) rằng Swagger UI hiển thị đúng ~152 route sau khi login; chưa test Authorize+Try-it-out bằng API key thật + JWT session thật. Chất lượng field `summary` phần lớn (191/237 operation tính tới trước fix, tỷ lệ tương đương sau fix) chỉ là fallback `"METHOD /path"` vì đa số file route.js trong repo không có comment ngay trên hàm export — chấp nhận được vì đây đúng là trade-off của tier nhẹ đã chọn, không phải bug.
