# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

9Router is a local AI routing gateway and OpenAI-compatible proxy. It routes CLI traffic across 40+ AI providers with format translation, 3-tier fallback chains, account round-robin, OAuth token refresh, and RTK token compression. The project consists of a Next.js dashboard, an SSE-based routing core, and various CLI tools.

## Development Commands

Here are the most common commands for developing and running 9Router:

*   **Install Dependencies**:
    ```bash
    npm install
    ```
*   **Run Development Server**:
    ```bash
    npm run dev
    ```
    (For Bun runtime: `npm run dev:bun`)
*   **Build for Production**:
    ```bash
    npm run build
    ```
    (For Bun runtime: `npm run build:bun`)
*   **Run Production Build**:
    ```bash
    npm run start
    ```
*   **Run Tests**:
    ```bash
    cd tests && npm install && npm test
    ```
*   **Run a Single Test File**:
    ```bash
    cd tests && npx vitest run --reporter=verbose path/to/file.test.js
    ```
*   **Run Tests Matching a Pattern**:
    ```bash
    cd tests && npx vitest run --reporter=verbose -t "combo-routing"
    ```
*   **CLI Package Commands**:
    ```bash
    npm run cli:pack
    npm run cli:publish
    ```
*   **Docker**:
    ```bash
    # Build the Docker image
    docker build -t 9router .

    # Run the container (ensure .env is configured)
    docker run -d \
      --name 9router \
      -p 20128:20128 \
      --env-file ./.env \
      -v 9router-data:/app/data \
      9router
    ```

## Architecture Overview

9Router follows a three-layer architecture:

1.  **API Routes (`src/app/api/*`)**: Handles incoming requests, including OpenAI-compatible endpoints (`/v1/*`) and dashboard APIs (`/api/*` for auth, providers, combos, etc.). It also serves the Dashboard UI via Next.js App Router.
2.  **SSE + Routing Core (`open-sse/` + `src/sse/`)**: Manages Server-Sent Events, request parsing, combo iteration, account fallback loops, format translation, and executor dispatch.
    *   `open-sse/handlers/chatCore.js`: Central dispatcher for translation and executor selection.
    *   `open-sse/executors/`: Provider-specific adapters for HTTP requests and authentication.
    *   `open-sse/translator/`: Handles request and response format translations between different providers.
3.  **Executors**: Logic for interacting with specific AI providers.

**Key Directories:**
*   `src/`: Main application code, including API routes, SSE core, UI components, stores, and database logic.
*   `open-sse/`: Core SSE streaming logic, translators, and provider executors.
*   `packages/components/`: Reusable UI components.
*   `tests/`: Unit, integration, and provider tests using Vitest.
*   `cli/`: Standalone CLI package for interactive menus and proxy support.

**Path Aliases**:
*   `@/`: Maps to `./src/*`
*   `@9router/*`: Maps to `./packages/*`
*   `open-sse/`: Maps to `./open-sse/*`

**Persistence**:
*   Main state (`providers`, `combos`, `keys`, `settings`): `${DATA_DIR}/db.json` managed by `src/lib/localDb.js` (LowDB).
*   Usage history: `${DATA_DIR}/usage.json` managed by `src/lib/usageDb.js`.

**Technology Stack**:
*   **Runtime**: Node.js 20+
*   **Framework**: Next.js 16
*   **UI**: React 19, Tailwind CSS 4
*   **Database**: LowDB (JSON files)
*   **Streaming**: Server-Sent Events (SSE)
*   **Authentication**: OAuth 2.0, JWT, API Keys

## Key Configuration Files

*   **`.env`**: Stores environment variables. It's not included in the Docker image, so it needs to be provided at runtime (e.g., via `--env-file`).
*   **`package.json`**: Defines project name, version, dependencies, and crucially, the development and build scripts.
*   **`jsconfig.json`**: Configures path aliases for cleaner imports (e.g., `@/`, `@9router/*`).
*   **`vitest.config.js`**: Vitest configuration, including path aliases for testing.
*   **`postcss.config.mjs`**, **`tailwind.config.js`**: Tailwind CSS and PostCSS configuration for styling.
*   **`Dockerfile`**, **`.dockerignore`**: For Docker image building and exclusion rules.
*   **`CLAUDE.md`**: This file, providing guidance for Claude Code.

## AI Assistant Configuration

No specific AI assistant configuration files (like `.cursorrules`, `.github/copilot-instructions.md`, or `.claude/` files) were found in the repository's root or common AI configuration directories.

## Key File Reference

*   `src/sse/handlers/chat.js`: Handles chat requests, model combos, and account loops.
*   `open-sse/handlers/chatCore.js`: Orchestrates translation and executor dispatch.
*   `open-sse/executors/`: Contains provider-specific adapter logic.
*   `open-sse/translator/`: Manages request and response format translations.
*   `src/lib/localDb.js`: Manages persistent configuration (providers, combos, keys, settings).
*   `src/dashboardGuard.js`: Middleware for JWT authentication and route protection.
*   `open-sse/rtk/`: Core logic for the RTK Token Saver, which compresses tool output.
*   `src/lib/usageDb.js`: Tracks request logs and token counts for usage analytics.

## Environment Variables

Key environment variables for configuring 9Router include:
*   `PORT`: Service port (default 20127, Docker uses 20128).
*   `HOSTNAME`: Bind host (Docker typically uses `0.0.0.0`).
*   `DATA_DIR`: Location for database files (defaults to `~/.9router`).
*   `JWT_SECRET`: Secret for signing dashboard auth cookies.
*   `INITIAL_PASSWORD`: Default password for first-time login.
*   `ENABLE_REQUEST_LOGS`: Set to `true` to log requests/responses in the `logs/` directory.
*   `NEXT_PUBLIC_BASE_URL` / `BASE_URL`: Defines the application's base URL.
*   `AUTH_COOKIE_SECURE`: Set to `true` if running behind HTTPS.

## Troubleshooting Notes

*   **High Costs/Quota Issues**: Ensure RTK Token Saver is enabled (it is by default) and consider using free providers (Kiro AI, OpenCode Free) or lower-cost tiers (GLM, MiniMax) as backups. Monitor usage in the control panel.
*   **Rate Limiting**: Configure model combinations with fallback tiers to ensure continuous operation.
*   **OAuth Token Expiry**: 9Router automatically refreshes tokens; if issues persist, try reconnecting the provider via the control panel.
*   **Port Conflicts**: If the control panel doesn't open, ensure `PORT` (default 20127) and `NEXT_PUBLIC_BASE_URL` are correctly set, especially in Docker (`PORT=20128`).
*   **No Request Logs**: Set `ENABLE_REQUEST_LOGS=true` in your `.env` file.
