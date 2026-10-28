import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";

const SERVER_INFO = { name: "9router", version: "0.2.0" };

/**
 * Builds a 9Router MCP server instance with every tool registered.
 * Callers must `connect()` it to a transport (see lib/transport/httpHandler.js).
 * A fresh instance is expected per request in stateless HTTP mode — see httpHandler.js
 * for why (no cross-request state needed by any of the current tools).
 * @returns {McpServer}
 */
export function createMcpServer() {
  const server = new McpServer(SERVER_INFO);
  registerAllTools(server);
  return server;
}
