# Development Guide

## Setup

```bash
git clone https://github.com/decolua/9router.git
cd 9router
npm install
cp .env.example .env
```

## Development Commands

```bash
# Development mode (hot reload)
PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev

# Production build
npm run build

# Production run
PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start

# Bun variants
npm run dev:bun
npm run build:bun
npm run start:bun
```

## Testing

Tests trong thư mục `tests/` (riêng biệt npm context):

```bash
cd tests && npm test
```

### Requirements

- Vitest installed tại `/tmp/node_modules`
- 30 test files covering: RTK, translators, combo routing, embeddings, providers, DB, auth, TTS

### Test Structure

```
tests/
├── vitest.config.js        # Resolves path aliases
├── unit/
│   ├── rtk/                # RTK token saver tests
│   ├── translator/         # Format translation tests
│   ├── combo/              # Combo routing tests
│   ├── providers/          # Provider validation tests
│   ├── db/                 # Database tests (benchmark, concurrent, driver chain, migration)
│   ├── embeddings/         # Embeddings tests
│   ├── auth/               # Auth tests
│   ├── tts/                # TTS tests
│   └── ...
```

## Project Conventions

### Code Style
- **Language**: Pure JavaScript (jsconfig.json cho path aliases)
- **No TypeScript**: project sử dụng JS với JSDoc comments
- **Modular**: API logic trong `/api`, business logic trong `open-sse/`
- **Clean architecture**: tách biệt routes, handlers, services, executors

### Directory Structure

```
src/
├── app/api/          # Next.js API routes
├── app/(dashboard)/  # Dashboard pages
├── sse/              # SSE handlers + services
├── lib/              # Libraries (DB, OAuth, MITM)
├── shared/           # Shared constants, utils, hooks
└── components/       # React components

open-sse/
├── config/           # Provider configs
├── executors/        # Provider HTTP adapters
├── handlers/         # Core handlers
├── translator/       # Format translation
├── rtk/              # Token compression
├── services/         # Business logic services
├── transformer/      # Stream transformers
└── utils/            # Utilities
```

### Import Aliases

```js
import { getSettings } from "@/lib/localDb";     // → src/lib/localDb
import { handleChatCore } from "open-sse/handlers/chatCore";  // → open-sse/handlers/chatCore
```

## Adding Features

### Adding a New Provider

1. Add provider config in `open-sse/config/providers.js`
2. Add models in `open-sse/config/providerModels.js`
3. Create executor in `open-sse/executors/` (or use `default.js` for standard OpenAI-compatible)
4. Add request/response translators in `open-sse/translator/request/` and `open-sse/translator/response/` if format differs from OpenAI
5. Register translator pair in `open-sse/translator/index.js`
6. Add OAuth/device-code handlers in `src/lib/oauth/providers.js` if applicable
7. Wire CLI config writer in `src/app/api/cli-tools/` if needed

### Adding a New API Endpoint

1. Create file `src/app/api/v1/{resource}/route.js`
2. Follow pattern: `OPTIONS` for CORS, `POST`/`GET` that initializes translators and delegates
3. Add URL rewrite in `next.config.mjs` if needed
4. Add dashboard guard rules in `src/dashboardGuard.js` if needed

### Adding a New Translator Pair

1. Create request translator in `open-sse/translator/request/{format}-to-openai.js`
2. Create response translator in `open-sse/translator/response/{format}-to-openai.js`
3. Register in `open-sse/translator/index.js` with `require("./...")`
4. Add format constant in `open-sse/translator/formats.js`

## Database Migrations

### Adding a Migration

1. Create file `src/lib/db/migrations/{number}-{name}.js`
2. Export `{ id: "name", up: async (adapter) => { /* SQL */ } }`
3. Add to `MIGRATIONS` array in `src/lib/db/migrations/index.js`

Migration pattern:

```js
export default {
  id: "my-migration",
  up: async (adapter) => {
    adapter.run(`ALTER TABLE usageHistory ADD COLUMN myColumn INTEGER DEFAULT 0`);
  }
};
```

## Building

```bash
# Production build
npm run build

# Docker
docker build -t 9router .
```

## Docker Build

```bash
# Build image
docker build -t 9router .

# Run
docker run -d --name 9router -p 20128:20128 \
  -e DATA_DIR=/app/data \
  -v 9router-data:/app/data \
  9router

# Với env file
docker run -d --name 9router -p 20128:20128 \
  --env-file ./.env \
  -v 9router-data:/app/data \
  9router
```

Published images:
- Docker Hub: `decolua/9router`
- GHCR: `ghcr.io/decolua/9router`

## Continuous Integration

GitHub Actions workflow:
- Build và test trên push
- Publish Docker images multi-platform (`linux/amd64, linux/arm64`) khi tag `v*`
- Publish npm package (`9router`) khi tag `v*`
