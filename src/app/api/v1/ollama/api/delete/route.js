import { buildNotImplementedMessage } from "@9router/ollama-compat";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

// Ollama spec uses DELETE (not POST) for /api/delete.
export async function DELETE() {
  return Response.json(buildNotImplementedMessage("delete"), { status: 501, headers: CORS_HEADERS });
}
