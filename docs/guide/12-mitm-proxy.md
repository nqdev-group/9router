# MITM Proxy

## Giới thiệu

9Router bao gồm một HTTPS intercepting proxy (MITM) chạy trên port 443, dùng để intercept và route traffic từ các IDE tools không hỗ trợ custom endpoint.

Hỗ trợ các tools: **Antigravity**, **Copilot**, **Kiro**, **Cursor**.

## Cấu trúc

```
src/mitm/
├── server.js              # HTTPS intercepting proxy server
├── config.js              # Target hosts, URL patterns, model synonyms
├── manager.js             # MITM process manager
├── logger.js              # Request/response logging
├── paths.js               # MITM directory paths
├── winElevated.js         # Windows privilege elevation helper
├── dbReader.js            # Read mitm alias mappings from DB
├── antigravityIdeVersion.js # AG IDE version string override
├── cert/                  # Certificate management
│   ├── rootCA.js          # Root CA generation
│   ├── generate.js        # Dynamic cert generation
│   └── install.js         # CA cert installation
├── dns/
│   └── dnsConfig.js       # DNS resolution overrides
└── handlers/
    ├── base.js            # Base handler
    ├── antigravity.js     # Antigravity handler
    ├── copilot.js         # GitHub Copilot handler
    ├── kiro.js            # Kiro handler
    └── cursor.js          # Cursor handler
```

## Cách hoạt động

1. **Dynamic cert generation**: Tạo self-signed CA cert, tự động cài vào hệ thống
2. **SNI-based routing**: Dựa vào SNI (Server Name Indication) để xác định tool
3. **Host rewrite**: `cloudcode-pa.googleapis.com` → `daily-cloudcode-pa.googleapis.com` (tránh rate limits)
4. **Request interception**: Đọc, sửa đổi, và forward request đến 9Router API

## Configuration

```js
// src/mitm/config.js
Target hosts per tool:
- antigravity: cloudcode-pa.googleapis.com
- copilot: api.githubcopilot.com
- kiro: api.kiro.ai
- cursor: api2.cursor.so
```

## Certificate Management

CA cert location:
- Windows: hệ thống cert store (Local Machine → Trusted Root)
- POSIX: `/usr/local/share/ca-certificates/` hoặc tương đương

Cert generation sử dụng `selfsigned` và `node-forge`.

## Handlers

### base.js
Base handler với utility functions cho request interception, header modification, body rewriting.

### antigravity.js
- Intercept request đến `cloudcode-pa.googleapis.com`
- Rewrite model names
- Inject auth headers
- Host rewrite để tránh rate limits

### copilot.js
- Intercept request đến `api.githubcopilot.com`
- Rewrite headers để mimic VSCode
- Token injection

### kiro.js
- Intercept request đến `api.kiro.ai`
- Session management
- Token refresh

### cursor.js
- Intercept request đến `api2.cursor.so`
- Model rewrite theo mitm alias mapping
- Workspace/IDE version spoofing

## Process Management

`manager.js` quản lý vòng đời của MITM proxy:
- Start/stop server
- Health check
- Port conflict resolution
- Windows privilege elevation (`winElevated.js`)
