# CLI Package

## Giới thiệu

CLI package (`cli/`) là npm package publish ra dưới tên `9router` trên npm registry. Nó cung cấp CLI tool cho phép người dùng cài đặt và chạy 9Router nhanh chóng.

## Cấu trúc

```
cli/
├── cli.js              # CLI entry point (bin)
├── package.json        # npm package config
├── src/                # CLI source code
├── hooks/              # npm/node lifecycle hooks
├── scripts/            # Build/install scripts
└── README.md           # Package README
```

## Commands

Sau khi cài đặt global (`npm install -g 9router`):

```bash
9router              # Chạy 9Router
9router --help       # Help
9router --version    # Version
```

## Package Details

```json
{
  "name": "9router",
  "version": "0.4.63",
  "bin": {
    "9router": "cli.js"
  }
}
```

## Build

```bash
cd cli && npm run dev    # Chạy dev với nodemon
cd cli && npm run build  # Build với esbuild
```

## Runtime

CLI package:
- Không bundle SQLite dependencies (tránh Windows EBUSY)
- SQLite được cài vào `~/.9router/runtime/node_modules`
- Không bundle systray (tránh antivirus false positives)
- Windows sử dụng PowerShell NotifyIcon thay vì systray

## npm Publishing

Package được publish tự động qua CI/CD khi tag `v*` được tạo.
