import { z } from "zod";
import { handleChat } from "@/sse/handlers/chat.js";
import { buildProxyRequest, responseToToolResult } from "./shared/proxyRequest.js";

// MVP transport is stateless Streamable HTTP with enableJsonResponse — there's no
// SSE relay back to the MCP client yet, so streaming is intentionally not exposed
// here. `stream` is always forced to false; chatCore still returns the full
// response body, just not incrementally. See plan §Risks (streaming chat qua MCP).
export const chatCompletionTool = {
  name: "chat_completion",
  title: "Chat completion",
  description:
    "Send an OpenAI-format chat completion request through 9Router's routing (combo fallback, multi-account fallback, format translation). Non-streaming only — the full response is returned in one result. Use list_models first to confirm the model id.",
  inputSchema: {
    model: z
      .string()
      .describe('Model id (e.g. "openai/gpt-4o") or a configured combo name. See list_models.'),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["system", "user", "assistant", "tool"]),
            content: z.union([z.string(), z.array(z.record(z.string(), z.any()))]),
          })
          .passthrough(),
      )
      .min(1)
      .describe("OpenAI-format chat messages array."),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    extra: z
      .record(z.string(), z.any())
      .optional()
      .describe("Any other OpenAI-compatible chat.completions fields (tools, tool_choice, response_format, top_p, ...) merged in as-is."),
  },
  async handler({ model, messages, temperature, max_tokens, extra }, { authInfo }) {
    const body = {
      ...(extra || {}),
      model,
      messages,
      stream: false,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
    };
    const request = buildProxyRequest({ path: "/v1/chat/completions", body, authInfo });
    const response = await handleChat(request);
    return responseToToolResult(response);
  },
};
