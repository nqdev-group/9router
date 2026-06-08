# Getting Started

## Yêu cầu hệ thống

- Node.js 20+ (hoặc Bun)
- npm hoặc yarn

## Cài đặt và chạy

### 1. Clone repository

```bash
git clone https://github.com/decolua/9router.git
cd 9router
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
```

Các biến môi trường quan trọng:

| Variable | Default | Mô tả |
|----------|---------|-------|
| `JWT_SECRET` | auto-generated | Secret ký JWT cho dashboard |
| `INITIAL_PASSWORD` | `123456` | Mật khẩu đăng nhập lần đầu |
| `DATA_DIR` | `~/.9router` | Thư mục lưu SQLite |
| `PORT` | 20128 | Cổng HTTP |
| `API_KEY_SECRET` | `endpoint-proxy-api-key-secret` | HMAC secret cho API keys |
| `MACHINE_ID_SALT` | `endpoint-proxy-salt` | Salt cho machine ID hash |

### 3. Cài đặt dependencies

```bash
npm install
```

### 4. Chạy development

```bash
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev
```

### 5. Build và chạy production

```bash
npm run build
PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start
```

### 6. Truy cập

- **Dashboard**: `http://localhost:20128/dashboard`
- **API endpoint**: `http://localhost:20128/v1`
- **Login mặc định**: password `123456`

## Docker

```bash
docker build -t 9router .
docker run -d --name 9router -p 20128:20128 \
  -e DATA_DIR=/app/data \
  -v 9router-data:/app/data \
  9router
```

## Cấu hình CLI Tools

### Claude Code

Edit `~/.claude/config.json`:

```json
{
  "anthropic_api_base": "http://localhost:20128/v1",
  "anthropic_api_key": "your-9router-api-key"
}
```

### Codex CLI

```bash
export OPENAI_BASE_URL="http://localhost:20128"
export OPENAI_API_KEY="your-9router-api-key"
codex "your prompt"
```

### Cursor IDE

Settings → Models → Advanced:
- OpenAI API Base URL: `http://localhost:20128/v1`
- OpenAI API Key: [from dashboard]

### Cline / Continue / RooCode

```
Provider: OpenAI Compatible
Base URL: http://localhost:20128/v1
API Key: [from dashboard]
Model: cc/claude-opus-4-6
```

## Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Chạy dev với Webpack, port 20128 |
| `npm run build` | Build production |
| `npm run start` | Chạy production |
| `npm run dev:bun` | Chạy dev với Bun |
| `npm run build:bun` | Build với Bun |
| `npm run start:bun` | Chạy production với Bun |
