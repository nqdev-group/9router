import { handleChat } from "@/sse/handlers/chat.js";
import {
  ollamaGenerateRequestToOpenAI,
  openAIChatJsonToOllamaGenerate,
  createOllamaGenerateStreamTransform,
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
 * POST /api/v1/ollama/api/generate — Ollama single-prompt completion. Built
 * as a 1-2 message chat request and routed through the same `handleChat`
 * pipeline as /api/chat (see packages/ollama-compat/requestTranslate.js for
 * the prompt/suffix/system → messages[] mapping and its documented limits).
 */
export async function POST(request) {
  let ollamaBody;
  try {
    ollamaBody = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const model = ollamaBody?.model || "unknown";
  const openaiBody = ollamaGenerateRequestToOpenAI(ollamaBody);
  const promptText = openaiBody.messages
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join(" ");

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
    const ollamaJson = openAIChatJsonToOllamaGenerate(json, { model, startedAtNs });
    return Response.json(ollamaJson, { headers: CORS_HEADERS });
  }

  if (!response.body) {
    return new Response("", { status: response.status, headers: { ...CORS_HEADERS, "Content-Type": "application/x-ndjson" } });
  }

  const transform = createOllamaGenerateStreamTransform({ model, startedAtNs, promptText });
  return new Response(response.body.pipeThrough(transform), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/x-ndjson" },
  });
}
