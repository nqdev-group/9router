// MCP tool metadata for /dashboard/mcp-server — display-only mirror of the
// tool catalog registered in packages/mcpServer/lib/tools/index.js. Keep the
// name/title/description in sync by hand when tools are added/changed there;
// this file exists so the dashboard page doesn't need to import zod schemas
// client-side.

export const MCP_ENDPOINT_PATH = "/v1/mcp";

export const MCP_TOOLS = [
  { name: "list_models", title: "List available models", restEndpoint: "GET /v1/models*", icon: "list_alt" },
  { name: "chat_completion", title: "Chat completion", restEndpoint: "POST /v1/chat/completions", icon: "chat" },
  { name: "generate_image", title: "Generate image", restEndpoint: "POST /v1/images/generations", icon: "image" },
  { name: "generate_video", title: "Generate video (async job)", restEndpoint: "POST /v1/videos/generations", icon: "movie" },
  { name: "text_to_speech", title: "Text to speech", restEndpoint: "POST /v1/audio/speech", icon: "record_voice_over" },
  { name: "speech_to_text", title: "Speech to text", restEndpoint: "POST /v1/audio/transcriptions", icon: "mic" },
  { name: "create_embeddings", title: "Create embeddings", restEndpoint: "POST /v1/embeddings", icon: "scatter_plot" },
  { name: "web_search", title: "Web search", restEndpoint: "POST /v1/search", icon: "search" },
  { name: "web_fetch", title: "Web fetch (URL → text)", restEndpoint: "POST /v1/web/fetch", icon: "language" },
  { name: "get_usage_stats", title: "Get usage stats", restEndpoint: "— (dashboard-only otherwise)", icon: "bar_chart" },
  { name: "check_provider_health", title: "Check provider account health", restEndpoint: "— (dashboard-only otherwise)", icon: "monitor_heart" },
];

export function buildMcpClientConfig(baseUrl, apiKey) {
  return {
    mcpServers: {
      "9router": {
        url: `${baseUrl}${MCP_ENDPOINT_PATH}`,
        ...(apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : {}),
      },
    },
  };
}
