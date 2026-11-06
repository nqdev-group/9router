---
type: feature
complexity: low
status: completed
related_issues: []
related_prs: []
estimated_hours: ~16-56 (2-7 person-days, hầu hết là kiểm chứng và test)
---

# Kế hoạch: Tạo lại registry custom provider KiraAI

> **Ngày lập kế hoạch:** 2026-11-06
> **Scope dự kiến:** [packages/providers/registry/kiraai.js](../packages/providers/registry/kiraai.js) (mới), [registry/index.js](../packages/providers/registry/index.js), [pricing.js](../packages/providers/pricing.js), [usage/kira.js](../packages/providers/usage/kira.js), [public/providers/kira.png](../public/providers/kira.png), test mới
> **Priority:** medium
> **Trạng thái:** ✅ Code xong 2026-11-06, chưa commit; còn việc kiểm thử bằng API key thật (mục 10)
> **Prompt gốc:** [.claude/prompts/2026-11-06-kira-registry.md](../.claude/prompts/2026-11-06-kira-registry.md)

---

## 1. Phân tích / Bối cảnh

Registry `kira.js` bị xóa ở commit `5595c67a` theo yêu cầu của user, kèm lời hẹn tạo lại sau. Hiện `index.js` có comment ở chỗ `pc01`, và provider Kira biến mất khỏi danh sách.

Hiện trạng các file đi kèm (vẫn còn, chưa bị xóa):
- [usage/kira.js](../packages/providers/usage/kira.js) và dòng `kira:` trong `usage/index.js`.
- Block giá `kira` trong `pricing.js`, gồm `kira-mini-1.0` ($0.09 / $2.40), `stealth/crouton-alpha` và `longcat-2.5-free` ở giá 0.
- Handler `kira` cho image/tts/video trong `open-sse/handlers/`.
- `public/providers/kira.png` thực chất là một trang HTML, không phải ảnh.

Ràng buộc và giả định:
- Code mới nằm trong `packages/`; không sửa `open-sse/` hay `src/` (quy tắc fork, tránh conflict khi merge upstream).
- `registry/index.js` sửa tay, không chạy script migrate.
- Nếu đổi `id` khỏi `kira` thì kết nối đã lưu của người dùng và các handler/usage đang khóa theo `id` này sẽ hỏng, nên giữ `id: kira`.
- 8 test fail có sẵn (7 test trùng id `opencode-zen`, 1 test Mistral `promptCacheKey`) không thuộc phạm vi.
- Link `/api/v1/user/models?type=free...` trong yêu cầu có khả năng cần đăng nhập; trước đây catalog công khai dùng `/api/v1/models`.

## 2. Approach / Strategy

**Phương án chọn:** khôi phục bản cũ từ git (`git show 5595c67a^:packages/providers/registry/kira.js`), đối chiếu với catalog hiện tại rồi cập nhật. Cấu trúc theo [vilao.js](../packages/providers/registry/vilao.js), phần free model, usage và `modelsFetcher` theo [beatapi.js](../packages/providers/registry/beatapi.js).

**Vì sao không viết mới từ `vilao.js`:** `vilao.js` chỉ có LLM và embedding. Kira còn TTS, ảnh, video và usage, viết lại từ đầu dễ làm rơi cấu hình mà handler đang dựa vào.

**Cách xử lý file đi kèm (theo yêu cầu 6 của prompt):**
- Handler trong `open-sse/`: chỉ báo lệch (id, endpoint, tên field), **không sửa**.
- File ngoài `open-sse/` (`usage/kira.js`, `pricing.js`, icon): được sửa nếu lệch.

**Quy tắc "free":** theo cờ `is_free` và giá từ catalog, không theo tag mô tả. `kira-mini-1.0` từng có tag "Hoàn toàn miễn phí" nhưng `is_free:false` và có giá, nên không gắn "(Miễn phí)".

**Mặc định đang dùng vì user chưa trả lời 4 câu xác nhận:** khôi phục từ git, giữ tính năng TTS/ảnh/video/usage, có test, có plan.

## 3. Công việc cần thực hiện (Todo)

Phase 1, MVP (khoảng 1-2 ngày):
- [x] Đọc `vilao.js`, `beatapi.js` và `kira.js` cũ từ git.
- [x] `curl` kiểm chứng: `/api/v1/models` công khai hay cần key, endpoint free models, định dạng chat; lưu kết quả vào scratchpad.
- [x] Viết `kira.js`: `id`/`alias` `kira`, `display`, `transport`, `models`, `serviceKinds`, `modelsFetcher`, `passthroughModels`, `features`.
- [x] Seed model `is_free:true`, ghi "(Miễn phí)", đặt giá 0 trong `pricing.js`; rà block `kira` đang có, không tạo block trùng.
- [x] Đăng ký trong `registry/index.js`: bỏ comment `pc01`, thêm `import pc01 from "./kira.js"` và entry.

Phase 2, hoàn thiện:
- [x] Rà `usage/kira.js` và các handler image/tts/video, ghi lệch vào báo cáo (không sửa `open-sse/`).
- [x] Viết test kiểu `tests/unit/beatapi-provider.test.js`: registry shape, seed free có giá 0, filter (nếu cần), usage handler.

Phase 3, nice-to-have:
- [x] Thay `public/providers/kira.png` bằng icon thật 128x128 (cần ảnh logo chính thức).
- [x] Cập nhật plan này sang dạng post-execution khi xong.

(Đã hoàn thành cả 3 phase; chi tiết ở mục 7 và 9. Icon: dùng `kiraai.png` từ favicon chính thức.)

## 4. Risks & Unknowns

- **Risk 1:** endpoint free models cần đăng nhập → **Mitigation:** dùng `/api/v1/models` công khai làm `modelsFetcher`, ghi rõ trong báo cáo.
- **Risk 2:** handler TTS/ảnh/video trong `open-sse/` lệch cấu hình mới → **Mitigation:** giữ nguyên `id` và các field cũ, chỉ báo lệch, không sửa `open-sse/`.
- **Risk 3:** tag miễn phí mâu thuẫn cờ và giá → **Mitigation:** theo cờ `is_free` và giá thật.
- **Risk 4:** kết nối Kira đã lưu có thể đang lỗi từ lúc xóa registry → **Mitigation:** giữ `id: kira`, kết nối tự dùng lại được.
- **Unknown 1:** có API key Kira để chạy thử thật không → **Plan:** hỏi user; nếu không có thì chỉ kiểm chứng catalog công khai và ghi rõ phần chưa thử.
- **Unknown 2:** có logo chính thức để làm icon không → **Plan:** hỏi user, tạm hoãn module icon nếu chưa có.

## 5. Success Criteria

- Registry nạp được và `kira` xuất hiện đúng một lần.
- Test liên quan (registry, `vilao-provider`, `beatapi-provider`, test Kira mới) chạy qua vitest và không có lỗi mới ngoài 8 lỗi có sẵn.
- Mọi model "(Miễn phí)" có giá 0 trong `pricing.js`.
- Báo cáo nêu rõ endpoint đã kiểm chứng, model free đã seed, file đã sửa và điểm chưa kiểm chứng được.
- Chưa commit cho đến khi user yêu cầu.

## 6. Questions / Dependencies

Chưa được user trả lời (ảnh hưởng estimate nhiều nhất theo thứ tự):
1. Giữ TTS, ảnh, video và usage, hay chỉ làm LLM? (chỉ LLM thì giảm khoảng 0.5-1 ngày)
2. Có API key Kira để chạy thử không?
3. Khôi phục bản cũ hay viết mới? (viết mới thêm khoảng 0.25-0.5 ngày)
4. Có logo chính thức để làm icon không?
5. Có cần test và plan kèm không? (bỏ cả hai giảm khoảng 0.75-1.25 ngày)

Estimate (1 senior dev, đã gồm QA 15-20% và PM 10%): khoảng 3-7 person-days, tương đương 0.75-1.75 tuần; riêng MVP khoảng 1-2 ngày.

---

## 7. Nhật ký thực hiện (2026-11-06) — Phase 1 và 2 xong, chưa commit

**Kiểm chứng endpoint** (đều công khai, không cần key):
- `GET /api/v1/models` → 200, 105 model (91 chat). Mọi id trong seed cũ vẫn còn sống.
- `GET /api/v1/user/models?type=free...` → 200 **không cần đăng nhập** (rủi ro 1 không xảy ra). Trả `{success, models:[...], featured_models}`, chỉ 2 model, trùng với `is_free:true` của `/api/v1/models`: `stealth/crouton-alpha`, `longcat-2.5-free`. Vẫn dùng `/api/v1/models` làm `modelsFetcher` vì đúng shape OpenAI chuẩn.
- `GET /api/v1/audio/voices` → 200, khớp 6 voice trong `ttsConfig` và `VOICE_MAP`.
- Chưa thử chat/usage thật (không có API key).

**Quyết định:**
- Khôi phục `kira.js` từ `5595c67a^` (đã chứa cập nhật free 2026-11-05), giữ `id: kira`, đổi các comment lỗi thời (catalog nay có lại Claude/GPT/Gemini, không còn "37 chat"). Seed không đổi.
- Không seed `gemini-*-tts` dù đã có trong catalog, vì `VOICE_MAP` của handler viết cho voice Kira.
- Handler image/tts/video trong `open-sse/`: **không lệch** (URL và voice map khớp registry), không sửa gì.

**Files:** [kiraai.js](../packages/providers/registry/kiraai.js) (mới), [registry/index.js](../packages/providers/registry/index.js) (bật lại `pc01`), [tests/unit/kira-provider.test.js](../tests/unit/kira-provider.test.js) (mới, 8 test).

**Test:** kira + beatapi + opencode-zen-models + vilao: 36 pass, 1 fail. Lỗi duy nhất là "registry id unique" của vilao do `opencode-zen` trùng sẵn từ trước (nay 155 vs 156).

## 8. Việc còn mở sau khi thực hiện

- [ ] Block giá `kira` trong `pricing.js` đã cũ: 59/91 model chat chưa có giá (Claude, GPT, Gemini… quay lại catalog), và 6 key không còn sống (`deepseek-v4-flash-0731`, `qwen3.5-flash`, `qwen3.5-omni-plus`, `glm-4.7-flash-free`, `ox-alpha`, `dots-3-note-preview`). Chưa sửa vì ngoài phạm vi; giá đổi theo VND và `discount_percent`.
- [ ] Icon: `public/providers/kira.png` vẫn là trang HTML (cần logo chính thức).
- [ ] Test chat và `/user/profile` với API key thật.
- [ ] Commit (chưa làm theo yêu cầu).

---

## 9. Cập nhật theo yêu cầu bổ sung (2026-11-06)

- **Đổi id `kira` → `kiraai`** (alias cũng `kiraai`). Mọi chỗ khóa theo id đã đổi theo:
  [usage/index.js](../packages/providers/usage/index.js), [test/testUtils.js](../packages/providers/test/testUtils.js), block giá trong `pricing.js`, test, và `case "kiraai"` trong [ProviderLimits/utils.js](../src/app/(dashboard)/dashboard/usage/components/ProviderLimits/utils.js).
  Ba file `open-sse/handlers/{image,tts,video}Providers/index.js` chỉ đổi **key** từ `kira` thành `kiraai: kira` (tên file và code handler giữ nguyên), vì adapter được tra theo id provider. Đây là ngoại lệ so với ràng buộc "không sửa `open-sse/`" của prompt, do đổi id bắt buộc.
  **Hệ quả:** kết nối Kira đã lưu với provider `kira` sẽ không còn khớp, người dùng cần thêm lại kết nối (chưa có migration).
- **Giá `kiraai` đã đồng bộ**: sinh lại toàn bộ block từ `/api/v1/models` (91 model chat, 2 model free ở giá 0). Công thức: giá VND × (1 − discount) ÷ 5.000; thêm `cached` / `cache_creation` từ `price_cache_read_vnd` / `price_cache_write_vnd`. 31/38 mục cũ đã lệch catalog nên thay mới cả block. Giá là giá **sau giảm hiện tại**, có thể tăng khi hết `promo_end_at`.
- **Icon**: `public/providers/kiraai.png` (128×128, từ `https://kiraai.vn/favicon.png`); đã xóa `kira.png` (là trang HTML).
- Test: 36 pass, 1 fail (`opencode-zen` trùng id có sẵn).

## 10. Việc còn mở (cập nhật)

- [ ] Test chat và `/user/profile` với API key thật.
- [ ] Migration kết nối đã lưu từ `kira` sang `kiraai` nếu cần.
- [ ] Commit (chưa làm theo yêu cầu).

- Tên file registry đổi thành `kiraai.js` (cùng id `kiraai`).
