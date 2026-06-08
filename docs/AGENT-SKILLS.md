# 9Router Agent Skills

Hướng dẫn sử dụng các Agent Skills của 9Router. Các skill này cho phép AI Agent (như Claude Code) tương tác trực tiếp với gateway để thực hiện các tác vụ AI.

## Tổng quan

9Router cung cấp một bộ skill chia theo từng khả năng (capability). Mỗi skill chứa các hướng dẫn và ví dụ cụ thể để gọi API tương ứng qua gateway.

### Thiết lập môi trường

Cần cấu hình URL và API Key (nếu có) trước khi sử dụng:

```bash
export NINEROUTER_URL="http://localhost:20128" # URL của gateway
export NINEROUTER_KEY="sk-..."                 # API Key từ Dashboard -> Keys
```

Tất cả các endpoint đều nằm dưới path `/v1/`. Header bắt buộc: `Authorization: Bearer $NINEROUTER_KEY`.

---

## Danh sách Agent Skills

| Skill | Chức năng | Endpoint chính |
|-------|-----------|----------------|
| `9router` | Entry point & Setup | `/api/health`, `/v1/models` |
| `9router-chat` | Chat & Lập trình | `/v1/chat/completions`, `/v1/messages` |
| `9router-image` | Tạo hình ảnh | `/v1/images/generations` |
| `9router-tts` | Chuyển văn bản thành giọng nói | `/v1/audio/speech` |
| `9router-stt` | Chuyển giọng nói thành văn bản | `/v1/audio/transcriptions` |
| `9router-embeddings`| Tạo vector nhúng | `/v1/embeddings` |
| `9router-web-search`| Tìm kiếm web | `/v1/web/search` |
| `9router-web-fetch` | Đọc nội dung website | `/v1/web/fetch` |

---

## Cách sử dụng cơ bản

### 1. Kiểm tra các Model khả dụng
Dùng skill `9router` để khám phá danh sách model theo từng loại:

```bash
# Liệt kê model chat
curl $NINEROUTER_URL/v1/models

# Liệt kê model tạo ảnh
curl $NINEROUTER_URL/v1/models/image
```

### 2. Chat và Sinh code (`9router-chat`)
Hỗ trợ cả định dạng OpenAI và Anthropic.

**OpenAI Format:**
```bash
curl -X POST $NINEROUTER_URL/v1/chat/completions \
  -H "Authorization: Bearer $NINEROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-4o","messages":[{"role":"user","content":"Viết code Hello World bằng Rust"}]}'
```

### 3. Tạo ảnh (`9router-image`)
Sử dụng model từ các provider như OpenAI (DALL-E), Midjourney, Stable Diffusion.

```bash
curl -X POST $NINEROUTER_URL/v1/images/generations \
  -H "Authorization: Bearer $NINEROUTER_KEY" \
  -d '{"model":"openai/dall-e-3","prompt":"Một con mèo phi hành gia trên sao hỏa"}'
```

### 4. Tìm kiếm và Đọc web (`9router-web-search`, `9router-web-fetch`)
Cho phép Agent truy cập dữ liệu thời gian thực.

**Tìm kiếm:**
```bash
curl -X POST $NINEROUTER_URL/v1/web/search \
  -d '{"model":"tavily/search","query":"Thời tiết Hà Nội hôm nay"}'
```

**Đọc nội dung (Markdown):**
```bash
curl -X POST $NINEROUTER_URL/v1/web/fetch \
  -d '{"model":"jina/reader","url":"https://vnexpress.net"}'
```

## Xử lý lỗi

- **401 Unauthorized**: Kiểm tra `NINEROUTER_KEY`.
- **400 Invalid model format**: Model không tồn tại hoặc sai loại (ví dụ: dùng model chat cho endpoint image).
- **503 Service Unavailable**: Tất cả tài khoản provider cho model đó đã hết hạn hoặc bị lỗi. Gateway sẽ trả về `retry-after`.
