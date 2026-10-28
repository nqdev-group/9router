import { chatCompletionTool } from "./chatCompletion.js";
import { listModelsTool } from "./listModels.js";
import { generateImageTool } from "./generateImage.js";
import { generateVideoTool } from "./generateVideo.js";
import { textToSpeechTool } from "./textToSpeech.js";
import { speechToTextTool } from "./speechToText.js";
import { createEmbeddingsTool } from "./createEmbeddings.js";
import { webSearchTool } from "./webSearch.js";
import { webFetchTool } from "./webFetch.js";
import { getUsageStatsTool } from "./getUsageStats.js";
import { checkProviderHealthTool } from "./checkProviderHealth.js";

export const TOOLS = [
  listModelsTool,
  chatCompletionTool,
  generateImageTool,
  generateVideoTool,
  textToSpeechTool,
  speechToTextTool,
  createEmbeddingsTool,
  webSearchTool,
  webFetchTool,
  getUsageStatsTool,
  checkProviderHealthTool,
];

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
