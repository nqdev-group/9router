import { buildModelsList } from "@/app/api/v1/models/route.js";
import { buildOllamaTagsResponse } from "@9router/ollama-compat";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * GET /api/v1/ollama/api/tags — reuses the exact same live catalog
 * `/v1/models` uses (`buildModelsList`), so this reflects 9Router's real
 * models instead of the old static 2-model stub in
 * open-sse/config/ollamaModels.js.
 */
export async function GET(request) {
  const skipDynamicFetch = request.headers.get("x-9r-internal-models-fetch") === "1";
  const models = await buildModelsList(["llm"], { skipDynamicFetch });
  return Response.json(buildOllamaTagsResponse(models), { headers: CORS_HEADERS });
}
