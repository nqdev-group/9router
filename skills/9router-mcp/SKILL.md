---
name: 9router-mcp
description: Connect to 9Router as a native MCP (Model Context Protocol) server over Streamable HTTP instead of hand-rolling curl calls from the other 9router-* skills. Use when the calling agent supports MCP tool calls directly (Claude Code, Claude Desktop, Cursor, etc.) and the user wants typed tool calls rather than reading a SKILL.md and constructing HTTP requests itself.
---

# 9Router — MCP server

9Router exposes its own capabilities as MCP tools over Streamable HTTP at `${NINEROUTER_URL}/v1/mcp` — an alternative to the curl-based `9router-*` skills for agents that speak MCP natively. Same server, same auth, same underlying routing (combo fallback, multi-account fallback) — just typed tool calls instead of hand-built HTTP requests.

## Setup

```bash
export NINEROUTER_URL="http://localhost:20128"      # or VPS / tunnel URL
export NINEROUTER_KEY="sk-..."                       # from Dashboard → Keys (only if requireApiKey=true)
```

Add an MCP server pointing at `${NINEROUTER_URL}/v1/mcp` (Streamable HTTP transport), with header `Authorization: Bearer ${NINEROUTER_KEY}` if auth is enabled. Example Claude Code / Claude Desktop config:

```json
{
  "mcpServers": {
    "9router": {
      "url": "http://localhost:20128/v1/mcp",
      "headers": { "Authorization": "Bearer sk-..." }
    }
  }
}
```

Not the same thing as `/api/mcp/[plugin]/*` in this repo — that endpoint is 9Router acting as an MCP *client* bridge for other locally-spawned MCP servers (dashboard-only, JWT/localhost-gated). This skill is the opposite direction: 9Router acting as the MCP *server*.

## Tools

| Tool | Maps to | Notes |
|---|---|---|
| `list_models` | `GET /v1/models*` | Filter by `kind` (llm, image, tts, stt, embedding, video, webSearch, webFetch). Call this before any other tool to confirm a model/provider id exists. |
| `chat_completion` | `POST /v1/chat/completions` | **Non-streaming only** — the full response comes back in one result, no incremental relay. |
| `generate_image` | `POST /v1/images/generations` | Returns an inline MCP image content block (base64). |
| `generate_video` | `POST /v1/videos/generations` | **Job creation only.** Returns job metadata (incl. request id), not the finished video — there is no MCP tool to poll job status yet. Treat as fire-and-forget. |
| `text_to_speech` | `POST /v1/audio/speech` | Returns an inline MCP audio content block (base64). |
| `speech_to_text` | `POST /v1/audio/transcriptions` | Audio must be passed as base64 (`audio_base64`) — MCP tool calls carry no file attachments. |
| `create_embeddings` | `POST /v1/embeddings` | |
| `web_search` | `POST /v1/search` | `provider` IS the model (no separate model field). |
| `web_fetch` | `POST /v1/web/fetch` | `provider` IS the model. SSRF-guarded server-side. |
| `get_usage_stats` | *(no REST equivalent)* | `view`: `"summary"` \| `"history"` \| `"chart"`. Dashboard-only data otherwise. |
| `check_provider_health` | *(no REST equivalent)* | Per-provider account status (available / temporarily rate-limited / permanently down). Dashboard-only data otherwise. |

## Known limitations (MVP)

- **No streaming** — the transport runs in stateless JSON-response mode. `chat_completion` always forces `stream:false` server-side.
- **No video status polling** — `generate_video` only submits the job.
- Every tool proxies through the same combo-loop/account-fallback/auth as the REST `/v1/*` endpoints — same error codes and retry semantics apply (401 → check `NINEROUTER_KEY`, 503 `All accounts unavailable` → wait or add another account, same as the `9router` entry skill's Errors section).

## When to use curl-based skills instead

If the calling agent doesn't support MCP tool calls (or you need streaming chat), fall back to the `9router-*` REST skills — see https://raw.githubusercontent.com/decolua/9router/refs/heads/master/skills/9router/SKILL.md
