import { buildModelsList } from "@/app/api/v1/models/route.js";
import { buildOllamaShowResponse } from "@9router/ollama-compat";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * POST /api/v1/ollama/api/show — looks the model up in the same live catalog
 * `/api/tags` uses, so `capabilities` reflects real data instead of a guess.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const modelId = body?.model;
  if (!modelId) {
    return Response.json({ error: "missing model" }, { status: 400, headers: CORS_HEADERS });
  }

  const models = await buildModelsList(["llm"]);
  const modelEntry = models.find((m) => m.id === modelId);
  if (!modelEntry) {
    return Response.json({ error: `model '${modelId}' not found` }, { status: 404, headers: CORS_HEADERS });
  }

  return Response.json(buildOllamaShowResponse(modelEntry), { headers: CORS_HEADERS });
}
