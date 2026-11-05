---
type: feature
complexity: low
impact: medium
related_issues: []
related_prs: []
time_spent_hours: ~1
status: completed
---

# Kế hoạch: Thêm provider BeatAPI (chat/LLM, 3 model free)

> **Ngày:** 2026-11-05
> **Phạm vi:** [packages/providers/registry/](../packages/providers/registry/), [packages/providers/suggested-models/filters.js](../packages/providers/suggested-models/filters.js)
> **Trạng thái:** ✅ Đã hoàn thành phần code + test + commit; còn việc cần API key thật / logo (mục 5)

---

## 1. Bối cảnh

Cần thêm BeatAPI (https://beatapi.io/) làm custom provider kiểu API key, theo mẫu [kira.js](../packages/providers/registry/kira.js). Prompt gốc được chuẩn hoá bằng prompt-tuner và lưu ở `.claude/prompts/2026-11-05-beatapi-provider.md`. Phạm vi chốt: chỉ phần chat/LLM, seed 3 model free (`glm-5.3-flash-free`, `deepseek-v4.1-flash-free`, `hy4-free`), `signupUrl` = `https://beatapi.io/sign-in` (không có mã affiliate).

## 2. Công việc đã thực hiện

1. **Đọc docs và gọi thử API thật** để lấy dữ kiện thay vì đoán:
   - Docs `free-models.md` và `quick-guide.md` xác nhận base URL `https://api.beatapi.io`, chat qua `POST /v1/chat/completions`, auth `Authorization: Bearer <key>`.
   - `/v1/chat/completions` và `/v1/models` đều trả 401 `missing_api_key` khi không có key → dùng `/v1/models` làm `validateUrl`.
   - `/v1/text/models` là catalog **public** (không cần key), 45 model, 3 model nhóm `free`.
2. **Phát hiện catalog có dạng lồng 2 lớp** `{ data: { object, data: [...] } }`. Route [suggested-models/route.js](../src/app/api/providers/suggested-models/route.js) lấy `json.data` rồi bọc object vào mảng 1 phần tử, nên filter `openai` có sẵn sẽ ra 1 mục rác. → Thêm filter riêng `beatapi` (unwrap cả 2 dạng đầu vào, chỉ giữ model có endpoint `openai`) thay vì sửa route trong `src/` (tránh conflict khi merge upstream, theo quy tắc "feature mới nằm trong packages/").
3. **Tạo [beatapi.js](../packages/providers/registry/beatapi.js)**: `id`/`alias` `beatapi`, `category: "apikey"`, `serviceKinds: ["llm"]`, `passthroughModels: true`, `modelsFetcher` type `beatapi`. Ghi rõ trong `notice.text` giới hạn của model free (1 req/phút trước lần nạp đầu, tối đa 10 req/phút sau đó, có thể bị gỡ bất cứ lúc nào).
4. **Đăng ký vào [registry/index.js](../packages/providers/registry/index.js)**: file này **viết tay** (header ghi rõ "NOT auto-generated"), nên thêm `import pc15` thủ công. CLAUDE.md đang ghi sai điểm này (nói là auto-generated).

Quyết định và đánh đổi:

- **Retry 429 chỉ 2 lần** (các provider khác dùng 6): model free giới hạn 1 req/phút, trả `Retry-After` ~60s, retry dồn dập không có ích.
- **Không dùng `/v1/models` làm `modelsFetcher`**: cần key, trong khi route suggested-models fetch không gửi key → danh sách rỗng. Dùng `/v1/text/models` (public).
- **Chỉ `serviceKinds: ["llm"]`**: image/video/realtime của BeatAPI dùng flow task bất đồng bộ (`POST .../tasks` + `GET /v1/tasks/{id}`), cần handler riêng như Kira.
- **Giữ `usage.url` chỉ là link** tới `text-usage`: BeatAPI có `GET /v1/usage?period=7d` nhưng chưa biết map response vào `open-sse/services/usage.js`.

## 3. Files đã thay đổi

| File                                                                                                | Thay đổi                                                                            |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [packages/providers/registry/beatapi.js](../packages/providers/registry/beatapi.js) (**Mới**)       | Cấu hình provider BeatAPI: định danh, display, transport, 3 model free, passthrough |
| [packages/providers/suggested-models/filters.js](../packages/providers/suggested-models/filters.js) | Thêm filter `beatapi` để unwrap catalog lồng 2 lớp                                  |
| [packages/providers/registry/index.js](../packages/providers/registry/index.js)                     | Import và đăng ký `pc15`                                                            |
| [packages/providers/usage/beatapi.js](../packages/providers/usage/beatapi.js) (**Mới**)             | Usage handler: số dư credit USD từ `GET /v1/usage`                                  |
| [packages/providers/usage/index.js](../packages/providers/usage/index.js)                           | Đăng ký `USAGE_HANDLERS.beatapi`                                                    |
| [packages/providers/pricing.js](../packages/providers/pricing.js)                                    | Block giá `beatapi` (42 model)                                                      |
| [tests/unit/beatapi-provider.test.js](../tests/unit/beatapi-provider.test.js) (**Mới**)             | 11 test: registry, filter, pricing, usage                                           |
| [CLAUDE.md](../CLAUDE.md)                                                                           | Ghi chú: registry custom trong `packages/` là file viết tay                         |

## 4. Trạng thái hiện tại

- **Đã commit** (xem `git log`), chưa push.
- Test mới [tests/unit/beatapi-provider.test.js](../tests/unit/beatapi-provider.test.js): 11/11 pass (registry, filter `beatapi`, pricing free = 0, usage handler với fetch mock).
- `tests/unit/aggregator-providers-batch.test.js` không chạy được do import `ajv/dist/2020.js` lỗi ở `open-sse/translator/deepseekWebToolBinding.js`, không liên quan thay đổi này.
- Baseline (chạy qua vitest vì `@9router/*` là alias bundler, Node thuần không resolve được, `npm install` không giúp):
  - `verify-oauth-urls`: OK.
  - `verify-providers`: báo `+ provider added: beatapi` cùng `xai247`, `experiential`, `sensenova`, `runcrate` → snapshot `providers-baseline.json` đã cũ từ trước, không phải regression do BeatAPI.
  - `verify-alias`: lệch `alias qw: qw -> qwen`, `idToAlias`, `modelKeys`; không có dòng nào nhắc `beatapi`. Chưa A/B với HEAD để chứng minh drift có sẵn từ trước.
- **Chưa gọi thử chat thật và chưa thử `/v1/usage` thật**: cần API key BeatAPI.

## 5. Việc còn mở (chưa làm, để quyết định sau)

Đã xong (2026-11-05, lượt 2):
- [x] Baseline: chạy qua vitest, kết quả ở mục 4.
- [x] Unit test cho filter `beatapi` (+ registry, pricing, usage handler).
- [x] Usage handler [packages/providers/usage/beatapi.js](../packages/providers/usage/beatapi.js): hiển thị `credit_balance` (USD) từ `GET /v1/usage`; bật `features.usage/usageApikey` trong registry. **Dựng theo docs, chưa kiểm chứng với key thật.**
- [x] Block giá `beatapi` trong [pricing.js](../packages/providers/pricing.js): 42 model từ catalog public; 3 model free = 0; `cached` / `cache_creation` đặt bằng giá input (ước lượng cận trên, catalog không công bố giá cache); không cộng thêm trường `discount`.
- [x] Model `gpt-*`: catalog liệt kê endpoint `openai` cho cả 8 model, chỉ `gpt-6.1-sol` / `gpt-6.1-terra` thêm `openai-response` → về lý thuyết chạy được qua chat/completions. Chưa xác nhận bằng gọi thật.
- [x] CLAUDE.md: thêm dòng nêu `packages/providers/registry/index.js` là file viết tay (dòng cũ nói về `open-sse/providers/registry/`, giữ nguyên).
- [x] Commit.

Còn mở:
- [ ] Gọi thử `glm-5.3-flash-free` qua gateway bằng API key thật (lưu ý `hy4-free` cần `max_tokens` ≥ 2000 vì reasoning tính vào output budget); thử luôn `GET /v1/usage` để đối chiếu shape với handler.
- [ ] Icon `public/providers/beatapi.png`: trang chủ không có thẻ favicon lấy được; không tự vẽ logo. Hiện dùng `textIcon: "BA"`. Cần user cung cấp file logo.
- [ ] Cập nhật snapshot `tests/__baseline__/providers-baseline.json` / alias baseline nếu muốn gate sạch (đang lệch từ trước, ngoài phạm vi BeatAPI).
- [ ] Xác nhận pricing: `discount` trong catalog đã được áp vào giá niêm yết hay chưa.

## 6. Bài học rút ra

- "OpenAI-compatible" chưa chắc cùng shape `/models`: BeatAPI bọc `data` 2 lớp. Luôn `curl` catalog thật trước khi chọn `modelsFetcher.type`.
- Route suggested-models fetch **không gửi key**, nên `modelsFetcher.url` phải là endpoint public; endpoint cần key sẽ cho danh sách rỗng một cách im lặng.
- Trước khi chạy script "sinh lại registry", đọc header của `index.js`: file này đã chuyển sang viết tay.
- Model free có thể bị gỡ bất cứ lúc nào; không coi là đường production.

## 7. Tham khảo bên ngoài

- https://docs.beatapi.io/free-models (bản markdown: `.../free-models.md`)
- https://docs.beatapi.io/quick-guide
- https://docs.beatapi.io/llms.txt (mục lục docs)
- Dashboard: https://beatapi.io/dashboard, API keys: https://beatapi.io/dashboard/apikeys, usage: https://beatapi.io/dashboard/text-usage
- Mẫu tham chiếu: [plans/2026-09-18-kira-provider-fixes.md](2026-09-18-kira-provider-fixes.md), [plans/2026-10-13-xai247-provider-integration.md](2026-10-13-xai247-provider-integration.md)
