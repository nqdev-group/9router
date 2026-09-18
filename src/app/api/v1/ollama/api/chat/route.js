import { handleChat } from "@/sse/handlers/chat.js";
import {
  ollamaChatRequestToOpenAI,
  openAIChatJsonToOllama,
  createOllamaChatStreamTransform,
} from "@9router/ollama-compat";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

/**
 * POST /api/v1/ollama/api/chat — Ollama-compatible chat endpoint.
 *
 * Mount prefix `/api/v1/ollama` is intentional (see
 * plans/2026-09-10-ollama-api-swagger-planning.md §2.1): clients that point
 * their Ollama SDK/CLI base URL at `<host>/api/v1/ollama` and let it append
 * `/api/chat` itself land here unchanged — genuine drop-in compatibility, not
 * just a look-alike response shape.
 */
export async function POST(request) {
  let ollamaBody;
  try {
    ollamaBody = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const model = ollamaBody?.model || "unknown";
  const openaiBody = ollamaChatRequestToOpenAI(ollamaBody);
  const promptText = openaiBody.messages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ");

  // handleChat() reads the body itself via request.json() — build a fresh
  // Request carrying the translated OpenAI-shape body rather than mutating
  // the original (bodies are read-once).
  const forwardedRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(openaiBody),
  });

  const startedAtNs = process.hrtime.bigint();
  const response = await handleChat(forwardedRequest);

  if (!response.ok) {
    return new Response(response.body, {
      status: response.status,
      headers: { ...CORS_HEADERS, "Content-Type": response.headers.get("Content-Type") || "application/json" },
    });
  }

  if (!openaiBody.stream) {
    const json = await response.json();
    const ollamaJson = openAIChatJsonToOllama(json, { model, startedAtNs });
    return Response.json(ollamaJson, { headers: CORS_HEADERS });
  }

  if (!response.body) {
    return new Response("", { status: response.status, headers: { ...CORS_HEADERS, "Content-Type": "application/x-ndjson" } });
  }

  const transform = createOllamaChatStreamTransform({ model, startedAtNs, promptText });
  return new Response(response.body.pipeThrough(transform), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/x-ndjson" },
  });
}
