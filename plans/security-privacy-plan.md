# Kế hoạch phát triển tính năng Security & Data Privacy cho 9Router

## 1. Mục tiêu
- Bảo vệ dữ liệu nhạy cảm (PII/Secret) của người dùng khi gửi yêu cầu tới AI.
- Tự động nhận diện và mã hóa/masking 1/2 giá trị của các thông tin nhạy cảm.
- Cho phép người dùng tùy chỉnh danh sách từ khóa cần bảo vệ.

## 2. Các thành phần chính

### A. Core Logic: PrivacyEngine (open-sse/privacy/)
- `PrivacyEngine`: Module chịu trách nhiệm quét và xử lý dữ liệu.
- `masking.js`: Logic xử lý chuỗi (ví dụ: `password123` -> `passw****`).
- `configResolver.js`: Giải quyết cấu hình (kết hợp mặc định và người dùng tùy chỉnh).
- `constants.js`: Danh sách từ khóa mặc định (`username`, `password`, `apikey`, `secretkey`, `clientsecret`, ...).

### B. Tích hợp luồng (open-sse/handlers/chatCore.js)
- Chèn PrivacyEngine vào quy trình xử lý request trước khi gửi tới Provider.
- Quét toàn bộ `messages` (content, tool_outputs).
- Nếu phát hiện cặp `key: value` hoặc các giá trị nhạy cảm, thực hiện masking.

### C. Quản lý cấu hình (Backend)
- **Database**: Lưu cấu hình vào bảng `settings` (json field `privacyConfig`) hoặc bảng mới.
- **API**: 
    - `GET /api/settings/privacy`: Lấy cấu hình hiện tại.
    - `PATCH /api/settings/privacy`: Cập nhật từ khóa và trạng thái bật/tắt.

### D. Giao diện người dùng (Dashboard)
- Trang mới: `/dashboard/settings/security`.
- Form bật/tắt tính năng.
- Danh sách từ khóa mặc định (chỉ xem).
- Input thêm các từ khóa tùy chỉnh (Custom Keywords).

## 3. Danh sách từ khóa mặc định
- `username`, `user_name`, `user`
- `password`, `pass`, `pwd`
- `apikey`, `api_key`, `api-key`
- `secretkey`, `secret_key`, `secret`
- `clientsecret`, `client_secret`
- `token`, `access_token`, `refresh_token`
- `cookie`, `session`

## 4. Các bước triển khai

### Phase 1: Core Privacy Engine
1. Tạo thư mục `open-sse/privacy/`.
2. Viết unit tests cho logic masking (giữ 1/2, che 1/2).
3. Triển khai regex-based detection cho các cặp key-value.

### Phase 2: Integration
1. Sửa `open-sse/handlers/chatCore.js` để gọi `PrivacyEngine.process(body)`.
2. Đảm bảo hiệu năng không bị ảnh hưởng đáng kể (sử dụng regex tối ưu).

### Phase 3: Settings & API
1. Cập nhật `src/lib/db/repos/settingsRepo.js` để hỗ trợ `privacyConfig`.
2. Viết các route handler cho API `/api/settings/privacy`.

### Phase 4: Dashboard UI
1. Tạo trang Security Settings trong dashboard.
2. Kết nối với API.

### Phase 5: Security Hardening (Bonus)
1. Fix lỗi leak key trong `open-sse/utils/requestLogger.js` (uncomment `maskSensitiveHeaders`).

## 5. Rủi ro & Giải pháp
- **False Positives**: Một số từ thông thường có thể trùng với từ khóa (ví dụ: "secret" trong văn cảnh bình thường). 
    - *Giải pháp*: Chỉ masking khi có cấu trúc dạng gán `key=value`, `key: value`, hoặc trong JSON.
- **Performance**: Quét nội dung lớn có thể chậm.
    - *Giải pháp*: Giới hạn kích thước nội dung quét hoặc chỉ quét các message mới nhất.
