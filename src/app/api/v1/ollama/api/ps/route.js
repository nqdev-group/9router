import { buildEmptyPsResponse } from "@9router/ollama-compat";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET() {
  return Response.json(buildEmptyPsResponse(), { headers: CORS_HEADERS });
}
