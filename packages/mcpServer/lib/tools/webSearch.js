import { z } from "zod";
import { handleSearch } from "@/sse/handlers/search.js";
import { buildProxyRequest, responseToToolResult } from "./shared/proxyRequest.js";

export const webSearchTool = {
  name: "web_search",
  title: "Web search",
  description:
    "Search the web via 9Router. The provider IS the model here (no separate model field) — use list_models (kind: \"webSearch\") to find a valid provider id.",
  inputSchema: {
    provider: z.string().describe('Search provider id, e.g. "tavily". See list_models with kind:"webSearch".'),
    query: z.string().min(1).describe("Search query."),
    max_results: z.number().int().positive().optional(),
    search_type: z.string().optional(),
    country: z.string().optional(),
    language: z.string().optional(),
    time_range: z.string().optional(),
    extra: z.record(z.string(), z.any()).optional().describe("provider_options / content_options / other provider-specific fields."),
  },
  async handler({ provider, query, max_results, search_type, country, language, time_range, extra }, { authInfo }) {
    const body = {
      ...(extra || {}),
      provider,
      query,
      ...(max_results !== undefined ? { max_results } : {}),
      ...(search_type !== undefined ? { search_type } : {}),
      ...(country !== undefined ? { country } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(time_range !== undefined ? { time_range } : {}),
    };
    const request = buildProxyRequest({ path: "/v1/search", body, authInfo });
    const response = await handleSearch(request);
    return responseToToolResult(response);
  },
};
