import { handleMcpHttpRequest } from "@9router/mcpServer";

/**
 * /v1/mcp - 9Router's own capabilities exposed as an MCP (Model Context Protocol)
 * server (Streamable HTTP transport). Lives under /v1 so it inherits the same
 * Bearer-API-key gate as every other /v1/* endpoint (see dashboardGuard.js
 * PUBLIC_PREFIXES) — unrelated to /api/mcp/[plugin]/*, which is 9Router acting
 * as a client-side bridge for externally-spawned local MCP plugins (opposite
 * direction, JWT/localhost-gated).
 */
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(request) {
  return handleMcpHttpRequest(request);
}

export async function POST(request) {
  return handleMcpHttpRequest(request);
}

export async function DELETE(request) {
  return handleMcpHttpRequest(request);
}
