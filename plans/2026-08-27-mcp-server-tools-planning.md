---
type: feature
complexity: high
status: in_progress
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
- [ ] Phase 4: `tools/generateImage.js`, `generateVideo.js`, `textToSpeech.js`, `speechToText.js`, `createEmbeddings.js`
- [ ] Phase 5: `tools/webSearch.js`, `webFetch.js`
- [ ] Phase 6: `tools/getUsageStats.js` — wrap `getUsageStats`/`getUsageHistory`/`getChartData`, chốt tham số filter (range ngày, provider)
- [ ] Phase 6: `tools/checkProviderHealth.js` — load `getProviderConnections()`, group theo provider, gọi `checkAllAccountsDown` per provider, trả summary tổng hợp
- [ ] Phase 7: Unit test cho JSON-RPC framing (`tests/unit/mcpServer/protocol.test.js`)
- [ ] Phase 7: Unit test cho từng tool (mock handler `src/sse/handlers/*`, assert tool gọi đúng handler + map input/output đúng)
- [ ] Phase 8: `skills/9router-mcp/SKILL.md` — hướng dẫn agent MCP-native, cập nhật `skills/README.md` thêm dòng mới
- [ ] Phase 8: Cập nhật `AGENTS.md` — dòng `mcpServer/` trong bảng `packages/` mô tả rõ đã implement, không còn là stub

### 3.1 Trạng thái hiện tại (cập nhật 2026-08-27)

Phase 0-3 đã xong (2 tool đầu tiên hoạt động thật, không phải mock). Chưa commit — đang chờ review.

| File | Thay đổi |
|---|---|
| [package.json](../package.json) | Thêm dependency `@modelcontextprotocol/sdk@^1.30.0`, `zod@^4.4.3` |
| [packages/mcpServer/package.json](../packages/mcpServer/package.json) | `name` → `@9router/mcpServer`, thêm `private:true`, thêm export `./http` |
| [packages/mcpServer/lib/server.js](../packages/mcpServer/lib/server.js) | Viết lại hoàn toàn — `createMcpServer()` dùng SDK thật thay vì factory generic cũ |
| [packages/mcpServer/lib/transport/httpHandler.js](../packages/mcpServer/lib/transport/httpHandler.js) (**Mới**) | `handleMcpHttpRequest(request)` — Streamable HTTP, stateless, forward Bearer token |
| [packages/mcpServer/lib/tools/shared/proxyRequest.js](../packages/mcpServer/lib/tools/shared/proxyRequest.js) (**Mới**) | Helper dựng `Request` giả lập + map `Response` → `CallToolResult`, dùng chung cho mọi tool proxy vào `src/sse/handlers/*` |
| [packages/mcpServer/lib/tools/listModels.js](../packages/mcpServer/lib/tools/listModels.js) (**Mới**) | Tool `list_models` |
| [packages/mcpServer/lib/tools/chatCompletion.js](../packages/mcpServer/lib/tools/chatCompletion.js) (**Mới**) | Tool `chat_completion` (non-stream only) |
| [packages/mcpServer/lib/tools/index.js](../packages/mcpServer/lib/tools/index.js) (**Mới**) | `TOOLS[]` + `registerAllTools()` |
| [packages/mcpServer/index.js](../packages/mcpServer/index.js) | Export `createMcpServer`, `handleMcpHttpRequest` |
| [src/app/api/v1/mcp/route.js](../src/app/api/v1/mcp/route.js) (**Mới**) | Thin route — GET/POST/DELETE/OPTIONS đều gọi `handleMcpHttpRequest` |
| [tests/unit/mcpServer/http-transport.test.js](../tests/unit/mcpServer/http-transport.test.js) (**Mới**) | 3 test end-to-end (handshake+tools/list, tools/call list_models, auth-token forwarding qua chat_completion) — **PASS (3/3)** |

Verify đã chạy: `cd tests && npx vitest run --config ./vitest.config.js unit/mcpServer/http-transport.test.js` → pass. `eslint` trên toàn bộ file mới → sạch. `next dev` thật trên port scratch (20199) + `curl` `initialize` thật → trả đúng `{"result":{"protocolVersion":"2025-06-18",...,"serverInfo":{"name":"9router","version":"0.2.0"}}}`.

**Chưa làm** (theo đúng thứ tự phase còn lại — xem §3 phần todo Phase 4 trở đi chưa tick): tool nhóm media (Phase 4), tool nhóm web (Phase 5), 2 tool mới get_usage_stats/check_provider_health (Phase 6), test cho các tool đó (Phase 7 mới có 1 phần), docs `skills/9router-mcp/SKILL.md` + cập nhật `AGENTS.md` (Phase 8).

## 4. Risks & Unknowns

- **Risk: streaming chat qua MCP.** `handleChat` trả SSE stream khi `stream: true`. MCP tool result thường là 1 khối kết quả (không phải SSE thật) — cần chốt: buffer toàn bộ output rồi trả 1 lần (đơn giản, mất real-time), hay dùng MCP's `notifications/progress` để relay từng chunk (đúng UX hơn nhưng phức tạp hơn nhiều). → **Mitigation:** MVP buffer toàn bộ trước, ghi rõ trong SKILL.md là chưa hỗ trợ streaming thật, để phase sau nếu cần.
- **Risk: `check_provider_health` chưa có "public" API tương đương** — hiện `checkAllAccountsDown` chỉ được gọi nội bộ từ `src/sse/services/auth.js` sau mỗi request fail/success (side-effect, không phải query on-demand). Cần viết thêm 1 lớp "query hiện trạng" (đọc `getProviderConnections()` rồi classify) thay vì tái dùng y nguyên luồng alert. → **Mitigation:** tách riêng, không đụng vào luồng alert Discord hiện có (`src/sse/services/auth.js`), chỉ dùng chung hàm thuần `checkAllAccountsDown`/`classifyConnections` (nếu export được) để tránh trùng logic phân loại trạng thái account.
- **Unknown: MCP client nào sẽ test thật** (Claude Code hỗ trợ HTTP MCP server chưa, hay cần Claude Desktop) — cần xác nhận trước Phase 2 để biết cấu hình client mẫu đưa vào SKILL.md. → **Plan:** kiểm tra khi tới Phase 2, không block các phase trước.
- **Unknown: có cần rate-limit/quota riêng cho MCP tool calls** (khác với `/v1/*` đã có usage tracking) hay dùng chung `usageDb` luôn? → **Plan:** MVP dùng chung, không thêm tracking riêng; đánh giá lại nếu MCP traffic đáng kể.

## 5. Success Criteria

- `packages/mcpServer/` được import thật vào `src/app/api/mcp/route.js` — không còn là dead code (khác biệt lớn nhất so với hiện trạng).
- 1 MCP client thật (Claude Code hoặc Claude Desktop) connect được vào `/api/mcp`, thấy đủ 11 tool qua `tools/list`, gọi `tools/call` thành công cho ít nhất `list_models` + `chat_completion` (non-stream).
- Mỗi tool đều tái dùng handler có sẵn ở `src/sse/handlers/*.js` — không có logic nghiệp vụ (auth, combo, translation) bị viết lại/trùng lặp trong `packages/mcpServer/`.
- Auth hoạt động đúng: request không có API key bị từ chối khi `REQUIRE_API_KEY=true`, giống hệt `/v1/*`.
- Test unit chạy pass trong `tests/` (theo quy trình `tests/__baseline__/verify-no-regression.mjs`, không phá vỡ baseline hiện có).
- `package.json` name khớp path alias thực tế; `AGENTS.md` phản ánh đúng trạng thái mới của `mcpServer/`.

## 6. Questions / Dependencies (Tùy chọn)

- Cần xác nhận: có MCP client cụ thể nào để test thật ngay (Claude Code bản đang dùng có hỗ trợ HTTP MCP server transport không), hay cần cài thêm 1 client test riêng?
- Có cần hỗ trợ nhiều "API key scope" khác nhau cho MCP (ví dụ: 1 key chỉ được gọi `list_models`/`get_usage_stats`, không được `chat_completion` để tránh phát sinh chi phí ngoài ý muốn) hay dùng chung quyền với `/v1/*`? Nếu cần, đây là quyết định nghiệp vụ nên hỏi trước khi làm Phase 2 (ảnh hưởng thiết kế auth ở transport layer).
