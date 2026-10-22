import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "../server.js";

/**
 * Handles one MCP Streamable HTTP request (GET/POST/DELETE) and returns a Web
 * Standard Response — designed to be called directly from a Next.js route handler.
 *
 * Stateless mode (sessionIdGenerator: undefined): a fresh McpServer + transport
 * is created per HTTP request instead of persisting a session across requests.
 * None of the current tools need server-initiated notifications or resumable
 * streams, so the extra session-management complexity isn't worth it yet — see
 * plans/2026-08-27-mcp-server-tools-planning.md §2.1 for the transport tradeoff.
 *
 * Auth: 9Router's existing dashboardGuard/REQUIRE_API_KEY middleware already
 * gates the /api/mcp route before this runs. The bearer token is additionally
 * forwarded here as MCP `authInfo` so tool handlers can pass the *same* token
 * through to the /v1/* handlers they proxy to (see lib/tools/shared/proxyRequest.js).
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function handleMcpHttpRequest(request) {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  const bearer = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const authInfo = bearer ? { token: bearer, clientId: "mcp-client", scopes: [] } : undefined;

  return transport.handleRequest(request, { authInfo });
}
