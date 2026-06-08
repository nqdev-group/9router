/**
 * Creates an MCP server instance
 * @param {Object} options
 * @param {string} options.name - Server name
 * @param {Function} options.handler - Request handler
 * @returns {Object} Server instance
 */
export function createMCPServer({ name, handler }) {
  if (!name || typeof name !== "string") {
    throw new Error("Server name is required");
  }
  if (typeof handler !== "function") {
    throw new Error("Handler function is required");
  }

  return {
    name,
    handler,
    async processRequest(request) {
      return handler(request);
    },
  };
}
