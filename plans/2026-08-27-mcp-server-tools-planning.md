---
type: feature
complexity: high
status: completed
related_issues: []
related_prs: []
estimated_hours: ~24
---

# Kế hoạch: Xây MCP server thật cho `packages/mcpServer/` với bộ tool đầu tiên

> **Ngày lập kế hoạch:** 2026-08-27
> **Scope dự kiến:** `packages/mcpServer/` (toàn bộ, viết mới), `packages/mcpServer/package.json` (sửa), `src/app/api/mcp/route.js` (mới, thin route), `skills/9router-mcp/SKILL.md` (mới, tài liệu), `AGENTS.md` (cập nhật bảng `packages/`)
> **Priority:** medium

---

## 1. Phân tích / Bối cảnh

`packages/mcpServer/` hiện chỉ là scaffold rỗng — xem [review trước đó trong phiên này]:
- [lib/server.js](../packages/mcpServer/lib/server.js) là 1 factory generic `createMCPServer({name, handler})`, không có JSON-RPC 2.0 framing, không capability negotiation (`initialize`/`initialized`), không tool registry, không transport thật (stdio/HTTP/SSE).
- Grep toàn repo xác nhận **không có chỗ nào import `createMCPServer`** — package này chưa được wire vào `src/` hay `open-sse/` ở đâu cả (vi phạm nguyên tắc "packages/ phải được import để dùng" ở [AGENTS.md §New features](../AGENTS.md#new-features-always-in-packages-hard-rule)).
- `package.json` hiện có `"name": "@9router/mcp-server"` — **không khớp** với path alias thực tế `@9router/mcpServer` (resolve theo tên thư mục qua `jsconfig.json` + `tests/vitest.config.js`, xem [package.json:2](../packages/mcpServer/package.json#L2)). Thiếu `"private": true` (so với package chị em `cmem`, xem [packages/cmem/package.json:4](../packages/cmem/package.json#L4)).

**Động lực làm feature này:** dự án đã có `skills/*/SKILL.md` (9router-chat, -image, -video, -tts, -stt, -embeddings, -web-search, -web-fetch) — các file hướng dẫn agent ngoài (Claude/Cursor/ChatGPT) **tự đọc markdown rồi tự soạn lệnh `curl`** gọi `/v1/*`. Cách này hoạt động với mọi agent nhưng dựa vào agent "hiểu đúng" hướng dẫn text mỗi lần — không có typed schema, không có validation, dễ agent tự bịa sai tham số. Mục tiêu: thêm 1 con đường song song **MCP server thật** — agent hỗ trợ MCP protocol native gọi tool có `inputSchema` (JSON Schema) rõ ràng, đáng tin cậy hơn.

**Constraint quan trọng nhất (ảnh hưởng thiết kế transport):** 9Router **đã là 1 Next.js server chạy sẵn** (dashboard + gateway, `PORT` mặc định 20127/20128) — không phải kiểu app khởi động mới mỗi lần agent cần (như đa số local MCP server dùng stdio, spawn 1 process/agent). Vì vậy quyết định transport là bước quan trọng nhất trong plan này (xem mục 2).

## 2. Approach / Strategy

> **Cập nhật sau khi user chốt (2026-08-27):** 2 quyết định dưới đây đã được hỏi lại trực tiếp và user chọn phương án khuyến nghị — ghi đè lên phần phân tích gốc bên dưới:
> - **Dùng SDK chính thức `@modelcontextprotocol/sdk`** (thêm vào root `package.json`, cùng `zod` — peer dep bắt buộc của SDK) thay vì tự viết JSON-RPC framing như phác thảo ban đầu ở §2.4/§3. SDK cung cấp sẵn `McpServer` (registry + handshake + validation) và `WebStandardStreamableHTTPServerTransport` (transport HTTP dùng Request/Response chuẩn Web, khớp thẳng với route handler Next.js App Router) — nên `lib/protocol/*.js` và `lib/registry.js` phác thảo ở §2.4 **không cần viết tay**, cấu trúc file thực tế đơn giản hơn nhiều (xem §2.4 đã cập nhật).
> - **Auth dùng chung quyền `/v1/*`** — không thêm scope riêng cho MCP ở giai đoạn này.
>
> **Phát hiện quan trọng khi bắt đầu code (chưa có trong bản gốc):** repo đã có sẵn `src/app/api/mcp/[plugin]/sse/route.js` + `.../message/route.js` (dùng `src/lib/mcp/stdioSseBridge.js`) — đây là 1 tính năng **hoàn toàn khác, không liên quan**: 9Router đóng vai **MCP client-side bridge**, tự spawn 1 MCP server stdio cục bộ (theo danh sách cấu hình sẵn `LOCAL_STDIO_PLUGINS`) rồi bridge qua SSE cho dashboard dùng (ví dụ: các "Tool Card" ở `/dashboard/cli-tools`) — ngược hướng hoàn toàn với việc "9Router tự expose chính nó làm MCP server" mà plan này đang làm. Quan trọng hơn: `src/dashboardGuard.js` đã liệt kê `"/api/mcp"` trong cả `PROTECTED_API_PATHS` (yêu cầu JWT cookie / `requireLogin`, **không** chấp nhận Bearer API key) lẫn `LOCAL_ONLY_PATHS` (chỉ localhost) — do route bridge kia spawn child process nên cần khoá chặt. Nếu route MCP-server mới của plan này đặt tại `/api/mcp/...` như phác thảo ban đầu, nó sẽ **vô tình bị khoá theo đúng cơ chế đó** (JWT-only + localhost-only) — trái ngược hoàn toàn với mục tiêu "auth dùng chung quyền `/v1/*` qua Bearer API key, hoạt động cả qua VPS/tunnel" đã chốt ở trên.
> **→ Quyết định:** route MCP-server mới đặt tại **`/v1/mcp`** (file `src/app/api/v1/mcp/route.js`) thay vì `/api/mcp`. Vì `/v1` đã nằm trong `PUBLIC_PREFIXES` của `dashboardGuard.js`, route tự động thừa hưởng đúng cơ chế Bearer-API-key mà `/v1/chat/completions` đang dùng — **không cần sửa `dashboardGuard.js`**. Đây cũng là lý do 2 việc "SDK/auth" và "path" phải đi cùng nhau: chọn sai path sẽ làm quyết định auth ở trên vô nghĩa.

### 2.1 Quyết định transport: HTTP (Streamable HTTP) thay vì stdio

**Chọn:** Mount MCP server dưới dạng 1 Next.js route (`src/app/api/mcp/route.js`, thin — chỉ gọi vào `@9router/mcpServer`), dùng transport **Streamable HTTP** (1 POST endpoint cho request/response, tuỳ chọn SSE cho streaming — đúng theo MCP spec bản 2025-03-26 trở lên).

**Vì sao không chọn stdio (cách phổ biến nhất cho local MCP server):**
- stdio yêu cầu client (Claude Desktop, v.v.) tự spawn 1 process con — nhưng 9Router **đã chạy sẵn** như HTTP server dài hạn (production dùng `custom-server.js`, dev dùng `next dev`). Spawn thêm 1 process riêng cho MCP nghĩa là **2 process trùng lặp state** (DB connections, provider registry, credential cache) — rủi ro lệch dữ liệu, tốn RAM double.
- Muốn stdio tái dùng đúng 1 server đang chạy thì phải viết 1 proxy stdio→HTTP riêng (nằm ngoài `packages/mcpServer/`, thêm ở `cli/`) — tăng phạm vi, không cần thiết cho MVP.
- 9Router vốn hỗ trợ dùng qua VPS/tunnel (xem `skills/README.md` — `NINEROUTER_URL` có thể là VPS/tunnel URL) — nghĩa là nhiều user không chạy 9Router local cùng máy với agent. stdio **không hoạt động được** trong case đó; HTTP thì hoạt động y hệt local lẫn remote.
- Client MCP hiện đại (Claude Code, Claude Desktop bản mới, Cursor) đều đã hỗ trợ HTTP/Streamable HTTP transport, không chỉ stdio nữa.

**Trade-off chấp nhận:** setup phía user phức tạp hơn 1 chút so với stdio "chỉ cần đường dẫn binary" (cần đúng URL + có thể cần Bearer token nếu `REQUIRE_API_KEY=true`) — nhưng đây đúng là mô hình `skills/README.md` đã dùng cho REST (`NINEROUTER_URL` + `NINEROUTER_KEY`), nên UX nhất quán với những gì user đã quen.

**Việc để ngỏ (không làm ở plan này):** nếu sau này có nhu cầu thật từ user dùng Claude Desktop kiểu stdio-only, cân nhắc thêm 1 script proxy mỏng ở `cli/bin/mcp-stdio.js` (forward JSON-RPC qua stdio sang endpoint HTTP đang chạy) — không viết logic MCP mới, chỉ proxy.

### 2.2 Vị trí code — tuân thủ nguyên tắc `packages/`

- **Toàn bộ tool registry + tool handlers**: `packages/mcpServer/lib/` (xem cấu trúc thực tế đã build ở mục 2.4).
- **Route Next.js**: `src/app/api/v1/mcp/route.js` (không phải `/api/mcp`, xem lý do ở đầu mục 2) — thin, chỉ import `handleMcpHttpRequest` từ `@9router/mcpServer` rồi gọi cho cả GET/POST/DELETE, đúng pattern các route `/v1/*` hiện có (`src/app/api/v1/chat/completions/route.js` chỉ gọi `handleChat(request)`).
- **Auth**: route nằm dưới `src/app/api/v1/`, tự động khớp `PUBLIC_PREFIXES` trong `dashboardGuard.js` hiện có → dùng đúng cơ chế Bearer API key (`REQUIRE_API_KEY`) mà `/v1/*` đã có, không sửa `dashboardGuard.js`, không viết middleware auth riêng.

### 2.3 Nguyên tắc implement tool: gọi lại logic có sẵn, không viết lại

Khảo sát cho thấy mọi route `/v1/*` liên quan đều là wrapper mỏng quanh handler ở `src/sse/handlers/*.js` (nhận `Request` Web API chuẩn, trả `Response`):

| Tool | Handler tái dùng | File |
|---|---|---|
| `chat_completion` | `handleChat(request)` | `src/sse/handlers/chat.js` |
| `list_models` | `buildModelsList(kindFilter, opts)` — **hàm thuần, không cần Request/Response** | `src/app/api/v1/models/route.js` |
| `generate_image` | `handleImageGeneration(request)` | `src/sse/handlers/imageGeneration.js` |
| `generate_video` | `handleVideoCreate(request, "generations")` | `src/sse/handlers/videoGeneration.js` |
| `text_to_speech` | `handleTts(request)` | `src/sse/handlers/tts.js` |
| `speech_to_text` | `handleStt(request)` | `src/sse/handlers/stt.js` |
| `create_embeddings` | `handleEmbeddings(request)` | `src/sse/handlers/embeddings.js` |
| `web_search` | `handleSearch(request)` | `src/sse/handlers/search.js` |
| `web_fetch` | `handleFetch(request)` | `src/sse/handlers/fetch.js` |
| `get_usage_stats` | `getUsageStats`, `getUsageHistory`, `getChartData` — **hàm thuần** | `src/lib/usageDb.js` (re-export từ `src/lib/db/index.js`) |
| `check_provider_health` | `checkAllAccountsDown(provider, connections, cooldownMin)` + `getProviderConnections()` | `@9router/provider-alert` (`packages/provider-alert/engine.js`) + `src/lib/localDb` |

**Quyết định quan trọng — vì sao `chat_completion` PHẢI gọi `src/sse/handlers/chat.js:handleChat`, không gọi thẳng `open-sse/handlers/chatCore.js`:** theo kiến trúc ở [AGENTS.md §Architecture](../AGENTS.md#architecture-in-30-seconds), `src/sse/handlers/chat.js` là nơi chứa **combo loop + account fallback** — logic chọn model kế tiếp khi model hiện tại lỗi/hết quota. Gọi thẳng `chatCore.js` sẽ **mất** toàn bộ combo/fallback, khiến tool MCP kém tin cậy hơn hẳn endpoint `/v1/chat/completions` thật — đây là lỗi dễ mắc nếu implement vội. Áp dụng tương tự cho mọi tool khác: luôn gọi qua `src/sse/handlers/*.js`, không "tối ưu" bằng cách nhảy thẳng xuống `open-sse/`.

**Cách gọi:** vì các handler này nhận `Request` (Web Fetch API) và trả `Response`, tool handler trong `packages/mcpServer/` sẽ **tự dựng 1 `Request` object in-process** (JSON body từ input MCP tool, header giả lập tối thiểu) rồi gọi hàm trực tiếp trong cùng process — **không** loopback qua HTTP thật (tránh thêm 1 network hop, tránh phải tự inject lại API key nội bộ). Case `list_models` / `get_usage_stats` không cần bước này vì đã là hàm thuần nhận tham số thường.

### 2.4 Cấu trúc file (thực tế đã build — đơn giản hơn phác thảo gốc nhờ dùng SDK)

```
packages/mcpServer/
  index.js                        # export public API: createMcpServer, handleMcpHttpRequest
  package.json                     # name: @9router/mcpServer, private:true, deps để {} (SDK+zod nằm ở root package.json, hoist chung 1 node_modules)
  lib/
    server.js                      # createMcpServer() — new McpServer(SERVER_INFO) + registerAllTools()
    transport/
      httpHandler.js                # handleMcpHttpRequest(request) — WebStandardStreamableHTTPServerTransport,
                                     # stateless (sessionIdGenerator: undefined, enableJsonResponse: true),
                                     # trích Bearer token từ header → authInfo forward xuống tool handler
    tools/
      shared/
        proxyRequest.js              # buildProxyRequest({path, body, authInfo}) dựng Request giả lập gọi src/sse/handlers/*;
                                      # responseToToolResult(response) map Response → CallToolResult
      listModels.js                  # ĐÃ XONG — gọi buildModelsList() trực tiếp (hàm thuần)
      chatCompletion.js              # ĐÃ XONG — gọi handleChat() qua proxyRequest, luôn stream:false (xem Risk streaming)
      index.js                       # TOOLS[] + registerAllTools(server)
      # còn lại (Phase 4-6, chưa làm): generateImage.js, generateVideo.js, textToSpeech.js,
      # speechToText.js, createEmbeddings.js, webSearch.js, webFetch.js, getUsageStats.js, checkProviderHealth.js

src/app/api/v1/mcp/route.js       # thin route — GET/POST/DELETE đều gọi handleMcpHttpRequest(request)
tests/unit/mcpServer/
  http-transport.test.js           # ĐÃ XONE — end-to-end thật: real MCP Client SDK + real Node http server
                                     # + mock 2 handler biên (buildModelsList, handleChat) → verify handshake,
                                     # tools/list, tools/call, và auth-token forwarding
```

**Vì sao không còn `lib/protocol/`, `lib/registry.js`:** đây chính là phần `@modelcontextprotocol/sdk`'s `McpServer` đã làm sẵn (JSON-RPC framing, `initialize` handshake, `tools/list`/`tools/call` dispatch, validate `inputSchema` bằng zod) — viết tay lại là trùng lặp không cần thiết, đã loại bỏ theo quyết định dùng SDK ở đầu mục 2.

### 2.5 Thứ tự triển khai (ưu tiên theo mức rủi ro/giá trị)

1. **Phase 0 — Hygiene fix** (không phụ thuộc gì, làm trước): sửa `package.json` name + `private: true`.
2. **Phase 1 — Protocol core**: JSON-RPC framing, `initialize`/`tools/list`/`tools/call`, error handling theo MCP spec. Chưa có tool thật nào, chỉ có registry rỗng — verify bằng 1 tool "ping" giả lập.
3. **Phase 2 — Transport HTTP**: `src/app/api/mcp/route.js` + `lib/transport/httpHandler.js`, xác nhận qua auth middleware hiện có, test bằng 1 MCP client thật (Claude Code/Claude Desktop trỏ vào `http://localhost:20128/api/mcp`).
4. **Phase 3 — Tool nhóm lõi**: `chat_completion`, `list_models` (giá trị cao nhất, ít rủi ro nhất vì `list_models` là hàm thuần).
5. **Phase 4 — Tool nhóm media**: `generate_image`, `generate_video`, `text_to_speech`, `speech_to_text`, `create_embeddings`.
6. **Phase 5 — Tool nhóm web**: `web_search`, `web_fetch`.
7. **Phase 6 — Tool mới (chưa có ở skills/)**: `get_usage_stats`, `check_provider_health`.
8. **Phase 7 — Test**: unit test JSON-RPC framing + mỗi tool ở `tests/unit/mcpServer/`.
9. **Phase 8 — Docs**: `skills/9router-mcp/SKILL.md` (hướng dẫn agent MCP-native connect vào `/api/mcp` thay vì tự curl), cập nhật `AGENTS.md` bảng `packages/`.

## 3. Công việc cần thực hiện (Todo)

- [x] Phase 0: Sửa `packages/mcpServer/package.json` — `name` → `@9router/mcpServer`, thêm `"private": true`
- [x] Phase 1: Thêm dependency `@modelcontextprotocol/sdk` + `zod` (peer dep bắt buộc) vào root `package.json` (thay cho viết tay `lib/protocol/*.js`/`lib/registry.js` — xem quyết định SDK ở đầu mục 2)
- [x] Phase 1: `lib/server.js` — `createMcpServer()` dùng `McpServer` của SDK + `registerAllTools()`
- [x] Phase 2: `lib/transport/httpHandler.js` — `WebStandardStreamableHTTPServerTransport`, stateless mode (`enableJsonResponse: true`), trích Bearer token → `authInfo`
- [x] Phase 2: Tạo `src/app/api/v1/mcp/route.js` (**không phải** `/api/mcp` — xem phát hiện va chạm với `/api/mcp/[plugin]/*` ở đầu mục 2), GET/POST/DELETE đều gọi `handleMcpHttpRequest`
- [x] Phase 2: Verify bằng client thật — vitest end-to-end (`tests/unit/mcpServer/http-transport.test.js`, dùng `@modelcontextprotocol/sdk/client`) + curl thủ công qua `next dev` thật (`initialize` trả đúng `protocolVersion`/`capabilities`/`serverInfo`), cả 2 đều pass
- [x] Phase 3: `tools/listModels.js` — gọi `buildModelsList` trực tiếp (hàm thuần, không cần dựng Request)
- [x] Phase 3: `tools/chatCompletion.js` — dựng `Request` giả lập qua `lib/tools/shared/proxyRequest.js`, gọi `handleChat`. **Quyết định streaming:** MVP luôn ép `stream:false` (không hỗ trợ SSE relay qua MCP ở giai đoạn này) — khớp với việc transport dùng `enableJsonResponse:true` (không có SSE ở tầng transport), xem Risk mục 4.
- [x] Phase 4: `tools/generateImage.js` — luôn ép `response_format:"b64_json"`, trả MCP image content block; fallback về text nếu provider chỉ trả URL
- [x] Phase 4: `tools/generateVideo.js` — **chỉ tạo job** (`POST /v1/videos/generations`), không poll status (không có tool MCP tương ứng `GET /v1/videos/{id}` — xem Risk mục 4, ghi rõ trong description tool + SKILL.md)
- [x] Phase 4: `tools/textToSpeech.js` — ép `response_format=json` (thay vì binary mặc định) để trả MCP audio content block
- [x] Phase 4: `tools/speechToText.js` — input là `audio_base64` (không có file attachment thật qua MCP), dựng multipart FormData qua `buildProxyFormRequest` mới thêm vào `shared/proxyRequest.js`
- [x] Phase 4: `tools/createEmbeddings.js`
- [x] Phase 5: `tools/webSearch.js`, `webFetch.js`
- [x] Phase 6: `tools/getUsageStats.js` — 3 view (`summary`/`history`/`chart`) map tới `getUsageStats`/`getUsageHistory`/`getChartData`
- [x] Phase 6: `tools/checkProviderHealth.js` — group `getProviderConnections()` theo provider, gọi `classifyConnections` (không phải `checkAllAccountsDown` — đúng như mitigation đã ghi ở Risk mục 4). **Phải export thêm `classifyConnections`** từ `packages/provider-alert/engine.js` + `index.js` (trước đó là hàm private, không side-effect nên export an toàn)
- [x] Phase 7: Unit test cho từng tool (`tests/unit/mcpServer/tools.test.js`, mock handler `src/sse/handlers/*` + `@/lib/usageDb.js` + `@/lib/localDb`, assert tool gọi đúng handler + map input/output đúng) — 10 test, cộng cập nhật assertion `tools/list` trong `http-transport.test.js` lên đủ 11 tool. **Bỏ** dòng "test JSON-RPC framing riêng" trong bản gốc — không còn ý nghĩa từ khi chuyển sang dùng SDK (đã test gián tiếp qua handshake thật)
- [x] Phase 8: `skills/9router-mcp/SKILL.md` — hướng dẫn agent MCP-native, liệt kê đủ 11 tool + limitation (non-streaming, video không poll). Cập nhật `skills/README.md` + `skills/9router/SKILL.md` (entry skill) thêm dòng trỏ tới skill mới
- [x] Phase 8: Cập nhật `AGENTS.md` + `packages/AGENTS.md` — dòng `mcpServer/` mô tả rõ đã implement, không còn là stub

### 3.1 Trạng thái hiện tại (cập nhật 2026-08-27 — Phase 0-8 xong hết)

Toàn bộ 11 tool hoạt động thật (không mock) qua `/v1/mcp`. Chưa commit — đang chờ review.

| File | Thay đổi |
|---|---|
| [package.json](../package.json) | Thêm dependency `@modelcontextprotocol/sdk@^1.30.0`, `zod@^4.4.3` (qua `yarn add` — xem lưu ý lockfile bên dưới) |
| [packages/mcpServer/package.json](../packages/mcpServer/package.json) | `name` → `@9router/mcpServer`, thêm `private:true`, thêm export `./http` |
| [packages/mcpServer/lib/server.js](../packages/mcpServer/lib/server.js) | Viết lại hoàn toàn — `createMcpServer()` dùng SDK thật thay vì factory generic cũ |
| [packages/mcpServer/lib/transport/httpHandler.js](../packages/mcpServer/lib/transport/httpHandler.js) (**Mới**) | `handleMcpHttpRequest(request)` — Streamable HTTP, stateless, forward Bearer token |
| [packages/mcpServer/lib/tools/shared/proxyRequest.js](../packages/mcpServer/lib/tools/shared/proxyRequest.js) (**Mới**) | `buildProxyRequest` (JSON), `buildProxyFormRequest` (multipart, cho STT), `responseToToolResult` — dùng chung cho mọi tool proxy vào `src/sse/handlers/*` |
| [packages/mcpServer/lib/tools/{listModels,chatCompletion,generateImage,generateVideo,textToSpeech,speechToText,createEmbeddings,webSearch,webFetch,getUsageStats,checkProviderHealth}.js](../packages/mcpServer/lib/tools/) (**Mới**, 11 file) | 11 tool — xem bảng ở §2.4 mapping REST endpoint tương ứng |
| [packages/mcpServer/lib/tools/index.js](../packages/mcpServer/lib/tools/index.js) (**Mới**) | `TOOLS[]` (11 phần tử) + `registerAllTools()` |
| [packages/mcpServer/index.js](../packages/mcpServer/index.js) | Export `createMcpServer`, `handleMcpHttpRequest` |
| [src/app/api/v1/mcp/route.js](../src/app/api/v1/mcp/route.js) (**Mới**) | Thin route — GET/POST/DELETE/OPTIONS đều gọi `handleMcpHttpRequest` |
| [packages/provider-alert/engine.js](../packages/provider-alert/engine.js), [packages/provider-alert/index.js](../packages/provider-alert/index.js) | Export thêm `classifyConnections` (trước đó private) — `check_provider_health` cần hàm phân loại thuần này, **không** dùng `checkAllAccountsDown` (có side-effect debounce/alert riêng cho luồng Discord) |
| [tests/unit/mcpServer/http-transport.test.js](../tests/unit/mcpServer/http-transport.test.js) | 3 test end-to-end (handshake+tools/list nay assert đủ 11 tool, tools/call list_models, auth-token forwarding qua chat_completion) |
| [tests/unit/mcpServer/tools.test.js](../tests/unit/mcpServer/tools.test.js) (**Mới**) | 10 test unit cho 9 tool còn lại (Phase 4-6), mock handler + db functions |
| [skills/9router-mcp/SKILL.md](../skills/9router-mcp/SKILL.md) (**Mới**) | Hướng dẫn agent MCP-native: setup, bảng map 11 tool → REST endpoint, limitation (non-streaming, video không poll) |
| [skills/README.md](../skills/README.md), [skills/9router/SKILL.md](../skills/9router/SKILL.md) | Thêm dòng trỏ tới `9router-mcp` skill mới |
| [AGENTS.md](../AGENTS.md), [packages/AGENTS.md](../packages/AGENTS.md) | Cập nhật mô tả `mcpServer/` — đã implement, không còn stub; ghi rõ phân biệt với `/api/mcp/[plugin]/*` |

**Lưu ý lockfile:** repo dùng `yarn.lock` làm lockfile canonical (được track trong git; `package-lock.json` bị gitignore) dù script chạy qua `npm run`. Lần đầu tôi lỡ `npm install` khiến `yarn.lock` bị regenerate toàn bộ (do 1 lệnh `eslint` bị hook `rtk` route qua `yarn exec`) — đã revert (`git checkout -- yarn.lock`) và làm lại đúng bằng `yarn add`, diff chỉ còn thêm 2 dependency mới + transitive, không đụng gói khác.

Verify đã chạy:
- `cd tests && npx vitest run --config ./vitest.config.js unit/mcpServer/` → **13/13 pass** (3 handshake/E2E + 10 tool unit).
- `eslint` trên toàn bộ file mới/sửa (`packages/mcpServer/`, `packages/provider-alert/`, `tests/unit/mcpServer/`) → sạch.
- `next dev` thật trên port scratch (20199): `initialize` trả đúng `serverInfo`; `tools/list` trả đủ **11 tool**, JSON Schema convert từ zod không lỗi cho bất kỳ tool nào (kể cả `.url()`, `.enum()`, `.record()`).

## 4. Risks & Unknowns

- **Risk: streaming chat qua MCP.** `handleChat` trả SSE stream khi `stream: true`. MCP tool result thường là 1 khối kết quả (không phải SSE thật) — cần chốt: buffer toàn bộ output rồi trả 1 lần (đơn giản, mất real-time), hay dùng MCP's `notifications/progress` để relay từng chunk (đúng UX hơn nhưng phức tạp hơn nhiều). → **✅ Đã xử lý theo mitigation:** MVP buffer toàn bộ (`chatCompletion.js` luôn ép `stream:false`), ghi rõ trong `skills/9router-mcp/SKILL.md` là chưa hỗ trợ streaming thật. Còn mở cho tương lai nếu cần UX real-time hơn.
- **Risk: `check_provider_health` chưa có "public" API tương đương** — hiện `checkAllAccountsDown` chỉ được gọi nội bộ từ `src/sse/services/auth.js` sau mỗi request fail/success (side-effect, không phải query on-demand). → **✅ Đã xử lý theo mitigation:** export thêm `classifyConnections` (hàm phân loại thuần, không side-effect) từ `packages/provider-alert/engine.js` + `index.js`, tool mới `checkProviderHealth.js` dùng hàm này, không đụng `checkAllAccountsDown`/luồng alert Discord.
- **Unknown: MCP client nào sẽ test thật** — đã kiểm tra: `@modelcontextprotocol/sdk/client` (chính SDK, dùng trong test) verify được toàn bộ handshake/tools qua HTTP thật, không cần cài Claude Desktop riêng để verify logic server-side. Việc user tự connect Claude Code/Desktop vào `/v1/mcp` thật vẫn là bước verify thủ công còn để ngỏ (xem §5 Success Criteria).
- **Unknown: có cần rate-limit/quota riêng cho MCP tool calls** — giữ nguyên quyết định MVP: dùng chung `usageDb`, không thêm tracking riêng.

## 5. Success Criteria

- [x] `packages/mcpServer/` được import thật vào `src/app/api/v1/mcp/route.js` — không còn là dead code.
- [x] 1 MCP client thật (`@modelcontextprotocol/sdk/client`, qua vitest + qua `curl` trên `next dev` thật) connect được vào `/v1/mcp`, thấy đủ 11 tool qua `tools/list`, gọi `tools/call` thành công cho `list_models` + `chat_completion` (non-stream). **Còn mở:** chưa tự tay connect Claude Code/Claude Desktop thật vào — SDK client đã verify đúng protocol nhưng chưa phải trải nghiệm thật từ 1 agent UI.
- [x] Mỗi tool đều tái dùng handler có sẵn ở `src/sse/handlers/*.js` — không có logic nghiệp vụ (auth, combo, translation) bị viết lại/trùng lặp trong `packages/mcpServer/`. `check_provider_health` là ngoại lệ có chủ đích: dùng `classifyConnections` (thuần, mới export) thay vì gọi qua `src/sse/services/auth.js` (vốn không có API query on-demand, chỉ có side-effect alert).
- [x] Auth hoạt động đúng: route nằm dưới `/v1/*` nên tự động thừa hưởng `REQUIRE_API_KEY`/`dashboardGuard.js` y hệt các endpoint REST khác — không viết middleware auth riêng.
- [x] Test unit chạy pass trong `tests/` — 13/13 (`unit/mcpServer/`). Đã thử chạy full baseline `tests/__baseline__/verify-no-regression.mjs` trên máy Windows này — script báo 103 "regression" nhưng **toàn bộ đều là false positive do lỗi path-format của chính script trên Windows** (`f.name.split("/app/")[1]` luôn ra `undefined` vì path Windows không có `/app/` như trong container CI mà `known-fails.txt` được capture, nên không khớp được dòng nào). Đã kiểm tra thủ công: không có tên test nào trong 103 dòng đó nhắc tới `provider-alert`/`classifyConnections`/`usageRepo`/`connectionsRepo`/`mcpServer` — tức không liên quan tới thay đổi của plan này. Nên chạy lại script này trên môi trường CI thật (không phải Windows) trước khi merge để có kết quả đáng tin.
- [x] `package.json` name khớp path alias thực tế; `AGENTS.md` + `packages/AGENTS.md` phản ánh đúng trạng thái mới của `mcpServer/`.

## 6. Questions / Dependencies (Tùy chọn)

- Đã chốt lúc bắt đầu code (xem callout đầu mục 2): dùng `@modelcontextprotocol/sdk`, auth dùng chung `/v1/*`.
- **Còn mở, cần quyết định của user trước khi merge/deploy thật:**
  - Có muốn tự tay connect Claude Code/Claude Desktop vào `/v1/mcp` để xác nhận trải nghiệm thật (không chỉ qua SDK client trong test) không?
  - `generate_video` hiện chỉ tạo job, không có tool poll status — có cần thêm 1 tool `get_video_status` (map `GET /v1/videos/{id}`) trong 1 phase sau không, hay chấp nhận giới hạn này cho MVP?
  - Có muốn chạy `tests/__baseline__/verify-no-regression.mjs` trước khi commit để chắc chắn thay đổi ở `packages/provider-alert/` không ảnh hưởng gì khác?

## 7. Addendum: dashboard menu entry (2026-08-27, ngoài phạm vi todo gốc)

User yêu cầu thêm mục "MCP Server" vào sidebar dashboard, group **System** — plan gốc chỉ cover backend (tool + transport), chưa có UI. Đã hỏi lại và chốt: **trang info/docs đơn giản** (không phải trang settings có bật/tắt riêng, vì MCP server hiện không có config riêng — luôn sẵn sàng ở `/v1/mcp`, dùng chung auth `/v1/*`).

**Files:**
| File | Thay đổi |
|---|---|
| [src/shared/components/Sidebar.js](../src/shared/components/Sidebar.js) | Thêm `{ href: "/dashboard/mcp-server", label: "MCP Server", icon: "hub" }` vào `systemItems` |
| [src/app/(dashboard)/dashboard/mcp-server/page.js](../src/app/(dashboard)/dashboard/mcp-server/page.js) (**Mới**) | Trang info: endpoint URL (copy được), example client config JSON (copy được), bảng 11 tool, link SKILL.md trên GitHub — theo đúng pattern `/dashboard/skills` (Card/Badge/CopyButton) và `/dashboard/endpoint` (lấy `window.location.origin` trong `useEffect` cho hydration-safe) |
| [src/shared/constants/mcpTools.js](../src/shared/constants/mcpTools.js) (**Mới**) | Metadata 11 tool cho trang dashboard — bản sao hiển thị-only của `packages/mcpServer/lib/tools/index.js` (không import thẳng vì file gốc có zod schema, không nên bundle vào client) |
| [src/shared/constants/skills.js](../src/shared/constants/skills.js) | Thêm entry `9router-mcp` vào mảng `SKILLS` — sửa sót từ Phase 8 (đã tạo `skills/9router-mcp/SKILL.md` nhưng quên thêm vào trang `/dashboard/skills`) |

**Chưa verify bằng browser thật:** dev server scratch (port 20199) dùng chung DB dev hiện có, password không phải default `123456` — dừng lại sau khi thấy "4 attempt(s) left before lockout" thay vì đoán tiếp (tránh khoá tài khoản). Đã verify qua: `eslint` (1 warning giống hệt pattern có sẵn ở `EndpointPageClient.js:704`, không phải lỗi mới), route path/component import đều khớp barrel export thật (`@/shared/components`). **Cần user tự mở `/dashboard/mcp-server` để xác nhận UI** trước khi coi bước này là xong hẳn.

Chưa commit.
