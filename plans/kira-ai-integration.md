# Kế hoạch tích hợp Provider Kira AI

## 1. Mục tiêu
Tích hợp Provider Kira AI (https://kiraai.vn) vào hệ thống 9Router dưới dạng một package độc lập trong thư mục `packages`, hạn chế tối đa việc sửa đổi source code chính.

## 2. Thông số kỹ thuật Kira AI
- **Base URL:** `https://kiraai.vn/api/v1`
- **Format:** OpenAI Compatible
- **Models:** 
  - `kira-3.5-flash` (Mặc định, tốc độ nhanh)
  - `kira-2.5-pro` (Logic chuyên sâu, code)
  - `kira-3-pro-image-preview` (Tạo ảnh)
  - `kira-3.1-flash-image-preview` (Tạo ảnh)
  - `kira-3.1-generate-001` (Video)

## 3. Kiến trúc tích hợp (Packages Pattern)

### 3.1. Cấu trúc thư mục mới
Tạo thư mục `packages/kira-ai/` chứa logic của provider:
- `packages/kira-ai/index.js`: Điểm xuất phát, chứa thông tin đăng ký.
- `packages/kira-ai/config.js`: Định nghĩa config provider và models.
- `packages/kira-ai/translator.js`: (Tùy chọn) Nếu cần xử lý format đặc biệt (hiện tại tương thích OpenAI nên có thể dùng mặc định).

### 3.2. Đăng ký Provider
Do hệ thống hiện tại chưa có cơ chế auto-scan plugins, cần thực hiện "nhúng" (bridge) tại các điểm:
1. **Config Bridge:** Export config từ `packages/kira-ai` và import vào `open-sse/config/providers.js` & `providerModels.js`.
2. **Executor Bridge:** Kira AI tương thích OpenAI nên sẽ tự động sử dụng `DefaultExecutor`.
3. **UI Bridge:** Thêm metadata vào `src/shared/constants/providers.js` để hiển thị trên Dashboard.

## 4. Các bước thực hiện

### Bước 1: Tạo Package Kira AI
- Tạo file `packages/kira-ai/config.js` chứa:
  - `KIRA_PROVIDER_CONFIG`
  - `KIRA_MODELS`
- Tạo file `packages/kira-ai/index.js` để export các hằng số này.

### Bước 2: Tích hợp vào Core Config
- Sửa `open-sse/config/providers.js`: Import và spread `KIRA_PROVIDER_CONFIG` vào `PROVIDERS`.
- Sửa `open-sse/config/providerModels.js`: Import và thêm `kira` vào `PROVIDER_MODELS`.

### Bước 3: Tích hợp vào Dashboard UI
- Sửa `src/shared/constants/providers.js`: Thêm `kira` vào danh sách `APIKEY_PROVIDERS` với logo và mô tả.
- Thêm logo Kira AI vào `public/providers/kira.png` (sẽ dùng logo tạm hoặc fetch nếu có thể).

### Bước 4: Kiểm tra và Hoàn thiện
- Chạy `npm run lint` để đảm bảo code style.
- Kiểm tra danh sách model trong Dashboard.
- Thử nghiệm gọi API với model `kira/kira-3.5-flash`.

## 5. Duy trì và Mở rộng
- Dễ dàng cập nhật model mới chỉ bằng cách sửa file trong `packages/kira-ai/`.
- Có thể thêm translator riêng nếu Kira AI cập nhật format khác OpenAI trong tương lai.
