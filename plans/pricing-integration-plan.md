**Kế hoạch tích hợp lại bảng giá (Models.dev Pricing)**

1. **Khảo sát hiện trạng**
   - Mở `open‑sse/config/providerModels.js` → liệt kê các model hiện có, xác định trường `pricePerMillion` (hoặc `cost`).
   - Mở `open‑sse/config/providers.js` → kiểm tra cấu trúc `pricing` / `quotaLimits` của mỗi provider.
   - Kiểm tra `src/lib/db/repos/settingsRepo.js` để xem `DEFAULT_SETTINGS` có chứa `pricing` không.

2. **Thiết kế schema mới**
   - Định nghĩa một interface chung `PricingInfo { modelId:string; pricePerM:number; currency:string; source:string; }`.
   - Thêm vào `packages/validation/cmemSchemas.js` (hoặc tạo file `pricingSchemas.js`) để validate dữ liệu giá khi lưu/đọc.

3. **Cập nhật dữ liệu nguồn**
   - **providerModels.js**:
     - Thêm/ sửa mỗi model dev (ví dụ: `dev/claude-sonnet`, `dev/glm-5`…) với `pricePerMillion` và `currency: "USD"` (nếu cần).
   - **providers.js** (nếu cần):
     - Thêm mục `pricing: { defaultCurrency: "USD", sourceUrl: "https://models.dev/pricing" }` cho provider tương ứng.
   - Đảm bảo không còn khai báo trùng lặp `PROVIDERS` / `PROVIDER_MODELS` (xóa các khai báo thủ công, chuyển sang tự động sinh từ `registry/`).

4. **Regenerate index**
   - Chạy script (nếu có) `npm run generate:providers` hoặc thực hiện `node scripts/generateProvidersIndex.js` để cập nhật `open‑sse/providers/registry/index.js` và `open‑sse/providers/index.js`.
   - Kiểm tra rằng `PROVIDER_MODELS` được export từ `open‑sse/config/providerModels.js` mà không còn duplicate.

5. **Cập nhật API & UI**
   - **API**: Mở `src/app/api/v1/models/route.js` (hoặc file tương tự) → trả về `pricePerMillion` kèm model info.
   - **Dashboard**:
     - Trong `src/app/(dashboard)/dashboard/settings/models/page.js` (hoặc component liên quan), hiển thị cột “Giá (USD/triệu token)”.
     - Import `PROVIDER_MODELS` để lấy `pricePerMillion`.
   - Thêm toggle “hiện/ẩn giá” trong UI nếu muốn.

6. **Kiểm thử**
   - **Unit**: Thêm test vào `tests/translator/` hoặc `tests/unit/pricing.test.js` → xác thực rằng mỗi model có `pricePerMillion` hợp lệ (>0) và cấu trúc đúng.
   - **E2E**: Chạy `npm run test -- src/app/(dashboard)/dashboard/settings/models/page.test.js` để kiểm tra UI hiển thị giá.
   - Chạy lint (`npx eslint .`) và type‑check (`npm run typecheck` nếu có).

7. **Tài liệu**
   - Cập nhật `docs/PRICING.md` → mô tả nguồn dữ liệu, cách thêm model mới, và quy tắc cập nhật giá.
   - Thêm ghi chú trong `README.md` phần “Pricing integration”.

8. **Triển khai**
   - Commit các thay đổi trong một PR riêng, mô tả “Integrate Models.dev pricing”.
   - Đánh giá CI (lint, test) → merge vào `main`.
   - Deploy (Docker/Next.js) → kiểm tra trên dashboard production.

**Lưu ý**
- Tránh sửa file trực tiếp khi chưa xác nhận cấu trúc `providerModels.js` đã được tự động sinh.
- Nếu dự án vẫn có `duplicate export` trong `providers.js`/`providerModels.js`, ưu tiên xóa chúng và để nguồn duy nhất từ `registry/`.
- Khi thêm trường giá, luôn cập nhật validation schema để ngăn dữ liệu lỗi.
