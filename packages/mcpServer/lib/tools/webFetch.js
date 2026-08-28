import { z } from "zod";
import { handleFetch } from "@/sse/handlers/fetch.js";
import { buildProxyRequest, responseToToolResult } from "./shared/proxyRequest.js";

export const webFetchTool = {
  name: "web_fetch",
  title: "Web fetch (URL → text)",
  description:
    "Fetch a URL and extract its content via 9Router. The provider IS the model here (no separate model field) — use list_models (kind: \"webFetch\") to find a valid provider id. Internal/private/metadata URLs are blocked server-side (SSRF guard).",
  inputSchema: {
    provider: z.string().describe('Fetch provider id, e.g. "tavily". See list_models with kind:"webFetch".'),
    url: z.string().url().describe("URL to fetch."),
    format: z.string().optional().describe('Output format, e.g. "markdown" (provider-dependent).'),
    max_characters: z.number().int().positive().optional(),
  },
  async handler({ provider, url, format, max_characters }, { authInfo }) {
    const body = {
      provider,
      url,
      ...(format !== undefined ? { format } : {}),
      ...(max_characters !== undefined ? { max_characters } : {}),
    };
    const request = buildProxyRequest({ path: "/v1/web/fetch", body, authInfo });
    const response = await handleFetch(request);
    return responseToToolResult(response);
  },
};
