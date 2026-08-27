import { chatCompletionTool } from "./chatCompletion.js";
import { listModelsTool } from "./listModels.js";

// Phase 3 (chat_completion, list_models) only — generateImage/generateVideo/
// textToSpeech/speechToText/createEmbeddings/webSearch/webFetch/getUsageStats/
// checkProviderHealth land in later phases, see plans/2026-08-27-mcp-server-tools-planning.md
export const TOOLS = [listModelsTool, chatCompletionTool];

/**
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 */
export function registerAllTools(server) {
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      tool.handler,
    );
  }
}
