import { handleEmbeddings } from "@/sse/handlers/embeddings.js";
import { ollamaEmbedRequestToOpenAI, openAIEmbeddingJsonToOllama } from "@9router/ollama-compat";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * POST /api/v1/ollama/api/embed — thin adapter over the existing
 * `/v1/embeddings` (OpenAI-shape) handler; the two request/response shapes
 * are already structurally identical for the fields both sides understand.
 */
export async function POST(request) {
  let ollamaBody;
  try {
    ollamaBody = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const model = ollamaBody?.model || "unknown";
  const openaiBody = ollamaEmbedRequestToOpenAI(ollamaBody);

  const forwardedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(openaiBody),
  });

  const startedAtNs = process.hrtime.bigint();
  const response = await handleEmbeddings(forwardedRequest);

  if (!response.ok) {
    return new Response(response.body, {
      status: response.status,
      headers: { ...CORS_HEADERS, "Content-Type": response.headers.get("Content-Type") || "application/json" },
    });
  }

  const json = await response.json();
  return Response.json(openAIEmbeddingJsonToOllama(json, { model, startedAtNs }), { headers: CORS_HEADERS });
}
