import { buildNotImplementedMessage } from "@9router/ollama-compat";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST() {
  return Response.json(buildNotImplementedMessage("copy"), { status: 501, headers: CORS_HEADERS });
}
