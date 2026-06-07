# Tổng quan dự án 9Router

9Router là một local AI routing gateway và OpenAI-compatible proxy, được xây dựng trên Next.js. Nó cung cấp một endpoint API duy nhất (`/v1/*`) để route traffic qua nhiều upstream AI providers với format translation, multi-model fallback chains (combos), account round-robin, OAuth token refresh, và RTK token compression.

## Mục đích

- **Tiết kiệm chi phí**: Tận dụng free & cheap AI providers, giảm token consumption với RTK
- **Không gián đoạn**: Auto fallback qua nhiều providers khi hết quota hoặc gặp lỗi
- **Tương thích universal**: Hoạt động với mọi CLI tool (Claude Code, Codex, Cursor, Cline, OpenClaw...)

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Runtime | Node.js 20+ |
| Framework | Next.js 16 (Webpack) |
| UI | React 19 + Tailwind CSS 4 |
| Database | SQLite (better-sqlite3 / node:sqlite / sql.js fallback) |
| Streaming | Server-Sent Events (SSE) |
| Auth | OAuth 2.0 (PKCE) + JWT + API Keys |

## Cấu trúc thư mục

```
9router/
├── src/                    # Next.js app source
│   ├── app/                # API routes & pages
│   │   ├── api/            # REST API endpoints
│   │   │   ├── v1/         # OpenAI-compatible API
│   │   │   ├── v1beta/     # Gemini-compatible API
│   │   │   ├── auth/       # Authentication
│   │   │   ├── oauth/      # OAuth flows
│   │   │   ├── providers/  # Provider management
│   │   │   ├── combos/     # Combo management
│   │   │   └── ...
│   │   ├── (dashboard)/    # Dashboard pages
│   │   ├── landing/        # Landing page
│   │   └── login/          # Login page
│   ├── sse/                # SSE + routing core
│   │   ├── handlers/       # Business logic handlers
│   │   ├── services/       # Auth, model, token refresh
│   │   └── utils/          # Logger
│   ├── lib/                # Libraries
│   │   ├── db/             # SQLite database layer
│   │   ├── oauth/          # OAuth implementations
│   │   ├── mitm/           # MITM proxy
│   │   └── ...
│   ├── shared/             # Shared constants & utils
│   └── components/         # React components
├── open-sse/               # Core routing engine (standalone module)
│   ├── config/             # Provider configs
│   ├── executors/          # Provider HTTP adapters
│   ├── handlers/           # Core handlers (chat, embeddings, etc.)
│   ├── translator/         # Format translation (request/response)
│   ├── rtk/                # Token compression engine
│   ├── services/           # Fallback, combo, provider, token refresh
│   ├── transformer/        # Stream transformers
│   └── utils/              # Stream, error, logging utilities
├── cli/                    # CLI package (publishes `9router` npm bin)
└── tests/                  # Unit tests
```

## Request Flow Tổng Quan

```
CLI Tool → POST /v1/chat/completions
  → next.config.mjs (URL rewrite: /v1/* → /api/v1/*)
    → src/proxy.js (middleware: auth guard)
      → src/app/api/v1/.../route.js (init translators, forward)
        → src/sse/handlers/chat.js (auth, combo iteration, account fallback)
          → open-sse/handlers/chatCore.js (detect format, translate, dispatch)
            → open-sse/executors/[provider].js (HTTP call to upstream)
              → Upstream AI Provider
            ← open-sse/translator/response/*.js (normalize stream back)
          ← src/lib/db/ (record usage)
        → Client receives SSE stream
```
