import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Stub the two handlers every tool proxies to — this test is about the MCP
// wiring (registration, transport, schema validation, auth-token forwarding),
// not about combo routing/model listing themselves (those have their own tests).
const buildModelsListMock = vi.fn(async (kindFilter) => [
  { id: "openai/gpt-4o", object: "model", owned_by: "openai" },
]);
vi.mock("@/app/api/v1/models/route.js", () => ({
  buildModelsList: (...args) => buildModelsListMock(...args),
}));

const handleChatMock = vi.fn(async (request) => {
  const body = await request.json();
  return Response.json({
    id: "chatcmpl-test",
    choices: [{ message: { role: "assistant", content: `echo:${body.messages[0].content}` } }],
  });
});
vi.mock("@/sse/handlers/chat.js", () => ({
  handleChat: (...args) => handleChatMock(...args),
}));

const { handleMcpHttpRequest } = await import("@9router/mcpServer");

// Bridges the Web Standard Request/Response our handler speaks to Node's http
// server so we can point a real MCP client at it over a loopback socket —
// exercises the exact handshake/framing a real agent would do, not a hand-rolled shim.
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const request = new Request(`http://127.0.0.1${req.url}`, {
        method: req.method,
        headers: req.headers,
        body,
      });
      const response = await handleMcpHttpRequest(request);
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(await response.text());
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

describe("mcpServer Streamable HTTP transport", () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    server = await startServer();
    baseUrl = `http://127.0.0.1:${server.address().port}/v1/mcp`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it("handshakes and lists the registered tools", async () => {
    const client = new Client({ name: "test-client", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["chat_completion", "list_models"]);

    await client.close();
  });

  it("calls list_models and returns buildModelsList's output", async () => {
    const client = new Client({ name: "test-client", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
    await client.connect(transport);

    const result = await client.callTool({ name: "list_models", arguments: { kind: "image" } });
    expect(buildModelsListMock).toHaveBeenCalledWith(["image"]);
    expect(result.content[0].text).toContain("openai/gpt-4o");

    await client.close();
  });

  it("forwards the bearer token from the HTTP request into the proxied /v1 request", async () => {
    const client = new Client({ name: "test-client", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
      requestInit: { headers: { Authorization: "Bearer sk-test-123" } },
    });
    await client.connect(transport);

    const result = await client.callTool({
      name: "chat_completion",
      arguments: { model: "openai/gpt-4o", messages: [{ role: "user", content: "hi" }] },
    });

    expect(handleChatMock).toHaveBeenCalledTimes(1);
    const forwardedRequest = handleChatMock.mock.calls[0][0];
    expect(forwardedRequest.headers.get("Authorization")).toBe("Bearer sk-test-123");
    expect(result.content[0].text).toContain("echo:hi");

    await client.close();
  });
});
