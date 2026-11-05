---
type: other
complexity: medium
impact: medium
related_issues: []
related_prs: []
time_spent_hours: ~2
status: in_progress
---

# Kế hoạch: Cập nhật model và ghi sẵn model free cho các custom provider registry

> **Ngày:** 2026-11-05
> **Phạm vi:** [packages/providers/registry/](../packages/providers/registry/), [packages/providers/pricing.js](../packages/providers/pricing.js)
> **Trạng thái:** 🚧 Code xong, chưa commit (đang chờ quyết định cách commit)

---

## 1. Bối cảnh

Prompt đã chuẩn hoá: `.claude/prompts/2026-11-05-registry-free-models-update.md`. Yêu cầu: duyệt các cấu hình custom provider trong `packages/providers/registry/`, cập nhật danh sách model theo catalog thật, và ghi sẵn các model free / chi phí 0. Catalog các provider đổi rất nhanh nên seed cũ đã lỗi thời (nhiều id không còn tồn tại).

Mặc định đã dùng vì chưa được xác nhận: **gỡ model đã chết** khỏi seed, **chưa commit**.

## 2. Công việc đã thực hiện

**Phân nhóm provider** theo việc catalog có xem được không cần key:

| Nhóm | Provider | Lý do |
|---|---|---|
| a (kiểm chứng được) | `kira`, `opencode-zen`, `zenmux`, `aimlapi`, `beatapi`, `xai247` | `/v1/models` công khai, hoặc có feed công khai thay thế (`xai247` qua `/api/models`) |
| b (chưa kiểm chứng) | `gurouter`, `hhtechapi`, `codely`, `vilao`, `experiential` | `/v1/models` trả 401, cần key |
| c (bỏ qua) | `meta-llm`, `revidapi`, `llm7`, `sambanova` | không có `modelsFetcher`, hoặc là stub, hoặc bị comment trong `index.js` |

**Định nghĩa "free" đã dùng** (chỉ ghi free khi nguồn nói rõ): cờ `is_free:true` (kira), `cost.text` input và output bằng 0 (opencode-zen), `prompt` và `completion` bằng 0 (zenmux). Giá cùng nguồn nói không rõ thì không đoán.

Kết quả theo provider:

- **kira**: thêm `stealth/crouton-alpha`, `longcat-2.5-free` (`is_free:true`, giá 0 trong `pricing.js`). `kira-mini-1.0` đã `is_free:false` (có giá, giảm 90%) nên bỏ tag "(Miễn phí)" và sửa giá từ 0 thành $0.09 / $2.40 (₫4.500 và ₫120.000 theo tỷ giá nội bộ ₫5.000 = $1, đã trừ giảm giá). Tag trong catalog vẫn ghi "Hoàn toàn miễn phí" nhưng mâu thuẫn với cờ và giá, nên theo cờ. Gỡ `deepseek-v4-flash-vision-exp`.
- **opencode-zen**: seed còn 2 id sống trên 9, nên thay bằng đúng 10 model free hiện tại (xem [opencode-zen.js](../packages/providers/registry/opencode-zen.js)) và giá 0 tương ứng.
- **zenmux**: gỡ `deepseek/deepseek-v4-flash-free`, thêm 3 model text free (`atria-asi/atria-dawn`, `dots-studio/dots3-note-prev`, `sapiens-ai/agnes-2.5-flash`). Bỏ qua 2 model ảnh giá 0.
- **aimlapi**: gỡ `mistral/leanstral-1-5` và `stealth/ox-alpha`. Catalog không có trường giá nên "(Miễn phí)" vẫn dựa vào trang model của aimlapi.
- **xai247**: catalog công khai nay có 17 model, đều `billingKind: "pack"` (phải mua gói), không có model free. `gpt-5.6-terra` (trước là free) đã biến mất. Seed đổi thành đủ 17 model hiện tại. Theo yêu cầu của user, block giá chỉ giữ `claude-opus-5`; 5 id đã chết bị bỏ.
- **gurouter**: không sửa. Feed giá có 30 model nhưng không có id nào trong 3 id đang seed; các mục `:free` có hệ số giá mâu thuẫn (ví dụ `beam:free` hệ số 37.5), nên không đoán. Cần key để xem `/v1/models`.

Quyết định của user trong lượt này:
- **Giữ nguyên** bản `opencode-zen` trong `packages/providers/registry/`, dù upstream `open-sse/` đã có `opencode-zen.js` riêng và hai bản trùng id. Phiên sau không nên "dọn" hai bản này nếu chưa hỏi lại.
- Block giá `xai247`: bỏ các model đã chết (đã làm).

## 3. Files đã thay đổi

| File | Thay đổi |
|---|---|
| [packages/providers/registry/kira.js](../packages/providers/registry/kira.js) | Thêm 2 model free, bỏ tag free của `kira-mini-1.0`, gỡ 1 id chết |
| [packages/providers/registry/opencode-zen.js](../packages/providers/registry/opencode-zen.js) | Seed thay bằng 10 model free hiện tại |
| [packages/providers/registry/zenmux.js](../packages/providers/registry/zenmux.js) | Gỡ 1 id chết, thêm 3 model free |
| [packages/providers/registry/aimlapi.js](../packages/providers/registry/aimlapi.js) | Gỡ 2 id chết |
| [packages/providers/registry/xai247.js](../packages/providers/registry/xai247.js) | Seed = 17 model của catalog hiện tại |
| [packages/providers/pricing.js](../packages/providers/pricing.js) | Giá 0 cho model free mới; sửa giá `kira-mini-1.0`; bỏ giá của các id đã chết (kira, zenmux, opencode-zen, aimlapi, xai247) |

## 4. Trạng thái hiện tại

- **Chưa commit.** Chờ quyết định commit gộp hay tách theo provider.
- Kiểm tra bằng script: mọi id trong seed của 5 provider đều có trong catalog tương ứng; mọi model "(Miễn phí)" đều có giá 0 trong `pricing.js` (ngoại lệ: model ảnh của aimlapi, vì `pricing.js` vốn không có giá cho model ảnh). Cú pháp các file hợp lệ.
- Chạy 51 test liên quan: 43 pass, 8 fail. Đã chạy lại đúng 8 test đó trên bản trước khi sửa (tạm stash) và chúng fail y hệt, nên không phải do thay đổi này:
  - 7 test "registry id unique" / alias collision do id `opencode-zen` trùng giữa `open-sse/` và `packages/`.
  - 1 test Mistral `promptCacheKey` trong `unit/param-support.test.js`.

## 5. Việc còn mở (chưa làm, để quyết định sau)

- [ ] Commit (gộp hay tách theo provider).
- [ ] Provider nhóm b (`gurouter`, `hhtechapi`, `codely`, `vilao`, `experiential`): cần API key để xem `/v1/models`, sau đó mới cập nhật seed và giá free.
- [ ] `xai247`: 16 id mới chưa có giá trong `pricing.js` (đang dùng ước lượng mặc định). Lấy giá từ trường `*PerMillionMicro` trong `/api/models` nếu cần; hiện toàn bộ model đang `0` vì billing kiểu "pack", nên cần xác nhận trước khi dùng.
- [ ] 7 test "registry id unique" fail do `opencode-zen` trùng (cố ý giữ theo yêu cầu của user). Cân nhắc thêm các test đó vào `tests/__baseline__/known-fails.txt` hoặc xử lý khi sync upstream.
- [ ] Test Mistral `promptCacheKey` fail từ trước (liên quan plan `2026-09-24-mistral-prompt-cache-key-strip`), chưa điều tra.
- [ ] Cập nhật lại định kỳ: catalog đổi rất nhanh (opencode-zen mất 7 id trong vài tuần), nên seed này sẽ cũ nhanh.

## 6. Bài học rút ra

- Cờ free của từng nguồn khác nhau: kira dùng `is_free` (có khi giá vẫn khác 0 do giảm 99%), opencode-zen dùng giá 0, zenmux dùng giá prompt và completion bằng 0. Phải chọn đúng cờ cho từng provider, không dùng chung một quy tắc.
- Tag mô tả trong catalog ("Hoàn toàn miễn phí") có thể mâu thuẫn với cờ và giá thật. Ưu tiên cờ và giá.
- `xai247` đổi cách tính phí từ "plan"/"free" sang toàn bộ "pack", nên model từng free biến mất cùng lúc.
- Khi chạy script kiểm tra, ghép chuỗi regex trong template literal rất dễ sai (lỗi này làm script báo nhầm 20 vấn đề); nên viết helper riêng.

## 7. Tham khảo bên ngoài

- Prompt gốc: [.claude/prompts/2026-11-05-registry-free-models-update.md](../.claude/prompts/2026-11-05-registry-free-models-update.md)
- Plan liên quan: [2026-11-05-beatapi-provider-integration.md](2026-11-05-beatapi-provider-integration.md), [2026-09-18-kira-provider-fixes.md](2026-09-18-kira-provider-fixes.md), [2026-10-13-xai247-provider-integration.md](2026-10-13-xai247-provider-integration.md)
- Nguồn catalog: `https://kiraai.vn/api/v1/models`, `https://opencode.ai/zen/v1/models`, `https://zenmux.ai/api/v1/models`, `https://api.aimlapi.com/v1/models`, `https://xai247.xyz/api/models`, `https://gurouter.gulagi.com/api/pricing`
