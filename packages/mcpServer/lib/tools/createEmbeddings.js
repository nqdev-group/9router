import { z } from "zod";
import { handleEmbeddings } from "@/sse/handlers/embeddings.js";
import { buildProxyRequest, responseToToolResult } from "./shared/proxyRequest.js";

export const createEmbeddingsTool = {
  name: "create_embeddings",
  title: "Create embeddings",
  description:
    "Create vector embeddings via 9Router (OpenAI-compatible /v1/embeddings). Use list_models (kind: \"embedding\") to find a valid model id first.",
  inputSchema: {
    model: z.string().describe('Embedding model id, e.g. "openai/text-embedding-3-small". See list_models with kind:"embedding".'),
    input: z
      .union([z.string(), z.array(z.string())])
      .describe("Text (or array of texts) to embed."),
  },
  async handler({ model, input }, { authInfo }) {
    const request = buildProxyRequest({ path: "/v1/embeddings", body: { model, input }, authInfo });
    const response = await handleEmbeddings(request);
    return responseToToolResult(response);
  },
};
