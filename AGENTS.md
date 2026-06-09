# 9Router Agent Guide

## Essential Commands
- Dev: `PORT=20128 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run dev`
- Build: `npm run build`
- Start: `PORT=20128 HOSTNAME=0.0.0.0 NEXT_PUBLIC_BASE_URL=http://localhost:20128 npm run start`
- Test: `cd tests && npm test` (requires NODE_PATH=/tmp/node_modules)
- Single test: `cd tests && NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run unit/<name>.test.js`
- Lint: `npx eslint .`

## Key Architecture
- Pure JavaScript (ESM in src/ and open-sse/, CommonJS in cli/)
- Next.js 16 with Webpack (turbopack disabled)
- URL rewrites: `/v1/*` → `/api/v1/*`, `/codex/*` → `/api/v1/responses`
- App vs API: `/api/*` are API routes; `/dashboard`, `/login` are pages
- Request flow: `/v1/chat/completions` → route.js → chat.js → chatCore.js → executor → translator
- API route pattern: route.js imports handler + initTranslators + ensureInitialized()
- SQLite persistence at `$DATA_DIR/db/data.sqlite` via repos (never raw SQL)
- RTK token saver active by default in `translateRequest()` (compresses tool_result)
- Provider executors: `open-sse/executors/` (default.js for OpenAI-compatible, specialized for antigravity, azure, codex, etc.)
- Format translation via OpenAI: source → openai → target
- Shared packages: `@9router/*` → `./packages/*` via jsconfig.json

## Environment Variables (Runtime)
- `JWT_SECRET` - Dashboard auth (auto-generated if unset)
- `INITIAL_PASSWORD` - First login (default: 123456)
- `DATA_DIR` - SQLite location (default: `~/.9router`)
- `PORT` - HTTP port (default: 20128)
- `BASE_URL` - Server-side base URL (preferred over NEXT_PUBLIC_BASE_URL)
- `CLOUD_URL` - Cloud sync endpoint (preferred over NEXT_PUBLIC_CLOUD_URL)
- `REQUIRE_API_KEY` - Enforce Bearer auth on /v1/* (false by default)
- `ENABLE_REQUEST_LOGS` - Write request/response logs to logs/ (false by default)
- `API_KEY_SECRET`/`MACHINE_ID_SALT` - HMAC secrets for key generation

## Testing Specifics
- Vitest configured in tests/vitest.config.js with path aliases
- Tests require NODE_PATH=/tmp/node_modules due to workspace hoisting
- Translator tests MUST import "./registerAll.js" to load translators
- Real provider tests require RUN_REAL=1 and read credentials from ~/.9router/db/data.sqlite
- 51 unit test files in tests/unit/ covering core functionality

## Development Workflow
- Provider configs: open-sse/config/providerModels.js and providers.js
- Add new provider:
  1. Add to providerModels.js and providers.js
  2. Create executor in open-sse/executors/ (use default.js for OpenAI-compatible)
  3. Add translators if format differs from OpenAI
  4. Register in open-sse/translator/index.js
  5. Add OAuth handlers if needed in src/app/api/oauth/[provider]/
- CLI tool integration: Set endpoint to http://localhost:20128/v1 with API key from dashboard